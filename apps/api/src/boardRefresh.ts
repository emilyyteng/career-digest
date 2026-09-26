import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  blankBoardRefresh,
  snapshotFromDisk,
  type BoardRefreshLastRun,
  type BoardRefreshPhase,
  type BoardRefreshSnapshot,
} from "./boardRefreshState.js";
import { DailyCapError } from "./openaiRateLimit.js";
import { hasPendingRankBatch, runLiveRank } from "./rank.js";
import { recordRankBatchSuccess } from "./rankBatchStatus.js";
import { runDiscoverBoards } from "./discoverBoards.js";
import { runIngest } from "./ingest.js";
import { runScrape } from "./scrape.js";

export type { BoardRefreshLastRun, BoardRefreshPhase, BoardRefreshSnapshot };

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const STATE_PATH = path.join(root, "data/board-refresh.json");
const DEFAULT_BOARD_RANK_LIMIT = 40;

function boardRankLimit(): number {
  const n = Number(process.env.BOARD_RANK_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_BOARD_RANK_LIMIT;
}

let state = blankBoardRefresh();
let running: Promise<void> | null = null;

async function persist(): Promise<void> {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify(state)}\n`);
}

async function readDisk(): Promise<BoardRefreshSnapshot> {
  try {
    const raw = JSON.parse(await readFile(STATE_PATH, "utf8")) as Partial<BoardRefreshSnapshot>;
    const { snapshot, persistStaleRunning } = snapshotFromDisk(raw);
    if (persistStaleRunning) {
      state = snapshot;
      await persist();
    }
    return snapshot;
  } catch {
    return blankBoardRefresh();
  }
}

async function executeBoardRefresh(): Promise<void> {
  console.log("board refresh: discover boards starting");
  state = { ...state, phase: "discover" };
  await persist();
  const discovered = await runDiscoverBoards({ write: true, quiet: false });
  console.log(
    `board refresh: discover done (configured=${discovered.configuredCount}, new=${discovered.newBoards}, inserted=${discovered.inserted})`,
  );

  console.log("board refresh: ingest starting");
  state = { ...state, phase: "ingest" };
  await persist();
  const ingest = await runIngest();

  console.log("board refresh: scrape starting");
  state = { ...state, phase: "scrape" };
  await persist();
  await runScrape();

  let rankedProcessed = 0;
  if (await hasPendingRankBatch()) {
    console.log("board refresh: skipping light rank (batch ranking still in progress)");
  } else if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log("board refresh: skipping light rank (OPENAI_API_KEY not set)");
  } else {
    console.log("board refresh: light rank starting (unranked only)");
    state = { ...state, phase: "rank" };
    await persist();
    try {
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
      const result = await runLiveRank({ limit: boardRankLimit(), phase: "unranked" });
      rankedProcessed = result.ok;
      await recordRankBatchSuccess({
        model,
        appliedOk: result.ok,
        appliedError: result.error,
      });
    } catch (err) {
      if (err instanceof DailyCapError) {
        console.error(`board refresh: light rank stopped on daily cap — ${err.message}`);
      } else {
        throw err;
      }
    }
  }

  const finishedAt = new Date().toISOString();
  state = {
    status: "ok",
    phase: null,
    startedAt: state.startedAt,
    finishedAt,
    lastOkAt: finishedAt,
    error: null,
    lastRun: {
      leftBoard: ingest.leftBoardDeleted + ingest.leftBoardRetained,
      leftBoardDeleted: ingest.leftBoardDeleted,
      leftBoardRetained: ingest.leftBoardRetained,
      mergeDeduped: ingest.mergeDeduped,
      rankedProcessed,
    },
  };
  console.log("board refresh: done");
}

export async function getBoardRefresh(): Promise<BoardRefreshSnapshot> {
  if (running) return { ...state };
  state = await readDisk();
  return { ...state };
}

export async function startBoardRefresh(): Promise<{
  started: boolean;
  snapshot: BoardRefreshSnapshot;
}> {
  if (running) {
    return { started: false, snapshot: { ...state } };
  }

  state = await readDisk();
  if (state.status === "running") {
    return { started: false, snapshot: { ...state } };
  }

  state = {
    status: "running",
    phase: "discover",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastOkAt: state.lastOkAt,
    error: null,
    lastRun: state.lastRun,
  };
  await persist();

  running = (async () => {
    try {
      await executeBoardRefresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      state = {
        status: "error",
        phase: null,
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
        lastOkAt: state.lastOkAt,
        error: message,
        lastRun: state.lastRun,
      };
      console.error(`board refresh failed: ${message}`);
    } finally {
      running = null;
      await persist();
    }
  })();

  return { started: true, snapshot: { ...state } };
}

export async function waitForBoardRefresh(): Promise<BoardRefreshSnapshot> {
  if (running) await running;
  return getBoardRefresh();
}

const isMain =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  const { pool } = await import("./db.js");
  try {
    const { started, snapshot } = await startBoardRefresh();
    if (!started) {
      console.error(`Board refresh already running (started ${snapshot.startedAt}).`);
      process.exitCode = 1;
    } else {
      const done = await waitForBoardRefresh();
      if (done.status === "error") {
        console.error(done.error ?? "Board refresh failed");
        process.exitCode = 1;
      }
    }
  } finally {
    await pool.end();
  }
}
