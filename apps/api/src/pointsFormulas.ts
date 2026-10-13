/**
 * Pure M4 points formulas (no DB). Keep in sync with changelog / grilling brief.
 */

export const POINTS = {
  /** Every kind of work has a flat base; time adds 1 point a minute on top (R5.31). */
  miscTaskBase: 10,
  applicationBase: 5,
  /** A reflection is a flat +20, whether written with the work or on its own. */
  reflectionBonus: 20,
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

/** 1 point a minute; blank or negative time adds 0. */
export function pointsForMinutes(actualMinutes: number | null | undefined): number {
  if (actualMinutes == null || !Number.isFinite(actualMinutes)) return 0;
  return Math.max(0, Math.floor(actualMinutes));
}

export function pointsForInterviewKind(kind: string | null | undefined): number {
  const key = (kind ?? "custom") as InterviewStepKind;
  return POINTS.interviewByKind[key] ?? POINTS.interviewByKind.custom;
}

function withReflectionSlice(
  work: PointsBreakdownSlice,
  withReflection: boolean | undefined,
): { total: number; breakdown: PointsBreakdownSlice[] } {
  const breakdown = [work];
  if (withReflection) {
    breakdown.push({
      category: "reflection",
      amount: POINTS.reflectionBonus,
      label: "reflection",
    });
  }
  return {
    total: breakdown.reduce((s, b) => s + b.amount, 0),
    breakdown,
  };
}

export function miscTaskBreakdown(input: {
  actualMinutes?: number | null;
  withReflection?: boolean;
}): { total: number; breakdown: PointsBreakdownSlice[] } {
  return withReflectionSlice(
    {
      category: "task",
      amount: POINTS.miscTaskBase + pointsForMinutes(input.actualMinutes),
      label: "task",
    },
    input.withReflection,
  );
}

export function applicationAppliedBreakdown(input: {
  actualMinutes?: number | null;
  withReflection?: boolean;
}): { total: number; breakdown: PointsBreakdownSlice[] } {
  return withReflectionSlice(
    {
      category: "application",
      amount: POINTS.applicationBase + pointsForMinutes(input.actualMinutes),
      label: "app",
    },
    input.withReflection,
  );
}

export function interviewFinishBreakdown(input: {
  kind: string | null | undefined;
  actualMinutes?: number | null;
  withReflection?: boolean;
}): { total: number; breakdown: PointsBreakdownSlice[] } {
  return withReflectionSlice(
    {
      category: "interview",
      amount: pointsForInterviewKind(input.kind) + pointsForMinutes(input.actualMinutes),
      label: (input.kind ?? "custom") || "custom",
    },
    input.withReflection,
  );
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
