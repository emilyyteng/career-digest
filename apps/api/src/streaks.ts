import type { Pool, PoolClient } from "pg";
import { addCivilDays } from "./homeUpcoming.js";
import {
  POINTS,
  streakDailyPoints,
  streakMilestonePoints,
} from "./pointsFormulas.js";
import {
  findEarnEvent,
  recordEarn,
  reinstateEarn,
  reverseEarn,
} from "./pointsLedger.js";
import { localDateInTimezone } from "./progress.js";

type Queryable = Pool | PoolClient;

export type StreakKind = "lc" | "apps";

export type StreakView = {
  length: number;
  /** True when today already has a qualifying action. */
  todayCounts: boolean;
};

export type StreaksSnapshot = {
  tz: string;
  localDate: string;
  launchDate: string;
  lc: StreakView;
  apps: StreakView;
};

const KIND_LABEL: Record<StreakKind, string> = { lc: "LC", apps: "Apps" };

/** Ledger source_id prefix for custom daily habits (distinct from `lc:` / `apps:`). */
export function habitDailySourceId(habitId: string, localDate: string): string {
  return `habit:${habitId}:${localDate}`;
}

export function habitMilestoneSourceId(
  habitId: string,
  streakStart: string,
  length: number,
): string {
  return `habit:${habitId}:${streakStart}:${length}`;
}

/**
 * Current streak ending on `today`. If today isn't qualifying yet, the run
 * through yesterday still counts (today doesn't break the streak until it ends).
 */
export function currentStreak(qualifyingDays: Set<string>, today: string): StreakView {
  const todayCounts = qualifyingDays.has(today);
  let cursor = todayCounts ? today : addCivilDays(today, -1);
  if (!qualifyingDays.has(cursor)) return { length: 0, todayCounts };
  let length = 0;
  while (qualifyingDays.has(cursor)) {
    length += 1;
    cursor = addCivilDays(cursor, -1);
  }
  return { length, todayCounts };
}

export async function ensureStreakLaunch(db: Queryable, today: string): Promise<string> {
  const existing = await db.query<{ launch_date: string }>(
    `SELECT launch_date::text AS launch_date FROM streak_state WHERE singleton = true`,
  );
  if (existing.rows[0]) return existing.rows[0].launch_date;
  await db.query(
    `INSERT INTO streak_state (singleton, launch_date) VALUES (true, $1::date)
     ON CONFLICT (singleton) DO NOTHING`,
    [today],
  );
  const again = await db.query<{ launch_date: string }>(
    `SELECT launch_date::text AS launch_date FROM streak_state WHERE singleton = true`,
  );
  return again.rows[0]?.launch_date ?? today;
}

async function lcQualifyingDays(db: Queryable): Promise<Set<string>> {
  const { rows } = await db.query<{ d: string }>(
    `SELECT local_date::text AS d FROM leetcode_daily WHERE count > 0`,
  );
  return new Set(rows.map((r) => r.d));
}

async function appsQualifyingDays(db: Queryable, tz: string): Promise<Set<string>> {
  const { rows } = await db.query<{ d: string }>(
    `SELECT DISTINCT ((applied_at AT TIME ZONE $1)::date)::text AS d
     FROM applications
     WHERE applied_at IS NOT NULL AND status <> 'todo'`,
    [tz],
  );
  return new Set(rows.map((r) => r.d));
}

async function qualifyingDays(
  db: Queryable,
  kind: StreakKind,
  tz: string,
): Promise<Set<string>> {
  return kind === "lc" ? lcQualifyingDays(db) : appsQualifyingDays(db, tz);
}

export async function habitQualifyingDays(
  db: Queryable,
  habitId: string,
): Promise<Set<string>> {
  const { rows } = await db.query<{ d: string }>(
    `SELECT local_date::text AS d FROM custom_habit_days WHERE habit_id = $1::uuid`,
    [habitId],
  );
  return new Set(rows.map((r) => r.d));
}

function signedPoints(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

async function ensureEarn(
  db: Queryable,
  sourceType: string,
  sourceId: string,
  amount: number,
  label: string,
): Promise<void> {
  const existing = await findEarnEvent(db, sourceType, sourceId);
  if (!existing) {
    if (amount <= 0) return;
    await recordEarn(db, {
      category: "streak",
      amount,
      message: `${label} · +${amount} points`,
      sourceType,
      sourceId,
      breakdown: [{ category: "streak", amount, label: "streak" }],
    });
    return;
  }
  if (existing.meta.superseded === true) {
    if (amount <= 0) return;
    await reinstateEarn(db, sourceType, sourceId, amount, (delta) =>
      `${label} · ${signedPoints(delta)} points`,
    );
  }
}

async function syncStreakPointsForDay(
  db: Queryable,
  opts: {
    label: string;
    dailySourceId: string;
    milestoneSourceId: (streakStart: string, length: number) => string;
    days: Set<string>;
    localDate: string;
    qualifies: boolean;
    today: string;
  },
): Promise<void> {
  const {
    label,
    dailySourceId,
    milestoneSourceId,
    days,
    localDate,
    qualifies,
    today,
  } = opts;
  const dailySourceType = "streak_daily";
  const milestoneSourceType = "streak_milestone";

  if (qualifies) {
    // Count with today (already in `days` when the write committed first).
    days.add(localDate);
    const { length } = currentStreak(days, today);
    if (length <= 0) return;
    const streakStart = addCivilDays(today, -(length - 1));
    await ensureEarn(
      db,
      dailySourceType,
      dailySourceId,
      streakDailyPoints(length),
      `${label} streak day ${length}`,
    );
    const milestone = streakMilestonePoints(length);
    if (milestone != null) {
      await ensureEarn(
        db,
        milestoneSourceType,
        milestoneSourceId(streakStart, length),
        milestone,
        `${label} streak ${length}-day milestone`,
      );
    }
    return;
  }

  // Undo today: reverse today's daily, and the milestone this day completed, if any.
  const withToday = new Set(days);
  withToday.add(localDate);
  const { length: lengthWas } = currentStreak(withToday, today);
  if (lengthWas > 0) {
    const streakStart = addCivilDays(today, -(lengthWas - 1));
    await reverseEarn(
      db,
      dailySourceType,
      dailySourceId,
      `${label} streak day ${lengthWas} cleared · −${streakDailyPoints(lengthWas)} points`,
    );
    if (streakMilestonePoints(lengthWas) != null) {
      await reverseEarn(
        db,
        milestoneSourceType,
        milestoneSourceId(streakStart, lengthWas),
        `${label} streak ${lengthWas}-day milestone cleared · −${POINTS.streakMilestonePerLength * lengthWas} points`,
      );
    }
  }
}

/**
 * Award or reverse today's streak points after a qualifying day flips on or off.
 * Past-day edits (History) only change the displayed streak — no points (R5.25).
 */
export async function syncStreakForDay(
  db: Queryable,
  kind: StreakKind,
  tz: string,
  localDate: string,
  qualifies: boolean,
  now = new Date(),
): Promise<void> {
  const today = localDateInTimezone(now, tz);
  if (localDate !== today) return;

  const launchDate = await ensureStreakLaunch(db, today);
  if (localDate < launchDate) return;

  const days = await qualifyingDays(db, kind, tz);
  await syncStreakPointsForDay(db, {
    label: KIND_LABEL[kind],
    dailySourceId: `${kind}:${localDate}`,
    milestoneSourceId: (streakStart, length) => `${kind}:${streakStart}:${length}`,
    days,
    localDate,
    qualifies,
    today,
  });
}

type HabitRow = { name: string; archived: boolean };

async function loadHabit(
  db: Queryable,
  habitId: string,
): Promise<HabitRow | null> {
  const { rows } = await db.query<{ name: string; archived_at: Date | null }>(
    `SELECT name, archived_at FROM custom_habits WHERE id = $1::uuid`,
    [habitId],
  );
  const row = rows[0];
  if (!row) return null;
  return { name: row.name, archived: row.archived_at != null };
}

/**
 * Award or reverse today's streak points for a custom habit checkoff.
 * Past local dates: no points (R1.7). Archived habits: no award/reverse —
 * ledger stays as paid if archived mid-day after a checkoff (R1.6).
 */
export async function syncHabitStreakForDay(
  db: Queryable,
  habitId: string,
  tz: string,
  localDate: string,
  qualifies: boolean,
  now = new Date(),
): Promise<void> {
  const today = localDateInTimezone(now, tz);
  if (localDate !== today) return;

  const habit = await loadHabit(db, habitId);
  if (!habit || habit.archived) return;

  const launchDate = await ensureStreakLaunch(db, today);
  if (localDate < launchDate) return;

  const days = await habitQualifyingDays(db, habitId);
  await syncStreakPointsForDay(db, {
    label: habit.name,
    dailySourceId: habitDailySourceId(habitId, localDate),
    milestoneSourceId: (streakStart, length) =>
      habitMilestoneSourceId(habitId, streakStart, length),
    days,
    localDate,
    qualifies,
    today,
  });
}

/**
 * Insert or remove a habit checkoff day, then sync streak points when the date
 * is today and the habit is active. Past dates update history only (no points).
 */
export async function setHabitCheckoff(
  db: Queryable,
  habitId: string,
  tz: string,
  localDate: string,
  checked: boolean,
  now = new Date(),
): Promise<StreakView> {
  const habit = await loadHabit(db, habitId);
  if (!habit) {
    throw new Error(`custom habit not found: ${habitId}`);
  }

  if (checked) {
    await db.query(
      `INSERT INTO custom_habit_days (habit_id, local_date)
       VALUES ($1::uuid, $2::date)
       ON CONFLICT (habit_id, local_date) DO NOTHING`,
      [habitId, localDate],
    );
  } else {
    await db.query(
      `DELETE FROM custom_habit_days
       WHERE habit_id = $1::uuid AND local_date = $2::date`,
      [habitId, localDate],
    );
  }

  await syncHabitStreakForDay(db, habitId, tz, localDate, checked, now);
  return getHabitStreak(db, habitId, tz, now);
}

export async function getHabitStreak(
  db: Queryable,
  habitId: string,
  tz: string,
  now = new Date(),
): Promise<StreakView> {
  const localDate = localDateInTimezone(now, tz);
  const days = await habitQualifyingDays(db, habitId);
  return currentStreak(days, localDate);
}

export async function getStreaks(
  pool: Pool,
  tz: string,
  now = new Date(),
): Promise<StreaksSnapshot> {
  const localDate = localDateInTimezone(now, tz);
  const launchDate = await ensureStreakLaunch(pool, localDate);
  const [lcDays, appsDays] = await Promise.all([
    lcQualifyingDays(pool),
    appsQualifyingDays(pool, tz),
  ]);
  return {
    tz,
    localDate,
    launchDate,
    lc: currentStreak(lcDays, localDate),
    apps: currentStreak(appsDays, localDate),
  };
}
