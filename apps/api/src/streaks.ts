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
  const label = KIND_LABEL[kind];
  const dailySourceType = "streak_daily";
  const dailySourceId = `${kind}:${localDate}`;
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
        `${kind}:${streakStart}:${length}`,
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
        `${kind}:${streakStart}:${lengthWas}`,
        `${label} streak ${lengthWas}-day milestone cleared · −${POINTS.streakMilestonePerLength * lengthWas} points`,
      );
    }
  }
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
