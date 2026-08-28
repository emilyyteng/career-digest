import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
export const BATCH_STATE_PATH = path.join(root, "data/rank-batch.json");
const STATUS_PATH = path.join(root, "data/rank-status.json");

export type BatchRequestCounts = {
  completed: number;
  failed: number;
  total: number;
};

export type BatchState = {
  batchId: string;
  model: string;
  phase: "waiting" | "applying" | "cancelling";
  openaiStatus: string | null;
  requestCounts: BatchRequestCounts | null;
  chunkIndex: number | null;
  chunkTotal: number | null;
  chunkSize: number | null;
  /** Posting ids submitted in this OpenAI batch (for live-retry after cancel). */
  postingIds: string[] | null;
  /** ISO time when completed+failed last advanced. */
  lastProgressAt: string | null;
  /** `${completed}/${failed}/${total}` snapshot for stall detection. */
  lastProgressKey: string | null;
  startedAt: string;
  updatedAt: string;
};

export type RankBatchSnapshot = {
  status: "idle" | "running" | "ready" | "ok" | "error";
  phase: "waiting" | "applying" | null;
  batchId: string | null;
  model: string | null;
  openaiStatus: string | null;
  completed: number | null;
  failed: number | null;
  total: number | null;
  chunkIndex: number | null;
  chunkTotal: number | null;
  chunkSize: number | null;
  startedAt: string | null;
  updatedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  appliedOk: number | null;
  appliedError: number | null;
  error: string | null;
  hint: string | null;
};

type FinishedStatus = {
  status: "ok" | "error";
  finishedAt: string;
  lastOkAt: string | null;
  appliedOk: number | null;
  appliedError: number | null;
  error: string | null;
  model: string | null;
};

const OPENAI_REFRESH_MS = 12_000;
/** How long since last CLI heartbeat before we treat the batch as orphaned. */
export const BATCH_ORPHAN_MS = 90_000;
let lastOpenAiRefresh = 0;

export function isBatchStateStale(updatedAt: string | null | undefined, now = Date.now()): boolean {
  if (!updatedAt) return true;
  const t = Date.parse(updatedAt);
  if (!Number.isFinite(t)) return true;
  return now - t >= BATCH_ORPHAN_MS;
}

function blank(): RankBatchSnapshot {
  return {
    status: "idle",
    phase: null,
    batchId: null,
    model: null,
    openaiStatus: null,
    completed: null,
    failed: null,
    total: null,
    chunkIndex: null,
    chunkTotal: null,
    chunkSize: null,
    startedAt: null,
    updatedAt: null,
    finishedAt: null,
    lastOkAt: null,
    appliedOk: null,
    appliedError: null,
    error: null,
    hint: null,
  };
}

function countsFrom(raw: unknown): BatchRequestCounts | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
  const completed = Number(row.completed);
  const failed = Number(row.failed);
  const total = Number(row.total);
  if (![completed, failed, total].every((n) => Number.isFinite(n))) return null;
  return { completed, failed, total };
}

export async function saveBatchState(state: BatchState): Promise<void> {
  await mkdir(path.dirname(BATCH_STATE_PATH), { recursive: true });
  await writeFile(BATCH_STATE_PATH, `${JSON.stringify(state)}\n`);
}

export async function loadBatchState(): Promise<BatchState | null> {
  try {
    const raw = JSON.parse(await readFile(BATCH_STATE_PATH, "utf8")) as Partial<BatchState> & {
      batchId?: string;
      model?: string;
    };
    if (!raw.batchId || !raw.model) return null;
    const phase =
      raw.phase === "applying" || raw.phase === "cancelling" ? raw.phase : "waiting";
    return {
      batchId: raw.batchId,
      model: raw.model,
      phase,
      openaiStatus: typeof raw.openaiStatus === "string" ? raw.openaiStatus : null,
      requestCounts: countsFrom(raw.requestCounts),
      chunkIndex: typeof raw.chunkIndex === "number" ? raw.chunkIndex : null,
      chunkTotal: typeof raw.chunkTotal === "number" ? raw.chunkTotal : null,
      chunkSize: typeof raw.chunkSize === "number" ? raw.chunkSize : null,
      postingIds: Array.isArray(raw.postingIds)
        ? raw.postingIds.filter((id): id is string => typeof id === "string")
        : null,
      lastProgressAt: typeof raw.lastProgressAt === "string" ? raw.lastProgressAt : null,
      lastProgressKey: typeof raw.lastProgressKey === "string" ? raw.lastProgressKey : null,
      startedAt:
        typeof raw.startedAt === "string" ? raw.startedAt : new Date().toISOString(),
      updatedAt:
        typeof raw.updatedAt === "string" ? raw.updatedAt : new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

export async function clearBatchState(): Promise<void> {
  await unlink(BATCH_STATE_PATH).catch(() => undefined);
}

export async function hasPendingRankBatch(): Promise<boolean> {
  return (await loadBatchState()) != null;
}

async function loadFinished(): Promise<FinishedStatus | null> {
  try {
    const raw = JSON.parse(await readFile(STATUS_PATH, "utf8")) as Partial<FinishedStatus>;
    if (raw.status !== "ok" && raw.status !== "error") return null;
    return {
      status: raw.status,
      finishedAt: typeof raw.finishedAt === "string" ? raw.finishedAt : new Date().toISOString(),
      lastOkAt: typeof raw.lastOkAt === "string" ? raw.lastOkAt : null,
      appliedOk: typeof raw.appliedOk === "number" ? raw.appliedOk : null,
      appliedError: typeof raw.appliedError === "number" ? raw.appliedError : null,
      error: typeof raw.error === "string" ? raw.error : null,
      model: typeof raw.model === "string" ? raw.model : null,
    };
  } catch {
    return null;
  }
}

async function saveFinished(status: FinishedStatus): Promise<void> {
  await mkdir(path.dirname(STATUS_PATH), { recursive: true });
  await writeFile(STATUS_PATH, `${JSON.stringify(status)}\n`);
}

export async function recordRankBatchSuccess(opts: {
  model: string;
  appliedOk: number;
  appliedError: number;
}): Promise<void> {
  const finishedAt = new Date().toISOString();
  await saveFinished({
    status: "ok",
    finishedAt,
    lastOkAt: finishedAt,
    appliedOk: opts.appliedOk,
    appliedError: opts.appliedError,
    error: null,
    model: opts.model,
  });
}

export async function recordRankBatchError(
  message: string,
  model?: string | null,
): Promise<void> {
  const finishedAt = new Date().toISOString();
  const prior = await loadFinished();
  await saveFinished({
    status: "error",
    finishedAt,
    lastOkAt: prior?.lastOkAt ?? null,
    appliedOk: null,
    appliedError: null,
    error: message,
    model: model ?? prior?.model ?? null,
  });
}

export async function patchBatchProgress(
  patch: Partial<Omit<BatchState, "batchId" | "model" | "startedAt">> & {
    batchId?: string;
    model?: string;
    startedAt?: string;
  },
): Promise<BatchState | null> {
  const current = await loadBatchState();
  if (!current && !(patch.batchId && patch.model)) return null;
  const next: BatchState = {
    batchId: patch.batchId ?? current!.batchId,
    model: patch.model ?? current!.model,
    phase: patch.phase ?? current?.phase ?? "waiting",
    openaiStatus:
      patch.openaiStatus !== undefined ? patch.openaiStatus : (current?.openaiStatus ?? null),
    requestCounts:
      patch.requestCounts !== undefined ? patch.requestCounts : (current?.requestCounts ?? null),
    chunkIndex: patch.chunkIndex !== undefined ? patch.chunkIndex : (current?.chunkIndex ?? null),
    chunkTotal: patch.chunkTotal !== undefined ? patch.chunkTotal : (current?.chunkTotal ?? null),
    chunkSize: patch.chunkSize !== undefined ? patch.chunkSize : (current?.chunkSize ?? null),
    postingIds:
      patch.postingIds !== undefined ? patch.postingIds : (current?.postingIds ?? null),
    lastProgressAt:
      patch.lastProgressAt !== undefined
        ? patch.lastProgressAt
        : (current?.lastProgressAt ?? null),
    lastProgressKey:
      patch.lastProgressKey !== undefined
        ? patch.lastProgressKey
        : (current?.lastProgressKey ?? null),
    startedAt: patch.startedAt ?? current?.startedAt ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  await saveBatchState(next);
  return next;
}

function snapshotFromPending(state: BatchState): RankBatchSnapshot {
  const openai = state.openaiStatus;
  const counts = state.requestCounts;
  const done = counts != null ? counts.completed + counts.failed : null;
  const progress = counts != null && counts.total > 0 ? `${done}/${counts.total}` : null;
  const chunk =
    state.chunkIndex != null && state.chunkTotal != null
      ? `chunk ${state.chunkIndex}/${state.chunkTotal}`
      : null;

  if (state.phase === "cancelling" || openai === "cancelling") {
    return {
      ...blank(),
      status: "running",
      phase: "waiting",
      batchId: state.batchId,
      model: state.model,
      openaiStatus: openai ?? "cancelling",
      completed: counts?.completed ?? null,
      failed: counts?.failed ?? null,
      total: counts?.total ?? null,
      chunkIndex: state.chunkIndex,
      chunkTotal: state.chunkTotal,
      chunkSize: state.chunkSize,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      hint: progress
        ? `Cancelling stalled batch (${progress}) — will apply finished scores, then live-retry leftovers…`
        : "Cancelling stalled batch — will apply finished scores, then live-retry leftovers…",
    };
  }

  if (state.phase === "applying") {
    return {
      ...blank(),
      status: "running",
      phase: "applying",
      batchId: state.batchId,
      model: state.model,
      openaiStatus: openai,
      completed: counts?.completed ?? null,
      failed: counts?.failed ?? null,
      total: counts?.total ?? null,
      chunkIndex: state.chunkIndex,
      chunkTotal: state.chunkTotal,
      chunkSize: state.chunkSize,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      hint: chunk
        ? `Applying scores to the database (${chunk}${progress ? `, ${progress}` : ""})…`
        : "Applying scores to the database…",
    };
  }

  if (openai === "completed") {
    const stale = isBatchStateStale(state.updatedAt);
    return {
      ...blank(),
      status: stale ? "ready" : "running",
      phase: "waiting",
      batchId: state.batchId,
      model: state.model,
      openaiStatus: openai,
      completed: counts?.completed ?? null,
      failed: counts?.failed ?? null,
      total: counts?.total ?? null,
      chunkIndex: state.chunkIndex,
      chunkTotal: state.chunkTotal,
      chunkSize: state.chunkSize,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      hint: stale
        ? "Batch finished on OpenAI — auto-applying scores to the database…"
        : "Batch finished on OpenAI — applying scores to the database…",
    };
  }

  if (openai === "failed" || openai === "expired" || openai === "cancelled") {
    const hasProgress = (counts?.completed ?? 0) > 0 || (counts?.failed ?? 0) > 0;
    const stale = isBatchStateStale(state.updatedAt);
    return {
      ...blank(),
      status: hasProgress && !stale ? "running" : "error",
      phase: "waiting",
      batchId: state.batchId,
      model: state.model,
      openaiStatus: openai,
      completed: counts?.completed ?? null,
      failed: counts?.failed ?? null,
      total: counts?.total ?? null,
      chunkIndex: state.chunkIndex,
      chunkTotal: state.chunkTotal,
      chunkSize: state.chunkSize,
      startedAt: state.startedAt,
      updatedAt: state.updatedAt,
      error: hasProgress ? null : `OpenAI batch ${openai}`,
      hint: hasProgress
        ? stale
          ? `Batch ${openai} — auto-applying finished scores…`
          : `Batch ${openai} — applying finished scores…`
        : "Batch did not complete. Check the terminal or re-run npm run rank.",
    };
  }

  const parts = [
    chunk,
    progress ? `${progress} requests` : null,
    openai ? openai.replace(/_/g, " ") : "waiting on OpenAI",
  ].filter(Boolean);

  return {
    ...blank(),
    status: "running",
    phase: "waiting",
    batchId: state.batchId,
    model: state.model,
    openaiStatus: openai,
    completed: counts?.completed ?? null,
    failed: counts?.failed ?? null,
    total: counts?.total ?? null,
    chunkIndex: state.chunkIndex,
    chunkTotal: state.chunkTotal,
    chunkSize: state.chunkSize,
    startedAt: state.startedAt,
    updatedAt: state.updatedAt,
    hint: parts.length ? `Ranking batch — ${parts.join(" · ")}` : "Ranking batch in progress…",
  };
}

async function refreshFromOpenAi(state: BatchState): Promise<BatchState> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return state;
  const now = Date.now();
  if (now - lastOpenAiRefresh < OPENAI_REFRESH_MS) return state;
  lastOpenAiRefresh = now;
  try {
    const client = new OpenAI({ apiKey });
    const batch = await client.batches.retrieve(state.batchId);
    const counts = batch.request_counts
      ? {
          completed: batch.request_counts.completed ?? 0,
          failed: batch.request_counts.failed ?? 0,
          total: batch.request_counts.total ?? 0,
        }
      : null;
    const next = await patchBatchProgress({
      openaiStatus: batch.status,
      requestCounts: counts,
    });
    return next ?? state;
  } catch {
    return state;
  }
}

export async function getRankBatchStatus(): Promise<RankBatchSnapshot> {
  let pending = await loadBatchState();
  if (pending) {
    if (pending.phase !== "applying") {
      pending = await refreshFromOpenAi(pending);
    }
    return snapshotFromPending(pending);
  }

  const finished = await loadFinished();
  if (!finished) return blank();

  if (finished.status === "ok") {
    return {
      ...blank(),
      status: "ok",
      model: finished.model,
      finishedAt: finished.finishedAt,
      lastOkAt: finished.lastOkAt,
      appliedOk: finished.appliedOk,
      appliedError: finished.appliedError,
      hint:
        finished.appliedOk != null
          ? `Last ranking finished — applied ${finished.appliedOk} score${finished.appliedOk === 1 ? "" : "s"}${
              finished.appliedError ? `, ${finished.appliedError} failed` : ""
            }.`
          : "Last ranking finished.",
    };
  }

  return {
    ...blank(),
    status: "error",
    model: finished.model,
    finishedAt: finished.finishedAt,
    lastOkAt: finished.lastOkAt,
    error: finished.error,
    hint: finished.error
      ? `Ranking stopped — ${finished.error}`
      : "Ranking stopped with an error.",
  };
}
