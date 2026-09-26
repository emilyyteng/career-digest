import { describe, expect, it } from "vitest";
import {
  INTERRUPTED_REFRESH_MESSAGE,
  STALE_RUNNING_MS,
  parseLastRun,
  snapshotFromDisk,
} from "./boardRefreshState.js";

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
    const { snapshot, persistStaleRunning } = snapshotFromDisk({
      status: "ok",
      phase: null,
      startedAt: "2026-09-09T00:02:09.486Z",
      finishedAt: "2026-09-09T00:08:40.406Z",
      lastOkAt: "2026-09-09T00:08:40.406Z",
      error: null,
      lastRun,
    });
    expect(persistStaleRunning).toBe(false);
    expect(snapshot).toMatchObject({
      status: "ok",
      lastOkAt: "2026-09-09T00:08:40.406Z",
      lastRun,
    });
  });

  it("keeps an in-progress cron run as running with phase (not 'interrupted')", () => {
    const now = Date.parse("2026-09-08T00:03:00.000Z");
    const { snapshot, persistStaleRunning } = snapshotFromDisk(
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
    expect(persistStaleRunning).toBe(false);
    expect(snapshot.status).toBe("running");
    expect(snapshot.phase).toBe("ingest");
    expect(snapshot.error).toBeNull();
  });

  it("marks a running snapshot older than the stale window as interrupted", () => {
    const startedAt = "2026-09-08T00:00:00.000Z";
    const now = Date.parse(startedAt) + STALE_RUNNING_MS + 1;
    const { snapshot, persistStaleRunning } = snapshotFromDisk(
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
    expect(persistStaleRunning).toBe(true);
    expect(snapshot.status).toBe("error");
    expect(snapshot.error).toBe(INTERRUPTED_REFRESH_MESSAGE);
    expect(snapshot.lastRun).toEqual(lastRun);
  });
});
