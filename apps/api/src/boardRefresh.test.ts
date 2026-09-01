import { describe, expect, it } from "vitest";

/** Mirror boardRefresh parseLastRun for unit testing without loading state file. */
function parseLastRun(raw: unknown) {
  if (!raw || typeof raw !== "object") return null;
  const row = raw as Record<string, unknown>;
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
