import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runLiveRankBacklog } from "./rank.js";
import { recordRankBatchSuccess } from "./rankBatchStatus.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const STATE_PATH = path.join(root, "data/live-rank-backlog.json");

export type LiveRankBacklogSnapshot = {
  status: "idle" | "running" | "ok" | "error";
  startedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  error: string | null;
  rankedOk: number | null;
  rankedError: number | null;
  halted: boolean | null;
};

function blank(): LiveRankBacklogSnapshot {
  return {
    status: "idle",
    startedAt: null,
    finishedAt: null,
    lastOkAt: null,
    error: null,
    rankedOk: null,
    rankedError: null,
    halted: null,
  };
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
    const raw = JSON.parse(await readFile(STATE_PATH, "utf8")) as Partial<LiveRankBacklogSnapshot>;
    state = {
      status:
        raw.status === "running"
          ? "error"
          : raw.status === "ok" || raw.status === "error"
            ? raw.status
            : "idle",
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
          ? "Live rank backlog interrupted by API restart"
          : typeof raw.error === "string"
            ? raw.error
            : null,
      rankedOk: typeof raw.rankedOk === "number" ? raw.rankedOk : null,
      rankedError: typeof raw.rankedError === "number" ? raw.rankedError : null,
      halted: typeof raw.halted === "boolean" ? raw.halted : null,
    };
    if (raw.status === "running") await persist();
  } catch {
    state = blank();
  }
}

async function executeLiveRankBacklog(): Promise<void> {
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const result = await runLiveRankBacklog();
  await recordRankBatchSuccess({
    model,
    appliedOk: result.ok,
    appliedError: result.error,
  });
  const finishedAt = new Date().toISOString();
  state = {
    status: "ok",
    startedAt: state.startedAt,
    finishedAt,
    lastOkAt: finishedAt,
    error: null,
    rankedOk: result.ok,
    rankedError: result.error,
    halted: result.halted,
  };
}

export async function getLiveRankBacklogJob(): Promise<LiveRankBacklogSnapshot> {
  await ensureLoaded();
  return { ...state };
}

export async function startLiveRankBacklogJob(): Promise<{
  started: boolean;
  snapshot: LiveRankBacklogSnapshot;
}> {
  await ensureLoaded();
  if (state.status === "running" || running) {
    return { started: false, snapshot: { ...state } };
  }

  state = {
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastOkAt: state.lastOkAt,
    error: null,
    rankedOk: null,
    rankedError: null,
    halted: null,
  };
  await persist();

  running = (async () => {
    try {
      await executeLiveRankBacklog();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      state = {
        status: "error",
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
        lastOkAt: state.lastOkAt,
        error: message,
        rankedOk: null,
        rankedError: null,
        halted: null,
      };
      console.error(`live rank backlog failed: ${message}`);
    } finally {
      running = null;
      await persist();
    }
  })();

  return { started: true, snapshot: { ...state } };
}
