import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { DailyCapError } from "./openaiRateLimit.js";
import { hasPendingRankBatch, runLiveRank } from "./rank.js";
import { recordRankBatchSuccess } from "./rankBatchStatus.js";
import { runIngest } from "./ingest.js";
import { runScrape } from "./scrape.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const STATE_PATH = path.join(root, "data/board-refresh.json");
const DEFAULT_BOARD_RANK_LIMIT = 40;

export type BoardRefreshPhase = "ingest" | "scrape" | "rank";

export type BoardRefreshSnapshot = {
  status: "idle" | "running" | "ok" | "error";
  phase: BoardRefreshPhase | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  error: string | null;
};

function blank(): BoardRefreshSnapshot {
  return {
    status: "idle",
    phase: null,
    startedAt: null,
    finishedAt: null,
    lastOkAt: null,
    error: null,
  };
}

function boardRankLimit(): number {
  const n = Number(process.env.BOARD_RANK_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_BOARD_RANK_LIMIT;
}

let state = blank();
let running: Promise<void> | null = null;
let loaded = false;

async function persist(): Promise<void> {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify(state)}\n`);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = JSON.parse(await readFile(STATE_PATH, "utf8")) as Partial<BoardRefreshSnapshot>;
    state = {
      status: raw.status === "running" ? "error" : raw.status === "ok" || raw.status === "error" ? raw.status : "idle",
      phase: null,
      startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
      finishedAt:
        raw.status === "running"
          ? new Date().toISOString()
          : typeof raw.finishedAt === "string"
            ? raw.finishedAt
            : null,
      lastOkAt: typeof raw.lastOkAt === "string" ? raw.lastOkAt : null,
      error:
        raw.status === "running"
          ? "Refresh interrupted by API restart"
          : typeof raw.error === "string"
            ? raw.error
            : null,
    };
    if (raw.status === "running") await persist();
  } catch {
    state = blank();
  }
}

async function executeBoardRefresh(): Promise<void> {
  console.log("board refresh: ingest starting");
  state = { ...state, phase: "ingest" };
  await persist();
  await runIngest();

  console.log("board refresh: scrape starting");
  state = { ...state, phase: "scrape" };
  await persist();
  await runScrape();

  if (await hasPendingRankBatch()) {
    console.log("board refresh: skipping light rank (batch ranking still in progress)");
  } else if (!process.env.OPENAI_API_KEY?.trim()) {
    console.log("board refresh: skipping light rank (OPENAI_API_KEY not set)");
  } else {
    console.log("board refresh: light rank starting");
    state = { ...state, phase: "rank" };
    await persist();
    try {
      const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
      const result = await runLiveRank({ limit: boardRankLimit() });
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
  };
  console.log("board refresh: done");
}

export async function getBoardRefresh(): Promise<BoardRefreshSnapshot> {
  await ensureLoaded();
  return { ...state };
}

export async function startBoardRefresh(): Promise<{
  started: boolean;
  snapshot: BoardRefreshSnapshot;
}> {
  await ensureLoaded();
  if (state.status === "running" || running) {
    return { started: false, snapshot: { ...state } };
  }

  state = {
    status: "running",
    phase: "ingest",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastOkAt: state.lastOkAt,
    error: null,
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
