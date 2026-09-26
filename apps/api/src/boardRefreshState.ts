export type BoardRefreshPhase = "discover" | "ingest" | "scrape" | "rank";

/** Summary of the most recent successful board refresh ingest phase. */
export type BoardRefreshLastRun = {
  leftBoard: number;
  leftBoardDeleted: number;
  leftBoardRetained: number;
  mergeDeduped: number;
  rankedProcessed: number;
};

export type BoardRefreshSnapshot = {
  status: "idle" | "running" | "ok" | "error";
  phase: BoardRefreshPhase | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  error: string | null;
  lastRun: BoardRefreshLastRun | null;
};

export const STALE_RUNNING_MS = 3 * 60 * 60 * 1000;
export const INTERRUPTED_REFRESH_MESSAGE = "Refresh interrupted by API restart";

export function blankBoardRefresh(): BoardRefreshSnapshot {
  return {
    status: "idle",
    phase: null,
    startedAt: null,
    finishedAt: null,
    lastOkAt: null,
    error: null,
    lastRun: null,
  };
}

export function parseLastRun(raw: unknown): BoardRefreshLastRun | null {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Partial<BoardRefreshLastRun>;
  const leftBoardDeleted = Number(row.leftBoardDeleted);
  const leftBoardRetained = Number(row.leftBoardRetained);
  const mergeDeduped = Number(row.mergeDeduped);
  const rankedProcessed = Number(row.rankedProcessed);
  if (
    !Number.isFinite(leftBoardDeleted) ||
    !Number.isFinite(leftBoardRetained) ||
    !Number.isFinite(mergeDeduped) ||
    !Number.isFinite(rankedProcessed)
  ) {
    return null;
  }
  const leftBoard =
    Number.isFinite(Number(row.leftBoard)) && row.leftBoard != null
      ? Number(row.leftBoard)
      : leftBoardDeleted + leftBoardRetained;
  return {
    leftBoard,
    leftBoardDeleted,
    leftBoardRetained,
    mergeDeduped,
    rankedProcessed,
  };
}

function parsePhase(raw: unknown): BoardRefreshPhase | null {
  if (raw === "discover" || raw === "ingest" || raw === "scrape" || raw === "rank") {
    return raw;
  }
  return null;
}

function parseStatus(
  raw: unknown,
): BoardRefreshSnapshot["status"] | null {
  if (raw === "idle" || raw === "running" || raw === "ok" || raw === "error") {
    return raw;
  }
  return null;
}

/** Interpret board-refresh.json. Cron writes this file from another process. */
export function snapshotFromDisk(
  raw: Partial<BoardRefreshSnapshot>,
  nowMs = Date.now(),
): { snapshot: BoardRefreshSnapshot; persistStaleRunning: boolean } {
  const startedAt = typeof raw.startedAt === "string" ? raw.startedAt : null;
  const startedMs = startedAt ? new Date(startedAt).getTime() : NaN;
  const diskStatus = parseStatus(raw.status);
  const runningOnDisk = diskStatus === "running";
  const ageMs = Number.isFinite(startedMs) ? nowMs - startedMs : Number.POSITIVE_INFINITY;
  const persistStaleRunning = runningOnDisk && ageMs > STALE_RUNNING_MS;

  if (persistStaleRunning) {
    return {
      persistStaleRunning: true,
      snapshot: {
        status: "error",
        phase: null,
        startedAt,
        finishedAt: new Date(nowMs).toISOString(),
        lastOkAt: typeof raw.lastOkAt === "string" ? raw.lastOkAt : null,
        error: INTERRUPTED_REFRESH_MESSAGE,
        lastRun: parseLastRun(raw.lastRun),
      },
    };
  }

  const status = diskStatus ?? "idle";
  return {
    persistStaleRunning: false,
    snapshot: {
      status,
      phase: status === "running" ? parsePhase(raw.phase) ?? "discover" : null,
      startedAt,
      finishedAt: typeof raw.finishedAt === "string" ? raw.finishedAt : null,
      lastOkAt: typeof raw.lastOkAt === "string" ? raw.lastOkAt : null,
      error: typeof raw.error === "string" ? raw.error : null,
      lastRun: parseLastRun(raw.lastRun),
    },
  };
}
