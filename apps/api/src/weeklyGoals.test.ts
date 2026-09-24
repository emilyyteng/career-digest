import { describe, expect, it } from "vitest";
import { computePace, mondayOfLocalWeek, weekElapsedFraction } from "./weeklyGoals.js";

describe("weeklyGoals pace", () => {
  it("reports on track when total is 0", () => {
    expect(computePace(0, 0, 0.5)).toMatchObject({ label: "on_track", amount: 0 });
  });

  it("reports on track when complete", () => {
    expect(computePace(10, 10, 0.2)).toMatchObject({ label: "on_track", amount: 0 });
  });

  it("computes ahead/behind from floor(done - expected)", () => {
    expect(computePace(6, 10, 0.4)).toMatchObject({ label: "ahead", amount: 2 });
    expect(computePace(2, 10, 0.5)).toMatchObject({ label: "behind", amount: 3 });
    expect(computePace(5, 10, 0.5)).toMatchObject({ label: "on_track", amount: 0 });
  });

  it("mondayOfLocalWeek returns a Monday civil date", () => {
    // 2026-09-23 is a Wednesday UTC; local TZ UTC → week starts 2026-09-21
    const monday = mondayOfLocalWeek(new Date("2026-09-23T15:00:00.000Z"), "UTC");
    expect(monday).toBe("2026-09-21");
    const elapsed = weekElapsedFraction(
      new Date("2026-09-23T12:00:00.000Z"),
      monday,
      "UTC",
    );
    expect(elapsed).toBeGreaterThan(0.2);
    expect(elapsed).toBeLessThan(0.5);
  });
});
