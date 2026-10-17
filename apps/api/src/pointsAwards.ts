import type { Pool, PoolClient } from "pg";
import {
  POINTS,
  applicationAppliedBreakdown,
  interviewFinishBreakdown,
  leetcodeDayPoints,
  miscTaskBreakdown,
  type LeetcodeTierCounts,
} from "./pointsFormulas.js";
import {
  adjustEarnAmount,
  effectiveEarnAmount,
  findEarnEvent,
  recordEarn,
  reinstateEarn,
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

/** F11 custom weekly target close / ledger source id. */
export function weeklyGoalSourceIdCustom(weekStart: string, goalId: string): string {
  return `${weekStart}:custom:${goalId}`;
}

/**
 * R5.21: the task's category at completion, kept on the earn. The name is kept too,
 * so the breakdown still has a label after the category is deleted.
 */
async function taskCategoryMeta(
  db: Queryable,
  taskId: string,
): Promise<{ task_category_id: string; task_category_name: string } | Record<string, never>> {
  const { rows } = await db.query<{ id: string; name: string }>(
    `SELECT c.id, c.name
     FROM tasks t
     JOIN task_categories c ON c.id = t.category_id
     WHERE t.id::text = $1`,
    [taskId],
  );
  const row = rows[0];
  return row ? { task_category_id: row.id, task_category_name: row.name } : {};
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
  const sourceId = taskCompleteSourceId(input.taskId);
  const existing = await findEarnEvent(db, "task_complete", sourceId);
  const categoryMeta = await taskCategoryMeta(db, input.taskId);
  if (existing?.meta.superseded === true) {
    return reinstateMiscTaskComplete(db, existing, input, categoryMeta);
  }

  const { total, breakdown } = miscTaskBreakdown({
    actualMinutes: input.actualMinutes,
    withReflection: input.withReflection,
  });
  const { event } = await recordEarn(db, {
    category: "task",
    amount: total,
    message: `${input.title} complete! +${total} points`,
    sourceType: "task_complete",
    sourceId,
    breakdown,
    meta: {
      actual_minutes: input.actualMinutes ?? null,
      with_reflection: Boolean(input.withReflection),
      ...categoryMeta,
    },
  });
  return event;
}

function signedPoints(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${-n}`;
  return "±0";
}

/**
 * Re-complete after reopen (R4.13): the earn comes back at f(new actual), so
 * across reopen and re-complete the task nets f(new) − f(old). The reflection
 * add-on stays if the original completion had one. The earn moves to the task's
 * category at this completion; the earlier earn and its reverse net 0 wherever they sit.
 */
async function reinstateMiscTaskComplete(
  db: Queryable,
  existing: PointsEventRow,
  input: { taskId: string; title: string; actualMinutes?: number | null; withReflection?: boolean },
  categoryMeta: Record<string, string>,
): Promise<PointsEventRow> {
  const withReflection =
    Boolean(input.withReflection) || existing.meta.with_reflection === true;
  const { total } = miscTaskBreakdown({
    actualMinutes: input.actualMinutes,
    withReflection,
  });
  const beforeReopen = Number(existing.meta.reversed_amount ?? 0);
  const { earn, adjust } = await reinstateEarn(
    db,
    "task_complete",
    taskCompleteSourceId(input.taskId),
    total,
    (delta) =>
      `${input.title} complete again · ${signedPoints(delta)} points (${beforeReopen} before reopen, net ${signedPoints(total - beforeReopen)})`,
    {
      actual_minutes: input.actualMinutes ?? null,
      with_reflection: withReflection,
      ...categoryMeta,
    },
  );
  return adjust ?? earn ?? existing;
}

export async function awardApplicationApplied(
  db: Queryable,
  input: {
    applicationId: string;
    label: string;
    withReflection?: boolean;
    actualMinutes?: number | null;
  },
): Promise<{ event: PointsEventRow; created: boolean }> {
  const { total, breakdown } = applicationAppliedBreakdown({
    withReflection: input.withReflection,
    actualMinutes: input.actualMinutes,
  });
  return recordEarn(db, {
    category: "application",
    amount: total,
    message: `${input.label} application complete! +${total} points`,
    sourceType: "application_applied",
    sourceId: applicationAppliedSourceId(input.applicationId),
    breakdown,
    meta: {
      with_reflection: Boolean(input.withReflection),
      actual_minutes: input.actualMinutes ?? null,
    },
  });
}

export async function awardInterviewFinish(
  db: Queryable,
  input: {
    stepId: string;
    label: string;
    kind: string | null | undefined;
    withReflection?: boolean;
    actualMinutes?: number | null;
  },
): Promise<{ event: PointsEventRow; created: boolean }> {
  const { total, breakdown } = interviewFinishBreakdown({
    kind: input.kind,
    withReflection: input.withReflection,
    actualMinutes: input.actualMinutes,
  });
  return recordEarn(db, {
    category: "interview",
    amount: total,
    message: `${input.label} finished! +${total} points`,
    sourceType: "interview_finish",
    sourceId: interviewFinishSourceId(input.stepId),
    breakdown,
    meta: {
      step_kind: input.kind ?? "custom",
      with_reflection: Boolean(input.withReflection),
      actual_minutes: input.actualMinutes ?? null,
    },
  });
}

/** A reflection created on its own (not in a completion modal): flat +20 from any form. */
export async function awardReflectionCreate(
  db: Queryable,
  input: {
    reflectionId: string;
    label: string;
  },
): Promise<PointsEventRow> {
  const amount = POINTS.reflectionBonus;
  const { event } = await recordEarn(db, {
    category: "reflection",
    amount,
    message: `${input.label} · +${amount} points`,
    sourceType: "reflection_create",
    sourceId: reflectionCreateSourceId(input.reflectionId),
    breakdown: [
      { category: "reflection", amount, label: "reflection" },
    ],
  });
  return event;
}

/**
 * Sync a day's LeetCode earn (one aggregate earn per day) to its tier counts (R5.20).
 * A plain number is an untiered count, worth medium. Returns the day's earn and the
 * event that moved points (earn, adjust or reverse), or null if nothing changed.
 * `label` names the change in that event's message, e.g. "Hard LeetCode (misc)".
 */
export async function syncLeetcodeDailyPoints(
  db: Queryable,
  localDate: string,
  counts: number | LeetcodeTierCounts,
  label?: string,
): Promise<{ earn: PointsEventRow | null; change: PointsEventRow | null }> {
  const tiers = typeof counts === "number" ? { easy: 0, medium: Math.max(0, counts), hard: 0 } : counts;
  const count = tiers.easy + tiers.medium + tiers.hard;
  const target = leetcodeDayPoints(tiers);
  const name = label ?? `LC ${count}`;
  const meta = { count, easy: tiers.easy, medium: tiers.medium, hard: tiers.hard };
  const sourceType = "leetcode_daily";
  const sourceId = leetcodeDailySourceId(localDate);
  const existing = await findEarnEvent(db, sourceType, sourceId);

  if (!existing) {
    if (target <= 0) return { earn: null, change: null };
    const { event } = await recordEarn(db, {
      category: "leetcode",
      amount: target,
      message: `${name} · +${target} points`,
      sourceType,
      sourceId,
      breakdown: [{ category: "leetcode", amount: target, label: "LC" }],
      meta,
    });
    return { earn: event, change: event };
  }

  if (existing.meta.superseded === true) {
    if (target <= 0) return { earn: existing, change: null };
    const { earn, adjust } = await reinstateEarn(
      db,
      sourceType,
      sourceId,
      target,
      (delta) => `${name} · ${signedPoints(delta)} points`,
      meta,
    );
    return { earn, change: adjust };
  }

  const current = effectiveEarnAmount(existing);
  if (target === current) return { earn: existing, change: null };

  if (target === 0) {
    const { event } = await reverseEarn(
      db,
      sourceType,
      sourceId,
      label ? `${label} · −${current} points` : `LC cleared · −${current} points`,
    );
    return { earn: await findEarnEvent(db, sourceType, sourceId), change: event };
  }

  const { earn, adjust } = await adjustEarnAmount(
    db,
    sourceType,
    sourceId,
    target,
    target > current
      ? `${name} · +${target - current} points`
      : `${name} · −${current - target} points`,
  );
  if (earn) {
    await db.query(`UPDATE points_events SET meta = meta || $2::jsonb WHERE id = $1`, [
      earn.id,
      JSON.stringify(meta),
    ]);
  }
  return { earn, change: adjust };
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

export type WorkTimeAdjustResult = {
  /** The adjust event, or the earn seeded for work from before the ledger; null if unchanged. */
  event: PointsEventRow | null;
  appliedDelta: number;
  requestedDelta: number;
};

/**
 * A time edit on finished work re-scores its earn under the current formula with one
 * adjust event (R5.31). Work finished before the ledger has no earn yet, so `seed` records it.
 */
async function adjustWorkEarn(
  db: Queryable,
  input: {
    sourceType: string;
    sourceId: string;
    label: string;
    total: number;
    actualMinutes: number | null;
    seed: (() => Promise<{ event: PointsEventRow; created: boolean }>) | null;
  },
): Promise<WorkTimeAdjustResult> {
  const existing = await findEarnEvent(db, input.sourceType, input.sourceId);
  if (!existing) {
    if (!input.seed) return { event: null, appliedDelta: 0, requestedDelta: 0 };
    const { event, created } = await input.seed();
    return created
      ? { event, appliedDelta: event.amount, requestedDelta: event.amount }
      : { event: null, appliedDelta: 0, requestedDelta: 0 };
  }
  const delta = input.total - effectiveEarnAmount(existing);
  const result = await adjustEarnAmount(
    db,
    input.sourceType,
    input.sourceId,
    input.total,
    `${input.label} time updated · ${signedPoints(delta)} points`,
  );
  if (result.earn) {
    await db.query(
      `UPDATE points_events SET meta = meta || $2::jsonb WHERE id = $1`,
      [result.earn.id, JSON.stringify({ actual_minutes: input.actualMinutes })],
    );
  }
  return {
    event: result.adjust,
    appliedDelta: result.appliedDelta,
    requestedDelta: result.requestedDelta,
  };
}

async function hasLinkedReflection(
  db: Queryable,
  column: "task_id" | "application_id" | "interview_step_id",
  id: string,
): Promise<boolean> {
  const { rows } = await db.query<{ ok: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM reflection_logs WHERE ${column} = $1) AS ok`,
    [id],
  );
  return Boolean(rows[0]?.ok);
}

export async function adjustTaskCompleteActual(
  db: Queryable,
  input: {
    taskId: string;
    title: string;
    actualMinutes: number | null;
    withReflection: boolean;
  },
): Promise<WorkTimeAdjustResult> {
  const { total } = miscTaskBreakdown({
    actualMinutes: input.actualMinutes,
    withReflection: input.withReflection,
  });
  return adjustWorkEarn(db, {
    sourceType: "task_complete",
    sourceId: taskCompleteSourceId(input.taskId),
    label: input.title,
    total,
    actualMinutes: input.actualMinutes,
    seed: async () => {
      const event = await awardMiscTaskComplete(db, input);
      return { event, created: true };
    },
  });
}

export async function adjustApplicationActual(
  db: Queryable,
  input: { applicationId: string; label: string; actualMinutes: number | null },
): Promise<WorkTimeAdjustResult> {
  const sourceId = applicationAppliedSourceId(input.applicationId);
  const existing = await findEarnEvent(db, "application_applied", sourceId);
  const withReflection = existing
    ? existing.meta.with_reflection === true
    : await hasLinkedReflection(db, "application_id", input.applicationId);
  const { total } = applicationAppliedBreakdown({
    actualMinutes: input.actualMinutes,
    withReflection,
  });
  return adjustWorkEarn(db, {
    sourceType: "application_applied",
    sourceId,
    label: input.label,
    total,
    actualMinutes: input.actualMinutes,
    seed: () =>
      awardApplicationApplied(db, {
        applicationId: input.applicationId,
        label: input.label,
        withReflection,
        actualMinutes: input.actualMinutes,
      }),
  });
}

export async function adjustInterviewFinishActual(
  db: Queryable,
  input: {
    stepId: string;
    label: string;
    kind: string | null | undefined;
    actualMinutes: number | null;
    /** False for an unfinished step: re-score a kept earn, but don't create one. */
    seedIfMissing?: boolean;
  },
): Promise<WorkTimeAdjustResult> {
  const sourceId = interviewFinishSourceId(input.stepId);
  const existing = await findEarnEvent(db, "interview_finish", sourceId);
  const withReflection = existing
    ? existing.meta.with_reflection === true
    : await hasLinkedReflection(db, "interview_step_id", input.stepId);
  const kind =
    typeof existing?.meta.step_kind === "string" ? existing.meta.step_kind : input.kind;
  const { total } = interviewFinishBreakdown({
    kind,
    actualMinutes: input.actualMinutes,
    withReflection,
  });
  return adjustWorkEarn(db, {
    sourceType: "interview_finish",
    sourceId,
    label: input.label,
    total,
    actualMinutes: input.actualMinutes,
    seed:
      input.seedIfMissing === false
        ? null
        : () =>
            awardInterviewFinish(db, {
              stepId: input.stepId,
              label: input.label,
              kind,
              withReflection,
              actualMinutes: input.actualMinutes,
            }),
  });
}
