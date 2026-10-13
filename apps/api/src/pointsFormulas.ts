/**
 * Pure M4 points formulas (no DB). Keep in sync with changelog / grilling brief.
 */

export const POINTS = {
  miscTaskDefaultMinutes: 15,
  applicationBase: 5,
  reflectionDefault: 20,
  leetcodePerUnit: 30,
  weeklyGoalBonus: 100,
  interviewByKind: {
    assessment: 60,
    phone: 50,
    technical: 80,
    onsite: 100,
    offer: 200,
    custom: 40,
  },
} as const;

export type PointsCategory =
  | "task"
  | "application"
  | "leetcode"
  | "interview"
  | "reflection"
  | "weekly_goal"
  | "achievement";

export type PointsBreakdownSlice = {
  category: PointsCategory;
  amount: number;
  label: string;
};

export type InterviewStepKind =
  | "assessment"
  | "phone"
  | "technical"
  | "onsite"
  | "offer"
  | "custom";

export function pointsForMiscTaskActual(actualMinutes: number | null | undefined): number {
  if (actualMinutes == null || !Number.isFinite(actualMinutes)) {
    return POINTS.miscTaskDefaultMinutes;
  }
  const n = Math.floor(actualMinutes);
  if (n < 0) return POINTS.miscTaskDefaultMinutes;
  return n;
}

/** Reflection slice: 1 pt/min when minutes set, else flat default. */
export function pointsForReflectionMinutes(
  actualMinutes: number | null | undefined,
): number {
  if (actualMinutes == null || !Number.isFinite(actualMinutes)) {
    return POINTS.reflectionDefault;
  }
  const n = Math.floor(actualMinutes);
  if (n < 0) return POINTS.reflectionDefault;
  return n;
}

export function pointsForInterviewKind(kind: string | null | undefined): number {
  const key = (kind ?? "custom") as InterviewStepKind;
  return POINTS.interviewByKind[key] ?? POINTS.interviewByKind.custom;
}

export function miscTaskBreakdown(input: {
  actualMinutes?: number | null;
  /** When true, add flat reflection (+20); minutes already counted on task. */
  withReflection?: boolean;
}): { total: number; breakdown: PointsBreakdownSlice[] } {
  const taskPts = pointsForMiscTaskActual(input.actualMinutes);
  const breakdown: PointsBreakdownSlice[] = [
    { category: "task", amount: taskPts, label: "task" },
  ];
  if (input.withReflection) {
    breakdown.push({
      category: "reflection",
      amount: POINTS.reflectionDefault,
      label: "reflection",
    });
  }
  return {
    total: breakdown.reduce((s, b) => s + b.amount, 0),
    breakdown,
  };
}

export function applicationAppliedBreakdown(input: {
  /** Minutes only when a reflection is included. */
  reflectionMinutes?: number | null;
  withReflection?: boolean;
}): { total: number; breakdown: PointsBreakdownSlice[] } {
  const breakdown: PointsBreakdownSlice[] = [
    {
      category: "application",
      amount: POINTS.applicationBase,
      label: "app",
    },
  ];
  if (input.withReflection) {
    const refl = pointsForReflectionMinutes(input.reflectionMinutes);
    breakdown.push({
      category: "reflection",
      amount: refl,
      label: "reflection",
    });
  }
  return {
    total: breakdown.reduce((s, b) => s + b.amount, 0),
    breakdown,
  };
}

export function interviewFinishBreakdown(input: {
  kind: string | null | undefined;
  reflectionMinutes?: number | null;
  withReflection?: boolean;
}): { total: number; breakdown: PointsBreakdownSlice[] } {
  const base = pointsForInterviewKind(input.kind);
  const breakdown: PointsBreakdownSlice[] = [
    {
      category: "interview",
      amount: base,
      label: (input.kind ?? "custom") || "custom",
    },
  ];
  if (input.withReflection) {
    const refl = pointsForReflectionMinutes(input.reflectionMinutes);
    breakdown.push({
      category: "reflection",
      amount: refl,
      label: "reflection",
    });
  }
  return {
    total: breakdown.reduce((s, b) => s + b.amount, 0),
    breakdown,
  };
}

export function leetcodePointsForCount(count: number): number {
  const n = Math.max(0, Math.floor(count));
  return n * POINTS.leetcodePerUnit;
}

/**
 * Clamp a proposed balance change so balance never goes below 0.
 * Returns applied delta and how much was requested vs applied.
 */
export function clampDeltaToBalance(
  currentBalance: number,
  requestedDelta: number,
): { appliedDelta: number; requestedDelta: number; balanceAfter: number } {
  const next = currentBalance + requestedDelta;
  if (next >= 0) {
    return {
      appliedDelta: requestedDelta,
      requestedDelta,
      balanceAfter: next,
    };
  }
  const appliedDelta = -currentBalance;
  return {
    appliedDelta,
    requestedDelta,
    balanceAfter: 0,
  };
}
