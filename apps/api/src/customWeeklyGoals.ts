/**
 * F11 M3-02: custom weekly targets — CRUD, ± progress, week-close Seeds, streaks.
 * Separate namespace from daily habits and apps/LC slots.
 */
import type { Pool, PoolClient } from "pg";
import { weeklyGoalSourceIdCustom } from "./pointsAwards.js";
import { POINTS, weeklyRecordPoints } from "./pointsFormulas.js";
import { effectiveEarnAmount, findEarnEvent, recordEarn } from "./pointsLedger.js";
import { isValidTimezone } from "./progress.js";
import {
  computePace,
  mondayOfLocalWeek,
  weekElapsedFraction,
  weekLabel,
  type WeeklyPaceLabel,
} from "./weeklyGoals.js";

type Queryable = Pool | PoolClient;

/** Active custom weekly targets cap (R.7). */
export const CUSTOM_WEEKLY_ACTIVE_CAP = 6;

export const DEFAULT_CUSTOM_WEEKLY_TARGET = 3;

export type CustomWeeklyGoalView = {
  id: string;
  name: string;
  targetCount: number;
  progressCount: number;
  done: number;
  total: number;
  pace: {
    label: WeeklyPaceLabel;
    amount: number;
    expected: number;
    fractionElapsed: number;
  };
  metWeeksStreak: number;
  archived: boolean;
};

export type CustomWeeklyGoalsBundle = {
  active: CustomWeeklyGoalView[];
  archived: CustomWeeklyGoalView[];
};

export type CustomWeeklyGoalRecord = {
  weekStart: string;
  goalId: string;
  target: number;
  done: number;
  met: boolean;
  points: number;
  flatBonusPaidBefore: boolean;
  closedAt: string;
};

export function normalizeWeeklyGoalName(raw: unknown): string {
  if (typeof raw !== "string") {
    throw Object.assign(new Error("name is required"), { status: 400 });
  }
  const name = raw.trim();
  if (!name) {
    throw Object.assign(new Error("name is required"), { status: 400 });
  }
  if (name.length > 50) {
    throw Object.assign(new Error("name must be at most 50 characters"), { status: 400 });
  }
  return name;
}

export function normalizeTargetCount(raw: unknown): number {
  if (typeof raw !== "number" || !Number.isInteger(raw) || raw < 1) {
    throw Object.assign(new Error("targetCount must be a positive integer"), { status: 400 });
  }
  return raw;
}

async function lockActiveCustoms(db: PoolClient): Promise<number> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM custom_weekly_goals WHERE archived_at IS NULL ORDER BY created_at ASC FOR UPDATE`,
  );
  return rows.length;
}

async function requireGoal(
  db: Queryable,
  goalId: string,
): Promise<{ id: string; name: string; targetCount: number; archived: boolean }> {
  const { rows } = await db.query<{
    id: string;
    name: string;
    target_count: number;
    archived_at: Date | null;
  }>(
    `SELECT id, name, target_count, archived_at FROM custom_weekly_goals WHERE id = $1::uuid`,
    [goalId],
  );
  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error("Custom weekly goal not found"), { status: 404 });
  }
  return {
    id: row.id,
    name: row.name,
    targetCount: row.target_count,
    archived: row.archived_at != null,
  };
}

async function ensureWeekProgress(
  db: Queryable,
  goalId: string,
  weekStart: string,
): Promise<number> {
  await db.query(
    `INSERT INTO custom_weekly_goal_weeks (goal_id, week_start, progress_count)
     VALUES ($1::uuid, $2::date, 0)
     ON CONFLICT (goal_id, week_start) DO NOTHING`,
    [goalId, weekStart],
  );
  const { rows } = await db.query<{ progress_count: number }>(
    `SELECT progress_count FROM custom_weekly_goal_weeks
     WHERE goal_id = $1::uuid AND week_start = $2::date`,
    [goalId, weekStart],
  );
  return rows[0]?.progress_count ?? 0;
}

/** R3.9: consecutive met closed weeks per custom goal, from the last closed week back. */
export async function customMetWeeksStreaks(
  db: Queryable,
): Promise<Record<string, number>> {
  const { rows } = await db.query<{ goal_id: string; streak: number }>(
    `WITH ranked AS (
       SELECT goal_id, met, week_start,
              MAX(week_start) OVER (PARTITION BY goal_id) AS last_week,
              ROW_NUMBER() OVER (PARTITION BY goal_id ORDER BY week_start DESC) - 1 AS back
       FROM custom_weekly_goal_records
     ),
     first_break AS (
       SELECT goal_id, MIN(back) AS back
       FROM ranked
       WHERE NOT met OR week_start <> last_week - (back * 7)::int
       GROUP BY goal_id
     )
     SELECT r.goal_id, COALESCE(MIN(b.back), COUNT(*))::int AS streak
     FROM ranked r
     LEFT JOIN first_break b ON b.goal_id = r.goal_id
     GROUP BY r.goal_id`,
  );
  const out: Record<string, number> = {};
  for (const r of rows) out[r.goal_id] = r.streak;
  return out;
}

function toView(
  row: { id: string; name: string; targetCount: number; archived: boolean },
  progressCount: number,
  fractionElapsed: number,
  metWeeksStreak: number,
): CustomWeeklyGoalView {
  const total = row.targetCount;
  const done = progressCount;
  return {
    id: row.id,
    name: row.name,
    targetCount: row.targetCount,
    progressCount,
    done,
    total,
    pace: computePace(done, total, fractionElapsed),
    metWeeksStreak,
    archived: row.archived,
  };
}

export async function listCustomWeeklyGoals(
  db: Queryable,
  tz: string,
  now = new Date(),
): Promise<CustomWeeklyGoalsBundle> {
  if (!isValidTimezone(tz)) {
    return { active: [], archived: [] };
  }
  const weekStart = mondayOfLocalWeek(now, tz);
  const fraction = weekElapsedFraction(now, weekStart, tz);
  const streaks = await customMetWeeksStreaks(db);
  const { rows } = await db.query<{
    id: string;
    name: string;
    target_count: number;
    archived_at: Date | null;
    progress_count: number | null;
  }>(
    `SELECT g.id, g.name, g.target_count, g.archived_at, w.progress_count
     FROM custom_weekly_goals g
     LEFT JOIN custom_weekly_goal_weeks w
       ON w.goal_id = g.id AND w.week_start = $1::date
     ORDER BY g.created_at ASC`,
    [weekStart],
  );

  const active: CustomWeeklyGoalView[] = [];
  const archived: CustomWeeklyGoalView[] = [];
  for (const r of rows) {
    const view = toView(
      {
        id: r.id,
        name: r.name,
        targetCount: r.target_count,
        archived: r.archived_at != null,
      },
      r.progress_count ?? 0,
      fraction,
      streaks[r.id] ?? 0,
    );
    if (view.archived) archived.push(view);
    else active.push(view);
  }
  return { active, archived };
}

export async function createCustomWeeklyGoal(
  pool: Pool,
  tz: string,
  input: { name?: unknown; targetCount?: unknown },
  now = new Date(),
): Promise<CustomWeeklyGoalView> {
  if (!isValidTimezone(tz)) {
    throw Object.assign(new Error("Invalid timezone"), { status: 400 });
  }
  const name = normalizeWeeklyGoalName(input.name);
  const targetCount =
    input.targetCount === undefined
      ? DEFAULT_CUSTOM_WEEKLY_TARGET
      : normalizeTargetCount(input.targetCount);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const activeCount = await lockActiveCustoms(client);
    if (activeCount >= CUSTOM_WEEKLY_ACTIVE_CAP) {
      throw Object.assign(
        new Error(
          `At most ${CUSTOM_WEEKLY_ACTIVE_CAP} active custom weekly goals (archive one to create another)`,
        ),
        { status: 400 },
      );
    }
    const { rows } = await client.query<{ id: string; name: string; target_count: number }>(
      `INSERT INTO custom_weekly_goals (name, target_count, created_at)
       VALUES ($1, $2, $3)
       RETURNING id, name, target_count`,
      [name, targetCount, now],
    );
    const row = rows[0]!;
    const weekStart = mondayOfLocalWeek(now, tz);
    await ensureWeekProgress(client, row.id, weekStart);
    await client.query("COMMIT");
    const fraction = weekElapsedFraction(now, weekStart, tz);
    return toView(
      { id: row.id, name: row.name, targetCount: row.target_count, archived: false },
      0,
      fraction,
      0,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function renameCustomWeeklyGoal(
  pool: Pool,
  goalId: string,
  tz: string,
  rawName: unknown,
  now = new Date(),
): Promise<CustomWeeklyGoalView> {
  if (!isValidTimezone(tz)) {
    throw Object.assign(new Error("Invalid timezone"), { status: 400 });
  }
  const name = normalizeWeeklyGoalName(rawName);
  await requireGoal(pool, goalId);
  const { rows } = await pool.query<{
    id: string;
    name: string;
    target_count: number;
    archived_at: Date | null;
  }>(
    `UPDATE custom_weekly_goals SET name = $2 WHERE id = $1::uuid
     RETURNING id, name, target_count, archived_at`,
    [goalId, name],
  );
  const row = rows[0]!;
  const weekStart = mondayOfLocalWeek(now, tz);
  const progress = await ensureWeekProgress(pool, row.id, weekStart);
  const streaks = await customMetWeeksStreaks(pool);
  return toView(
    {
      id: row.id,
      name: row.name,
      targetCount: row.target_count,
      archived: row.archived_at != null,
    },
    progress,
    weekElapsedFraction(now, weekStart, tz),
    streaks[row.id] ?? 0,
  );
}

export async function patchCustomWeeklyTarget(
  pool: Pool,
  goalId: string,
  tz: string,
  rawTarget: unknown,
  now = new Date(),
): Promise<CustomWeeklyGoalView> {
  if (!isValidTimezone(tz)) {
    throw Object.assign(new Error("Invalid timezone"), { status: 400 });
  }
  const targetCount = normalizeTargetCount(rawTarget);
  const goal = await requireGoal(pool, goalId);
  if (goal.archived) {
    throw Object.assign(new Error("Archived goals cannot change target"), { status: 400 });
  }
  const { rows } = await pool.query<{
    id: string;
    name: string;
    target_count: number;
    archived_at: Date | null;
  }>(
    `UPDATE custom_weekly_goals SET target_count = $2 WHERE id = $1::uuid
     RETURNING id, name, target_count, archived_at`,
    [goalId, targetCount],
  );
  const row = rows[0]!;
  const weekStart = mondayOfLocalWeek(now, tz);
  const progress = await ensureWeekProgress(pool, row.id, weekStart);
  const streaks = await customMetWeeksStreaks(pool);
  return toView(
    {
      id: row.id,
      name: row.name,
      targetCount: row.target_count,
      archived: row.archived_at != null,
    },
    progress,
    weekElapsedFraction(now, weekStart, tz),
    streaks[row.id] ?? 0,
  );
}

export async function archiveCustomWeeklyGoal(
  pool: Pool,
  goalId: string,
  tz: string,
  now = new Date(),
): Promise<CustomWeeklyGoalView> {
  if (!isValidTimezone(tz)) {
    throw Object.assign(new Error("Invalid timezone"), { status: 400 });
  }
  const goal = await requireGoal(pool, goalId);
  if (!goal.archived) {
    await pool.query(`UPDATE custom_weekly_goals SET archived_at = now() WHERE id = $1::uuid`, [
      goalId,
    ]);
  }
  const weekStart = mondayOfLocalWeek(now, tz);
  const progress = await ensureWeekProgress(pool, goalId, weekStart);
  const streaks = await customMetWeeksStreaks(pool);
  const updated = await requireGoal(pool, goalId);
  return toView(
    updated,
    progress,
    weekElapsedFraction(now, weekStart, tz),
    streaks[goalId] ?? 0,
  );
}

export async function restoreCustomWeeklyGoal(
  pool: Pool,
  goalId: string,
  tz: string,
  now = new Date(),
): Promise<CustomWeeklyGoalView> {
  if (!isValidTimezone(tz)) {
    throw Object.assign(new Error("Invalid timezone"), { status: 400 });
  }
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: found } = await client.query<{
      id: string;
      name: string;
      target_count: number;
      archived_at: Date | null;
    }>(
      `SELECT id, name, target_count, archived_at FROM custom_weekly_goals
       WHERE id = $1::uuid FOR UPDATE`,
      [goalId],
    );
    const row = found[0];
    if (!row) {
      throw Object.assign(new Error("Custom weekly goal not found"), { status: 404 });
    }
    if (row.archived_at == null) {
      await client.query("COMMIT");
      const weekStart = mondayOfLocalWeek(now, tz);
      const progress = await ensureWeekProgress(pool, row.id, weekStart);
      const streaks = await customMetWeeksStreaks(pool);
      return toView(
        {
          id: row.id,
          name: row.name,
          targetCount: row.target_count,
          archived: false,
        },
        progress,
        weekElapsedFraction(now, weekStart, tz),
        streaks[row.id] ?? 0,
      );
    }

    const activeCount = await lockActiveCustoms(client);
    if (activeCount >= CUSTOM_WEEKLY_ACTIVE_CAP) {
      throw Object.assign(
        new Error(
          `At most ${CUSTOM_WEEKLY_ACTIVE_CAP} active custom weekly goals (archive one to restore another)`,
        ),
        { status: 400 },
      );
    }

    await client.query(`UPDATE custom_weekly_goals SET archived_at = NULL WHERE id = $1::uuid`, [
      goalId,
    ]);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }

  const weekStart = mondayOfLocalWeek(now, tz);
  const progress = await ensureWeekProgress(pool, goalId, weekStart);
  const streaks = await customMetWeeksStreaks(pool);
  const updated = await requireGoal(pool, goalId);
  return toView(
    updated,
    progress,
    weekElapsedFraction(now, weekStart, tz),
    streaks[goalId] ?? 0,
  );
}

/**
 * ± current-week progress for an active custom. Matches LC weekly: − at 0 → 409.
 * Overflow past target is allowed (R5.14 pattern).
 */
export async function stepCustomWeeklyProgress(
  pool: Pool,
  goalId: string,
  tz: string,
  delta: unknown,
  now = new Date(),
): Promise<CustomWeeklyGoalView> {
  if (!isValidTimezone(tz)) {
    throw Object.assign(new Error("Invalid timezone"), { status: 400 });
  }
  if (delta !== 1 && delta !== -1) {
    throw Object.assign(new Error("delta must be 1 or -1"), { status: 400 });
  }

  const { closeDueWeeks } = await import("./weeklyGoals.js");
  await closeDueWeeks(pool, tz, now);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: found } = await client.query<{
      id: string;
      name: string;
      target_count: number;
      archived_at: Date | null;
    }>(
      `SELECT id, name, target_count, archived_at FROM custom_weekly_goals
       WHERE id = $1::uuid FOR UPDATE`,
      [goalId],
    );
    const goal = found[0];
    if (!goal) {
      throw Object.assign(new Error("Custom weekly goal not found"), { status: 404 });
    }
    if (goal.archived_at != null) {
      throw Object.assign(new Error("Archived goals cannot change progress"), { status: 400 });
    }

    const weekStart = mondayOfLocalWeek(now, tz);
    await ensureWeekProgress(client, goalId, weekStart);
    const { rows: weekRows } = await client.query<{ progress_count: number }>(
      `SELECT progress_count FROM custom_weekly_goal_weeks
       WHERE goal_id = $1::uuid AND week_start = $2::date
       FOR UPDATE`,
      [goalId, weekStart],
    );
    const progress = weekRows[0]?.progress_count ?? 0;
    if (delta < 0 && progress <= 0) {
      throw Object.assign(new Error("No progress to remove this week"), { status: 409 });
    }
    const next = progress + delta;
    await client.query(
      `UPDATE custom_weekly_goal_weeks SET progress_count = $3
       WHERE goal_id = $1::uuid AND week_start = $2::date`,
      [goalId, weekStart, next],
    );
    await client.query("COMMIT");

    const streaks = await customMetWeeksStreaks(pool);
    return toView(
      {
        id: goal.id,
        name: goal.name,
        targetCount: goal.target_count,
        archived: false,
      },
      next,
      weekElapsedFraction(now, weekStart, tz),
      streaks[goalId] ?? 0,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close one week of custom goals (called from apps/LC week close). Points at close only.
 */
export async function closeCustomWeeklyWeek(
  db: Queryable,
  weekStart: string,
): Promise<CustomWeeklyGoalRecord[]> {
  const { rows: goals } = await db.query<{
    id: string;
    name: string;
    target_count: number;
    progress_count: number | null;
    created_at: Date;
  }>(
    `SELECT g.id, g.name, g.target_count, w.progress_count, g.created_at
     FROM custom_weekly_goals g
     LEFT JOIN custom_weekly_goal_weeks w
       ON w.goal_id = g.id AND w.week_start = $1::date
     WHERE g.created_at < ($1::date + INTERVAL '7 days')`,
    [weekStart],
  );

  const records: CustomWeeklyGoalRecord[] = [];
  for (const g of goals) {
    const target = g.target_count;
    const done = g.progress_count ?? 0;
    const met = target > 0 && done >= target;
    const points = weeklyRecordPoints(done, met);
    const sourceId = weeklyGoalSourceIdCustom(weekStart, g.id);
    const flatEarn = await findEarnEvent(db, "weekly_goal", sourceId);
    const flatBonusPaidBefore = flatEarn != null && effectiveEarnAmount(flatEarn) > 0;

    const inserted = await db.query<{ closed_at: Date }>(
      `INSERT INTO custom_weekly_goal_records
         (goal_id, week_start, target, done, met, points, flat_bonus_paid_before)
       VALUES ($1::uuid, $2::date, $3, $4, $5, $6, $7)
       ON CONFLICT (goal_id, week_start) DO NOTHING
       RETURNING closed_at`,
      [g.id, weekStart, target, done, met, points, flatBonusPaidBefore],
    );
    if (!inserted.rows[0]) continue;

    const bonusDue = met && !flatBonusPaidBefore;
    const unitPoints = done * POINTS.weeklyGoalPerUnit;
    const amount = unitPoints + (bonusDue ? POINTS.weeklyGoalBonus : 0);
    if (amount > 0) {
      await recordEarn(db, {
        category: "weekly_goal",
        amount,
        message: `${weekLabel(weekStart)} · ${g.name} ${done}/${target} · +${amount} points`,
        sourceType: "weekly_record",
        sourceId,
        breakdown: [
          ...(unitPoints > 0
            ? [
                {
                  category: "weekly_goal" as const,
                  amount: unitPoints,
                  label: `${done} × ${POINTS.weeklyGoalPerUnit}`,
                },
              ]
            : []),
          ...(bonusDue
            ? [
                {
                  category: "weekly_goal" as const,
                  amount: POINTS.weeklyGoalBonus,
                  label: "target met",
                },
              ]
            : []),
        ],
        meta: {
          week_start: weekStart,
          custom_weekly_goal_id: g.id,
          target,
          done,
          met,
        },
      });
    }
    records.push({
      weekStart,
      goalId: g.id,
      target,
      done,
      met,
      points,
      flatBonusPaidBefore,
      closedAt: inserted.rows[0].closed_at.toISOString(),
    });
  }
  return records;
}
