import { describe, expect, it } from "vitest";
import {
  CATCH_UP_CREDIT_AFTER_MS,
  INTERRUPTED_REFRESH_MESSAGE,
  STALE_RUNNING_MS,
  parseLastRun,
  snapshotFromDisk,
} from "./boardRefreshState.js";
import { shouldCatchUpInterruptedBoardRefresh } from "./dailyBoardSchedule.js";

describe("board refresh lastRun parsing", () => {
  it("parses ingest summary fields", () => {
    expect(
      parseLastRun({
        leftBoard: 96,
        leftBoardDeleted: 95,
        leftBoardRetained: 1,
        mergeDeduped: 54,
        rankedProcessed: 40,
      }),
    ).toEqual({
      leftBoard: 96,
      leftBoardDeleted: 95,
      leftBoardRetained: 1,
      mergeDeduped: 54,
      rankedProcessed: 40,
    });
  });

  it("derives leftBoard from deleted + retained when omitted", () => {
    expect(
      parseLastRun({
        leftBoardDeleted: 10,
        leftBoardRetained: 2,
        mergeDeduped: 0,
        rankedProcessed: 5,
      }),
    ).toMatchObject({ leftBoard: 12 });
  });
});

describe("board refresh disk snapshot", () => {
  const lastRun = {
    leftBoard: 8,
    leftBoardDeleted: 8,
    leftBoardRetained: 0,
    mergeDeduped: 82,
    rankedProcessed: 40,
  };

  it("returns a completed cron run as-is so Status is not stuck on the previous file", () => {
    const { snapshot, shouldPersist } = snapshotFromDisk({
      status: "ok",
      phase: null,
      startedAt: "2026-09-09T00:02:09.486Z",
      finishedAt: "2026-09-09T00:08:40.406Z",
      lastOkAt: "2026-09-09T00:08:40.406Z",
      error: null,
      lastRun,
    });
    expect(shouldPersist).toBe(false);
    expect(snapshot).toMatchObject({
      status: "ok",
      lastOkAt: "2026-09-09T00:08:40.406Z",
      lastRun,
    });
  });

  it("keeps an in-progress cron run as running with phase when the runner pid is alive", () => {
    const now = Date.parse("2026-09-08T00:03:00.000Z");
    const { snapshot, shouldPersist } = snapshotFromDisk(
      {
        status: "running",
        phase: "ingest",
        startedAt: "2026-09-08T00:00:09.110Z",
        finishedAt: null,
        lastOkAt: "2026-09-07T01:12:49.654Z",
        lastRun: { ...lastRun, rankedProcessed: 0 },
        runnerPid: 4242,
      },
      now,
      (pid) => pid === 4242,
    );
    expect(shouldPersist).toBe(false);
    expect(snapshot.status).toBe("running");
    expect(snapshot.phase).toBe("ingest");
    expect(snapshot.runnerPid).toBe(4242);
    expect(snapshot.error).toBeNull();
  });

  it("marks a running snapshot with a dead runner pid as interrupted", () => {
    const now = Date.parse("2026-09-08T00:03:00.000Z");
    const { snapshot, shouldPersist } = snapshotFromDisk(
      {
        status: "running",
        phase: "ingest",
        startedAt: "2026-09-08T00:00:09.110Z",
        finishedAt: null,
        lastOkAt: "2026-09-07T01:12:49.654Z",
        lastRun,
        runnerPid: 99,
        catchUpOn: "2026-09-08",
      },
      now,
      () => false,
    );
    expect(shouldPersist).toBe(true);
    expect(snapshot.status).toBe("error");
    expect(snapshot.error).toBe(INTERRUPTED_REFRESH_MESSAGE);
    expect(snapshot.runnerPid).toBeNull();
    expect(snapshot.lastRun).toEqual(lastRun);
    // Ran ~3 minutes → catch-up slot consumed.
    expect(snapshot.catchUpOn).toBe("2026-09-08");
  });

  it("does not consume the catch-up slot when the runner dies within the credit window", () => {
    const startedAt = "2026-09-08T00:00:00.000Z";
    const now = Date.parse(startedAt) + CATCH_UP_CREDIT_AFTER_MS - 1;
    const { snapshot, shouldPersist, markedInterrupted } = snapshotFromDisk(
      {
        status: "running",
        phase: "discover",
        startedAt,
        finishedAt: null,
        lastOkAt: "2026-09-07T01:12:49.654Z",
        lastRun,
        runnerPid: 99,
        catchUpOn: "2026-09-08",
      },
      now,
      () => false,
    );
    expect(shouldPersist).toBe(true);
    expect(markedInterrupted).toBe(true);
    expect(snapshot.status).toBe("error");
    expect(snapshot.catchUpOn).toBeNull();
  });

  it("clears a burned catch-up slot on a short interrupted error snapshot", () => {
    const { snapshot, shouldPersist, markedInterrupted } = snapshotFromDisk({
      status: "error",
      phase: null,
      startedAt: "2026-09-08T00:00:00.000Z",
      finishedAt: "2026-09-08T00:00:01.500Z",
      lastOkAt: "2026-09-07T01:12:49.654Z",
      error: INTERRUPTED_REFRESH_MESSAGE,
      lastRun,
      catchUpOn: "2026-09-08",
    });
    expect(markedInterrupted).toBe(false);
    expect(shouldPersist).toBe(true);
    expect(snapshot.catchUpOn).toBeNull();
    expect(snapshot.status).toBe("error");
  });

  it("keeps a young running snapshot without a pid (legacy file) as running", () => {
    const now = Date.parse("2026-09-08T00:03:00.000Z");
    const { snapshot, shouldPersist } = snapshotFromDisk(
      {
        status: "running",
        phase: "ingest",
        startedAt: "2026-09-08T00:00:09.110Z",
        finishedAt: null,
        lastOkAt: "2026-09-07T01:12:49.654Z",
        error: null,
        lastRun: { ...lastRun, rankedProcessed: 0 },
      },
      now,
    );
    expect(shouldPersist).toBe(false);
    expect(snapshot.status).toBe("running");
    expect(snapshot.phase).toBe("ingest");
    expect(snapshot.error).toBeNull();
  });

  it("marks a running snapshot older than the stale window as interrupted when pid is missing", () => {
    const startedAt = "2026-09-08T00:00:00.000Z";
    const now = Date.parse(startedAt) + STALE_RUNNING_MS + 1;
    const { snapshot, shouldPersist } = snapshotFromDisk(
      {
        status: "running",
        phase: "scrape",
        startedAt,
        finishedAt: null,
        lastOkAt: "2026-09-07T00:00:00.000Z",
        lastRun,
      },
      now,
    );
    expect(shouldPersist).toBe(true);
    expect(snapshot.status).toBe("error");
    expect(snapshot.error).toBe(INTERRUPTED_REFRESH_MESSAGE);
    expect(snapshot.lastRun).toEqual(lastRun);
  });

  it("does not age-out a long run while the runner pid is still alive", () => {
    const startedAt = "2026-09-08T00:00:00.000Z";
    const now = Date.parse(startedAt) + STALE_RUNNING_MS + 1;
    const { snapshot, shouldPersist } = snapshotFromDisk(
      {
        status: "running",
        phase: "ingest",
        startedAt,
        finishedAt: null,
        lastOkAt: "2026-09-07T00:00:00.000Z",
        lastRun,
        runnerPid: 7,
      },
      now,
      (pid) => pid === 7,
    );
    expect(shouldPersist).toBe(false);
    expect(snapshot.status).toBe("running");
    expect(snapshot.phase).toBe("ingest");
  });
});

describe("board refresh catch-up after interrupt", () => {
  const base = {
    status: "error",
    error: INTERRUPTED_REFRESH_MESSAGE,
    lastOkAt: "2026-10-15T00:12:22.754Z",
    catchUpOn: null as string | null,
    interruptedMessage: INTERRUPTED_REFRESH_MESSAGE,
    hour: 17,
    minute: 0,
  };

  it("catches up when past today's schedule with no success since then", () => {
    expect(
      shouldCatchUpInterruptedBoardRefresh({
        ...base,
        now: new Date(2026, 9, 16, 20, 0, 0), // local Oct 16 8pm
      }),
    ).toBe(true);
  });

  it("does not catch up before today's scheduled time", () => {
    expect(
      shouldCatchUpInterruptedBoardRefresh({
        ...base,
        now: new Date(2026, 9, 16, 16, 0, 0), // local Oct 16 4pm
      }),
    ).toBe(false);
  });

  it("does not catch up when last success is after today's schedule", () => {
    expect(
      shouldCatchUpInterruptedBoardRefresh({
        ...base,
        lastOkAt: new Date(2026, 9, 16, 17, 30, 0).toISOString(),
        now: new Date(2026, 9, 16, 20, 0, 0),
      }),
    ).toBe(false);
  });

  it("does not catch up twice on the same local day", () => {
    expect(
      shouldCatchUpInterruptedBoardRefresh({
        ...base,
        catchUpOn: "2026-10-16",
        now: new Date(2026, 9, 16, 20, 0, 0),
      }),
    ).toBe(false);
  });

  it("does not catch up for non-interrupt errors", () => {
    expect(
      shouldCatchUpInterruptedBoardRefresh({
        ...base,
        error: "network down",
        now: new Date(2026, 9, 16, 20, 0, 0),
      }),
    ).toBe(false);
  });
});
