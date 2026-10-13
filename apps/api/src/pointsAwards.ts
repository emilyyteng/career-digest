import type { Pool, PoolClient } from "pg";
import {
  POINTS,
  applicationAppliedBreakdown,
  interviewFinishBreakdown,
  leetcodePointsForCount,
  miscTaskBreakdown,
  pointsForReflectionMinutes,
} from "./pointsFormulas.js";
import {
  adjustEarnAmount,
  effectiveEarnAmount,
  findEarnEvent,
  recordEarn,
  reverseEarn,
  type PointsEventRow,
} from "./pointsLedger.js";

type Queryable = Pool | PoolClient;

export function taskCompleteSourceId(taskId: string): string {
  return taskId;
}

export function applicationAppliedSourceId(applicationId: string): string {
  return applicationId;
}

export function interviewFinishSourceId(stepId: string): string {
  return stepId;
}

export function reflectionCreateSourceId(reflectionId: string): string {
  return reflectionId;
}

export function leetcodeDailySourceId(localDate: string): string {
  return localDate;
}

export function weeklyGoalSourceId(weekStart: string, slot: "lc" | "apps"): string {
  return `${weekStart}:${slot}`;
}

export async function awardMiscTaskComplete(
  db: Queryable,
  input: {
    taskId: string;
    title: string;
    actualMinutes?: number | null;
    withReflection?: boolean;
  },
): Promise<PointsEventRow> {
  const { total, breakdown } = miscTaskBreakdown({
    actualMinutes: input.actualMinutes,
    withReflection: input.withReflection,
  });
  const { event } = await recordEarn(db, {
    category: "task",
    amount: total,
    message: `${input.title} complete! +${total} points`,
    sourceType: "task_complete",
    sourceId: taskCompleteSourceId(input.taskId),
    breakdown,
    meta: {
      actual_minutes: input.actualMinutes ?? null,
      with_reflection: Boolean(input.withReflection),
    },
  });
  return event;
}

export async function awardApplicationApplied(
  db: Queryable,
  input: {
    applicationId: string;
    label: string;
    withReflection?: boolean;
    reflectionMinutes?: number | null;
  },
): Promise<PointsEventRow> {
  const { total, breakdown } = applicationAppliedBreakdown({
    withReflection: input.withReflection,
    reflectionMinutes: input.reflectionMinutes,
  });
  const { event } = await recordEarn(db, {
    category: "application",
    amount: total,
    message: `${input.label} application complete! +${total} points`,
    sourceType: "application_applied",
    sourceId: applicationAppliedSourceId(input.applicationId),
    breakdown,
    meta: {
      with_reflection: Boolean(input.withReflection),
      reflection_minutes: input.reflectionMinutes ?? null,
    },
  });
  return event;
}

export async function awardInterviewFinish(
  db: Queryable,
  input: {
    stepId: string;
    label: string;
    kind: string | null | undefined;
    withReflection?: boolean;
    reflectionMinutes?: number | null;
  },
): Promise<PointsEventRow> {
  const { total, breakdown } = interviewFinishBreakdown({
    kind: input.kind,
    withReflection: input.withReflection,
    reflectionMinutes: input.reflectionMinutes,
  });
  const { event } = await recordEarn(db, {
    category: "interview",
    amount: total,
    message: `${input.label} finished! +${total} points`,
    sourceType: "interview_finish",
    sourceId: interviewFinishSourceId(input.stepId),
    breakdown,
    meta: {
      step_kind: input.kind ?? "custom",
      with_reflection: Boolean(input.withReflection),
      reflection_minutes: input.reflectionMinutes ?? null,
    },
  });
  return event;
}

/** Standalone Progress reflection create (not bundled into a completion event). */
export async function awardReflectionCreate(
  db: Queryable,
  input: {
    reflectionId: string;
    label: string;
    actualMinutes?: number | null;
  },
): Promise<PointsEventRow> {
  const amount = pointsForReflectionMinutes(input.actualMinutes);
  const { event } = await recordEarn(db, {
    category: "reflection",
    amount,
    message: `${input.label} · +${amount} points`,
    sourceType: "reflection_create",
    sourceId: reflectionCreateSourceId(input.reflectionId),
    breakdown: [
      { category: "reflection", amount, label: "reflection" },
    ],
    meta: { actual_minutes: input.actualMinutes ?? null },
  });
  return event;
}

/**
 * Sync leetcode daily earn to match `count` (aggregate event per day).
 * Increases adjust/earn up; decreases reverse via adjustEarnAmount / reverse.
 */
export async function syncLeetcodeDailyPoints(
  db: Queryable,
  localDate: string,
  count: number,
): Promise<PointsEventRow | null> {
  const target = leetcodePointsForCount(count);
  const sourceType = "leetcode_daily";
  const sourceId = leetcodeDailySourceId(localDate);
  const existing = await findEarnEvent(db, sourceType, sourceId);

  if (!existing) {
    if (target <= 0) return null;
    const { event } = await recordEarn(db, {
      category: "leetcode",
      amount: target,
      message: `LC ${count} · +${target} points`,
      sourceType,
      sourceId,
      breakdown: [
        { category: "leetcode", amount: target, label: "LC" },
      ],
      meta: { count },
    });
    return event;
  }

  const current = effectiveEarnAmount(existing);
  if (target === current) return existing;

  if (target === 0) {
    await reverseEarn(db, sourceType, sourceId, `LC cleared · −${current} points`);
    return findEarnEvent(db, sourceType, sourceId);
  }

  const { earn } = await adjustEarnAmount(
    db,
    sourceType,
    sourceId,
    target,
    target > current
      ? `LC ${count} · +${target - current} points`
      : `LC ${count} · −${current - target} points`,
  );
  if (earn) {
    await db.query(
      `UPDATE points_events SET meta = meta || $2::jsonb WHERE id = $1`,
      [earn.id, JSON.stringify({ count })],
    );
  }
  return earn;
}

export async function awardWeeklyGoalIfNeeded(
  db: Queryable,
  input: {
    weekStart: string;
    slot: "lc" | "apps";
    met: boolean;
    label: string;
  },
): Promise<PointsEventRow | null> {
  if (!input.met) return null;
  const sourceType = "weekly_goal";
  const sourceId = weeklyGoalSourceId(input.weekStart, input.slot);
  const { event, created } = await recordEarn(db, {
    category: "weekly_goal",
    amount: POINTS.weeklyGoalBonus,
    message: `${input.label} · +${POINTS.weeklyGoalBonus} points`,
    sourceType,
    sourceId,
    breakdown: [
      {
        category: "weekly_goal",
        amount: POINTS.weeklyGoalBonus,
        label: input.slot,
      },
    ],
    meta: { week_start: input.weekStart, slot: input.slot },
  });
  return created ? event : null;
}

export async function reverseTaskComplete(
  db: Queryable,
  taskId: string,
  title: string,
): Promise<void> {
  await reverseEarn(
    db,
    "task_complete",
    taskCompleteSourceId(taskId),
    `${title} reopened · points reversed`,
  );
}

export async function adjustTaskCompleteActual(
  db: Queryable,
  input: {
    taskId: string;
    title: string;
    actualMinutes: number | null;
    withReflection: boolean;
  },
): Promise<{ appliedDelta: number; requestedDelta: number }> {
  const { total } = miscTaskBreakdown({
    actualMinutes: input.actualMinutes,
    withReflection: input.withReflection,
  });
  const sourceId = taskCompleteSourceId(input.taskId);
  const existing = await findEarnEvent(db, "task_complete", sourceId);

  // Pre-ledger completions have no earn row — seed one on first actual edit
  // so Points log gets a visible entry and later edits can adjust.
  if (!existing) {
    const event = await awardMiscTaskComplete(db, {
      taskId: input.taskId,
      title: input.title,
      actualMinutes: input.actualMinutes,
      withReflection: input.withReflection,
    });
    return {
      appliedDelta: event.amount,
      requestedDelta: event.amount,
    };
  }

  const result = await adjustEarnAmount(
    db,
    "task_complete",
    sourceId,
    total,
    `${input.title} actual updated`,
  );
  return {
    appliedDelta: result.appliedDelta,
    requestedDelta: result.requestedDelta,
  };
}
