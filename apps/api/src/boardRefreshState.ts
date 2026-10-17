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
  /** Pid that owns the in-flight refresh (API server or `board-refresh` CLI). */
  runnerPid: number | null;
  /** Local civil date (YYYY-MM-DD) of the last automatic catch-up attempt. */
  catchUpOn: string | null;
};

export const STALE_RUNNING_MS = 3 * 60 * 60 * 1000;
/** Short-lived deaths (API/tsx restart on boot) do not consume the daily catch-up slot. */
export const CATCH_UP_CREDIT_AFTER_MS = 2 * 60 * 1000;
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
    runnerPid: null,
    catchUpOn: null,
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

function parseRunnerPid(raw: unknown): number | null {
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0) return null;
  return n;
}

function parseCatchUpOn(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  return /^\d{4}-\d{2}-\d{2}$/.test(raw) ? raw : null;
}

function interruptedSnapshot(
  raw: Partial<BoardRefreshSnapshot>,
  startedAt: string | null,
  nowMs: number,
): BoardRefreshSnapshot {
  const startedMs = startedAt ? new Date(startedAt).getTime() : NaN;
  const ranMs = Number.isFinite(startedMs) ? nowMs - startedMs : Number.POSITIVE_INFINITY;
  const priorCatchUp = parseCatchUpOn(raw.catchUpOn);
  // A catch-up killed almost immediately (typical tsx watch / API restart) should
  // remain eligible for another automatic attempt the same day.
  const catchUpOn =
    priorCatchUp != null && ranMs >= CATCH_UP_CREDIT_AFTER_MS ? priorCatchUp : null;
  return {
    status: "error",
    phase: null,
    startedAt,
    finishedAt: new Date(nowMs).toISOString(),
    lastOkAt: typeof raw.lastOkAt === "string" ? raw.lastOkAt : null,
    error: INTERRUPTED_REFRESH_MESSAGE,
    lastRun: parseLastRun(raw.lastRun),
    runnerPid: null,
    catchUpOn,
  };
}

export type DiskSnapshotResult = {
  snapshot: BoardRefreshSnapshot;
  /** Write the snapshot back — dead runner, stale age, or catch-up slot heal. */
  shouldPersist: boolean;
  /** True when we newly marked a running snapshot as interrupted. */
  markedInterrupted: boolean;
};

/** Interpret board-refresh.json. Cron writes this file from another process. */
export function snapshotFromDisk(
  raw: Partial<BoardRefreshSnapshot>,
  nowMs = Date.now(),
  processAlive: (pid: number) => boolean = () => false,
): DiskSnapshotResult {
  const startedAt = typeof raw.startedAt === "string" ? raw.startedAt : null;
  const startedMs = startedAt ? new Date(startedAt).getTime() : NaN;
  const diskStatus = parseStatus(raw.status);
  const runningOnDisk = diskStatus === "running";
  const ageMs = Number.isFinite(startedMs) ? nowMs - startedMs : Number.POSITIVE_INFINITY;
  const runnerPid = parseRunnerPid(raw.runnerPid);
  const runnerDead = runnerPid != null && !processAlive(runnerPid);
  const staleByAge = runningOnDisk && ageMs > STALE_RUNNING_MS;
  // Prefer a live pid over the age window so long cron/API runs stay "running".
  const runnerAlive = runnerPid != null && processAlive(runnerPid);
  const markInterrupted =
    runningOnDisk && (runnerDead || (staleByAge && !runnerAlive));

  if (markInterrupted) {
    return {
      shouldPersist: true,
      markedInterrupted: true,
      snapshot: interruptedSnapshot(raw, startedAt, nowMs),
    };
  }

  const status = diskStatus ?? "idle";
  const finishedAt = typeof raw.finishedAt === "string" ? raw.finishedAt : null;
  const error = typeof raw.error === "string" ? raw.error : null;
  let catchUpOn = parseCatchUpOn(raw.catchUpOn);
  // Self-heal short interrupted errors that still carry catchUpOn on disk.
  let healCatchUp = false;
  if (
    status === "error" &&
    error === INTERRUPTED_REFRESH_MESSAGE &&
    catchUpOn != null &&
    startedAt &&
    finishedAt
  ) {
    const ranMs = Date.parse(finishedAt) - Date.parse(startedAt);
    if (Number.isFinite(ranMs) && ranMs >= 0 && ranMs < CATCH_UP_CREDIT_AFTER_MS) {
      catchUpOn = null;
      healCatchUp = true;
    }
  }
  return {
    shouldPersist: healCatchUp,
    markedInterrupted: false,
    snapshot: {
      status,
      phase: status === "running" ? parsePhase(raw.phase) ?? "discover" : null,
      startedAt,
      finishedAt,
      lastOkAt: typeof raw.lastOkAt === "string" ? raw.lastOkAt : null,
      error,
      lastRun: parseLastRun(raw.lastRun),
      runnerPid: status === "running" ? runnerPid : null,
      catchUpOn,
    },
  };
}
