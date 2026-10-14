/**
 * Pure M4 points formulas (no DB). Keep in sync with changelog / grilling brief.
 */

export const POINTS = {
  /** Every kind of work has a flat base; time adds 1 point a minute on top (R5.31). */
  miscTaskBase: 10,
  applicationBase: 5,
  /** A reflection is a flat +20, whether written with the work or on its own. */
  reflectionBonus: 20,
  /** Untiered solves (logged before tiers) count as medium. */
  leetcodePerUnit: 30,
  /** R5.20, Q32. */
  leetcodeByTier: { easy: 20, medium: 30, hard: 50 },
  /** Week close (R5.15): per completed tagged app or weekly LC solve, plus a flat bonus when met. */
  weeklyGoalPerUnit: 20,
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

/** R5.15: a week's worth per goal. 0/0 is never met, so it earns nothing (R5.12). */
export function weeklyRecordPoints(done: number, met: boolean): number {
  return Math.max(0, done) * POINTS.weeklyGoalPerUnit + (met ? POINTS.weeklyGoalBonus : 0);
}

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

export type LeetcodeTier = "easy" | "medium" | "hard";
export const LEETCODE_TIERS: readonly LeetcodeTier[] = ["easy", "medium", "hard"];
export type LeetcodeTierCounts = Record<LeetcodeTier, number>;

export function isLeetcodeTier(value: unknown): value is LeetcodeTier {
  return value === "easy" || value === "medium" || value === "hard";
}

/** A day's LeetCode points at each tier's value (R5.20). */
export function leetcodeDayPoints(counts: LeetcodeTierCounts): number {
  return LEETCODE_TIERS.reduce(
    (sum, tier) => sum + Math.max(0, Math.floor(counts[tier])) * POINTS.leetcodeByTier[tier],
    0,
  );
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
