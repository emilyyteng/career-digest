import { describe, expect, it } from "vitest";
import {
  POINTS,
  applicationAppliedBreakdown,
  applyDeltaToBalance,
  interviewFinishBreakdown,
  leetcodeDayPoints,
  leetcodePointsForCount,
  streakDailyPoints,
  streakMilestonePoints,
  miscTaskBreakdown,
  pointsForInterviewKind,
  pointsForMinutes,
} from "./pointsFormulas.js";

describe("pointsFormulas", () => {
  it("time is 1 point a minute; blank or negative adds 0", () => {
    expect(pointsForMinutes(null)).toBe(0);
    expect(pointsForMinutes(undefined)).toBe(0);
    expect(pointsForMinutes(-5)).toBe(0);
    expect(pointsForMinutes(52.9)).toBe(52);
  });

  it("misc is +10 base + minutes, +20 with a reflection", () => {
    expect(miscTaskBreakdown({ actualMinutes: 30 }).total).toBe(40);
    expect(miscTaskBreakdown({}).total).toBe(10);
    expect(miscTaskBreakdown({ withReflection: true }).total).toBe(30);
    const { total, breakdown } = miscTaskBreakdown({
      actualMinutes: 30,
      withReflection: true,
    });
    expect(total).toBe(60);
    expect(breakdown).toEqual([
      { category: "task", amount: 40, label: "task" },
      { category: "reflection", amount: POINTS.reflectionBonus, label: "reflection" },
    ]);
  });

  it("application is +5 base + minutes, +20 with a reflection", () => {
    expect(applicationAppliedBreakdown({}).total).toBe(5);
    expect(applicationAppliedBreakdown({ actualMinutes: 60 }).total).toBe(65);
    expect(
      applicationAppliedBreakdown({ actualMinutes: 60, withReflection: true }).total,
    ).toBe(85);
  });

  it("interview is kind points + minutes, +20 with a reflection", () => {
    expect(pointsForInterviewKind("technical")).toBe(80);
    expect(pointsForInterviewKind("offer")).toBe(200);
    expect(pointsForInterviewKind("unknown")).toBe(40);
    expect(interviewFinishBreakdown({ kind: "technical", actualMinutes: 30 }).total).toBe(110);
    const { total, breakdown } = interviewFinishBreakdown({
      kind: "technical",
      withReflection: true,
      actualMinutes: 30,
    });
    expect(total).toBe(130);
    expect(breakdown[0]?.amount).toBe(110);
    expect(breakdown[1]?.amount).toBe(20);
  });

  it("each kind of work's base is a named constant", () => {
    expect(POINTS.miscTaskBase).toBe(10);
    expect(POINTS.applicationBase).toBe(5);
    expect(POINTS.reflectionBonus).toBe(20);
    expect(POINTS).not.toHaveProperty("miscTaskDefaultMinutes");
  });

  it("LC is uncapped 30 per unit", () => {
    expect(leetcodePointsForCount(0)).toBe(0);
    expect(leetcodePointsForCount(3)).toBe(90);
    expect(leetcodePointsForCount(10)).toBe(300);
  });

  it("LC by tier is easy 20, medium 30, hard 50, uncapped", () => {
    expect(leetcodeDayPoints({ easy: 0, medium: 0, hard: 0 })).toBe(0);
    expect(leetcodeDayPoints({ easy: 1, medium: 1, hard: 1 })).toBe(100);
    expect(leetcodeDayPoints({ easy: 5, medium: 0, hard: 4 })).toBe(300);
  });

  it("streak daily is 2 × length capped at 20; milestones are 5 × length", () => {
    expect(streakDailyPoints(1)).toBe(2);
    expect(streakDailyPoints(5)).toBe(10);
    expect(streakDailyPoints(10)).toBe(20);
    expect(streakDailyPoints(15)).toBe(20);
    expect(streakMilestonePoints(4)).toBeNull();
    expect(streakMilestonePoints(5)).toBe(25);
    expect(streakMilestonePoints(10)).toBe(50);
  });

  it("applyDeltaToBalance allows a negative balance", () => {
    expect(applyDeltaToBalance(100, -40)).toEqual({
      appliedDelta: -40,
      requestedDelta: -40,
      balanceAfter: 60,
    });
    expect(applyDeltaToBalance(10, -40)).toEqual({
      appliedDelta: -40,
      requestedDelta: -40,
      balanceAfter: -30,
    });
  });
});
