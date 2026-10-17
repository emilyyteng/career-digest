import type { Pool, PoolClient } from "pg";
import type { PointsEarnInfo } from "./pointsLedger.js";
import { localDateInTimezone } from "./progress.js";
import {
  currentStreak,
  getHabitStreak,
  habitQualifyingDays,
  setHabitCheckoff,
  type StreakView,
} from "./streaks.js";

type Queryable = Pool | PoolClient;

/** Active custom daily habits cap (R.7). Apps + LC always sit beside customs. */
export const CUSTOM_HABIT_ACTIVE_CAP = 6;

export type CustomHabitView = {
  id: string;
  name: string;
  length: number;
  todayCounts: boolean;
  archived: boolean;
};

export type CustomHabitCheckoffResult = CustomHabitView & {
  /** Streak earn flash payload when today was checked off and points paid. */
  points: PointsEarnInfo | null;
};

export type CustomHabitsSnapshot = {
  active: CustomHabitView[];
  archived: CustomHabitView[];
};

export function normalizeHabitName(raw: unknown): string {
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

async function lockActiveHabits(db: PoolClient): Promise<number> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM custom_habits WHERE archived_at IS NULL ORDER BY created_at ASC FOR UPDATE`,
  );
  return rows.length;
}

async function requireHabit(
  db: Queryable,
  habitId: string,
): Promise<{ id: string; name: string; archived: boolean }> {
  const { rows } = await db.query<{
    id: string;
    name: string;
    archived_at: Date | null;
  }>(`SELECT id, name, archived_at FROM custom_habits WHERE id = $1::uuid`, [habitId]);
  const row = rows[0];
  if (!row) {
    throw Object.assign(new Error("Habit not found"), { status: 404 });
  }
  return { id: row.id, name: row.name, archived: row.archived_at != null };
}

async function toView(
  db: Queryable,
  habit: { id: string; name: string; archived: boolean },
  tz: string,
  now: Date,
): Promise<CustomHabitView> {
  const streak = await getHabitStreak(db, habit.id, tz, now);
  return {
    id: habit.id,
    name: habit.name,
    length: streak.length,
    todayCounts: streak.todayCounts,
    archived: habit.archived,
  };
}

export async function listCustomHabits(
  db: Queryable,
  tz: string,
  now = new Date(),
): Promise<CustomHabitsSnapshot> {
  const localDate = localDateInTimezone(now, tz);
  const { rows } = await db.query<{
    id: string;
    name: string;
    archived_at: Date | null;
  }>(
    `SELECT id, name, archived_at
     FROM custom_habits
     ORDER BY created_at ASC`,
  );

  const active: CustomHabitView[] = [];
  const archived: CustomHabitView[] = [];

  for (const row of rows) {
    const days = await habitQualifyingDays(db, row.id);
    const streak: StreakView = currentStreak(days, localDate);
    const view: CustomHabitView = {
      id: row.id,
      name: row.name,
      length: streak.length,
      todayCounts: streak.todayCounts,
      archived: row.archived_at != null,
    };
    if (view.archived) archived.push(view);
    else active.push(view);
  }

  return { active, archived };
}

export async function createCustomHabit(
  pool: Pool,
  tz: string,
  rawName: unknown,
  now = new Date(),
): Promise<CustomHabitView> {
  const name = normalizeHabitName(rawName);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const activeCount = await lockActiveHabits(client);
    if (activeCount >= CUSTOM_HABIT_ACTIVE_CAP) {
      throw Object.assign(
        new Error(
          `At most ${CUSTOM_HABIT_ACTIVE_CAP} active custom habits (archive one to create another)`,
        ),
        { status: 400 },
      );
    }
    const { rows } = await client.query<{ id: string; name: string }>(
      `INSERT INTO custom_habits (name) VALUES ($1) RETURNING id, name`,
      [name],
    );
    await client.query("COMMIT");
    return toView(pool, { id: rows[0]!.id, name: rows[0]!.name, archived: false }, tz, now);
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function renameCustomHabit(
  pool: Pool,
  habitId: string,
  tz: string,
  rawName: unknown,
  now = new Date(),
): Promise<CustomHabitView> {
  const name = normalizeHabitName(rawName);
  await requireHabit(pool, habitId);
  const { rows } = await pool.query<{ id: string; name: string; archived_at: Date | null }>(
    `UPDATE custom_habits SET name = $2 WHERE id = $1::uuid
     RETURNING id, name, archived_at`,
    [habitId, name],
  );
  const row = rows[0]!;
  return toView(
    pool,
    { id: row.id, name: row.name, archived: row.archived_at != null },
    tz,
    now,
  );
}

export async function archiveCustomHabit(
  pool: Pool,
  habitId: string,
  tz: string,
  now = new Date(),
): Promise<CustomHabitView> {
  const habit = await requireHabit(pool, habitId);
  if (habit.archived) {
    return toView(pool, habit, tz, now);
  }
  const { rows } = await pool.query<{ id: string; name: string; archived_at: Date | null }>(
    `UPDATE custom_habits SET archived_at = now() WHERE id = $1::uuid
     RETURNING id, name, archived_at`,
    [habitId],
  );
  const row = rows[0]!;
  return toView(
    pool,
    { id: row.id, name: row.name, archived: row.archived_at != null },
    tz,
    now,
  );
}

export async function restoreCustomHabit(
  pool: Pool,
  habitId: string,
  tz: string,
  now = new Date(),
): Promise<CustomHabitView> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const { rows: found } = await client.query<{
      id: string;
      name: string;
      archived_at: Date | null;
    }>(`SELECT id, name, archived_at FROM custom_habits WHERE id = $1::uuid FOR UPDATE`, [
      habitId,
    ]);
    const row = found[0];
    if (!row) {
      throw Object.assign(new Error("Habit not found"), { status: 404 });
    }
    if (row.archived_at == null) {
      await client.query("COMMIT");
      return toView(pool, { id: row.id, name: row.name, archived: false }, tz, now);
    }

    const activeCount = await lockActiveHabits(client);
    if (activeCount >= CUSTOM_HABIT_ACTIVE_CAP) {
      throw Object.assign(
        new Error(
          `At most ${CUSTOM_HABIT_ACTIVE_CAP} active custom habits (archive one to restore another)`,
        ),
        { status: 400 },
      );
    }

    const { rows } = await client.query<{ id: string; name: string; archived_at: Date | null }>(
      `UPDATE custom_habits SET archived_at = NULL WHERE id = $1::uuid
       RETURNING id, name, archived_at`,
      [habitId],
    );
    await client.query("COMMIT");
    const updated = rows[0]!;
    return toView(
      pool,
      { id: updated.id, name: updated.name, archived: updated.archived_at != null },
      tz,
      now,
    );
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Check off or undo today's checkoff only (R1.5, R1.7). Past dates are rejected.
 */
export async function setCustomHabitTodayCheckoff(
  pool: Pool,
  habitId: string,
  tz: string,
  checked: unknown,
  now = new Date(),
): Promise<CustomHabitCheckoffResult> {
  if (typeof checked !== "boolean") {
    throw Object.assign(new Error("checked must be a boolean"), { status: 400 });
  }
  const habit = await requireHabit(pool, habitId);
  if (habit.archived) {
    throw Object.assign(new Error("Archived habits cannot be checked off"), { status: 400 });
  }
  const today = localDateInTimezone(now, tz);
  const { streak, points } = await setHabitCheckoff(
    pool,
    habitId,
    tz,
    today,
    checked,
    now,
  );
  return {
    id: habit.id,
    name: habit.name,
    length: streak.length,
    todayCounts: streak.todayCounts,
    archived: habit.archived,
    points,
  };
}
