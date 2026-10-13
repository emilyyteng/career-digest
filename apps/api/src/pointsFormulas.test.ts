import { describe, expect, it } from "vitest";
import {
  POINTS,
  applicationAppliedBreakdown,
  clampDeltaToBalance,
  interviewFinishBreakdown,
  leetcodePointsForCount,
  miscTaskBreakdown,
  pointsForInterviewKind,
  pointsForMiscTaskActual,
  pointsForReflectionMinutes,
} from "./pointsFormulas.js";

describe("pointsFormulas", () => {
  it("misc task uses actual minutes 1:1 and defaults to 15", () => {
    expect(pointsForMiscTaskActual(null)).toBe(15);
    expect(pointsForMiscTaskActual(undefined)).toBe(15);
    expect(pointsForMiscTaskActual(52)).toBe(52);
    expect(pointsForMiscTaskActual(0)).toBe(0);
  });

  it("misc + reflection adds flat +20 (not second minutes)", () => {
    const { total, breakdown } = miscTaskBreakdown({
      actualMinutes: 40,
      withReflection: true,
    });
    expect(total).toBe(60);
    expect(breakdown).toEqual([
      { category: "task", amount: 40, label: "task" },
      { category: "reflection", amount: 20, label: "reflection" },
    ]);
  });

  it("application is flat 5; reflection minutes optional", () => {
    expect(applicationAppliedBreakdown({}).total).toBe(5);
    expect(
      applicationAppliedBreakdown({ withReflection: true, reflectionMinutes: null }).total,
    ).toBe(5 + POINTS.reflectionDefault);
    expect(
      applicationAppliedBreakdown({ withReflection: true, reflectionMinutes: 30 }).total,
    ).toBe(35);
  });

  it("interview bases by kind + optional reflection", () => {
    expect(pointsForInterviewKind("technical")).toBe(80);
    expect(pointsForInterviewKind("offer")).toBe(200);
    expect(pointsForInterviewKind("unknown")).toBe(40);
    const { total, breakdown } = interviewFinishBreakdown({
      kind: "technical",
      withReflection: true,
      reflectionMinutes: 20,
    });
    expect(total).toBe(100);
    expect(breakdown[0]?.amount).toBe(80);
    expect(breakdown[1]?.amount).toBe(20);
  });

  it("reflection minutes 1:1 else 20", () => {
    expect(pointsForReflectionMinutes(null)).toBe(20);
    expect(pointsForReflectionMinutes(15)).toBe(15);
  });

  it("LC is uncapped 30 per unit", () => {
    expect(leetcodePointsForCount(0)).toBe(0);
    expect(leetcodePointsForCount(3)).toBe(90);
    expect(leetcodePointsForCount(10)).toBe(300);
  });

  it("clampDeltaToBalance never goes negative", () => {
    expect(clampDeltaToBalance(100, -40)).toEqual({
      appliedDelta: -40,
      requestedDelta: -40,
      balanceAfter: 60,
    });
    expect(clampDeltaToBalance(10, -40)).toEqual({
      appliedDelta: -10,
      requestedDelta: -40,
      balanceAfter: 0,
    });
  });
});
