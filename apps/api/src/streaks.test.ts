import { describe, expect, it } from "vitest";
import { addCivilDays } from "./homeUpcoming.js";
import { currentStreak } from "./streaks.js";

describe("currentStreak", () => {
  const today = "2026-10-14";
  const y = (n: number) => addCivilDays(today, -n);

  it("counts consecutive days ending today", () => {
    const days = new Set([y(2), y(1), today]);
    expect(currentStreak(days, today)).toEqual({ length: 3, todayCounts: true });
  });

  it("keeps yesterday's run when today is not done yet", () => {
    const days = new Set([y(2), y(1)]);
    expect(currentStreak(days, today)).toEqual({ length: 2, todayCounts: false });
  });

  it("is 0 when yesterday also missed (gap already closed)", () => {
    const days = new Set([y(3), y(2)]);
    expect(currentStreak(days, today)).toEqual({ length: 0, todayCounts: false });
  });

  it("stops at a gap", () => {
    const days = new Set([y(4), y(1), today]);
    expect(currentStreak(days, today)).toEqual({ length: 2, todayCounts: true });
  });
});
