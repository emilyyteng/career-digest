/**
 * Progress Lifetime accumulation record (F08 M8-05 / R8.12–R8.14).
 */
import type { Pool } from "pg";
import { addCivilDays } from "./homeUpcoming.js";
import { getLifetimeEarned } from "./pointsLedger.js";
import { localDateInTimezone } from "./progress.js";

export type LifetimeTotals = {
  leetcode: number;
  apps: number;
  minutes: number;
  seedsEarned: number;
  tasks: number;
  interviews: number;
  reflections: number;
  /** Distinct local days with any completions-diary-style row (R8.12). */
  daysWorked: number;
};

export type SeedsActivityDay = {
  date: string;
  seeds: number;
};

export type LifetimeSnapshot = {
  tz: string;
  localDate: string;
  totals: LifetimeTotals;
  /** Inclusive daily seeds for the requested window ending today (zeros filled). */
  activity: SeedsActivityDay[];
  activityDays: number;
};

function dateRangeInclusive(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  for (let cursor = startDate; cursor <= endDate; cursor = addCivilDays(cursor, 1)) {
    out.push(cursor);
  }
  return out;
}

export async function getLifetimeSnapshot(
  pool: Pool,
  tz: string,
  opts: { activityDays?: number } = {},
): Promise<LifetimeSnapshot> {
  const activityDays = Math.min(Math.max(opts.activityDays ?? 30, 1), 366);
  const localDate = localDateInTimezone(new Date(), tz);
  const activityStart = addCivilDays(localDate, -(activityDays - 1));

  const [
    seedsEarned,
    lcRow,
    appRow,
    taskRow,
    interviewRow,
    reflectionRow,
    minutesRow,
    daysWorkedRow,
    activityRows,
  ] = await Promise.all([
    getLifetimeEarned(pool),
    pool.query<{ n: string }>(
      `SELECT COALESCE(SUM(count), 0)::text AS n FROM leetcode_daily`,
    ),
    pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM applications
       WHERE status <> 'todo' AND applied_at IS NOT NULL`,
    ),
    pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM tasks
       WHERE status = 'completed' AND category = 'misc'`,
    ),
    pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM application_steps
       WHERE status IN ('completed', 'awaiting_employer') AND completed_at IS NOT NULL`,
    ),
    pool.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM reflection_logs`),
    pool.query<{ mins: string }>(
      `SELECT (
         COALESCE((SELECT SUM(actual_minutes) FROM tasks
                   WHERE status = 'completed' AND category = 'misc'), 0)
         + COALESCE((SELECT SUM(actual_minutes) FROM applications
                     WHERE status <> 'todo' AND applied_at IS NOT NULL), 0)
         + COALESCE((SELECT SUM(actual_minutes) FROM application_steps
                     WHERE status IN ('completed', 'awaiting_employer')
                       AND completed_at IS NOT NULL), 0)
       )::text AS mins`,
    ),
    pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM (
         SELECT (timezone($1, completed_at))::date AS d
         FROM tasks
         WHERE status = 'completed' AND category = 'misc' AND completed_at IS NOT NULL
         UNION
         SELECT (timezone($1, applied_at))::date
         FROM applications
         WHERE status <> 'todo' AND applied_at IS NOT NULL
         UNION
         SELECT (timezone($1, completed_at))::date
         FROM application_steps
         WHERE status IN ('completed', 'awaiting_employer') AND completed_at IS NOT NULL
         UNION
         SELECT (timezone($1, created_at))::date
         FROM reflection_logs
         UNION
         SELECT local_date
         FROM leetcode_daily
         WHERE count > 0
         UNION
         SELECT (timezone($1, closed_at))::date
         FROM weekly_goal_records
         WHERE closed_at IS NOT NULL
       ) days`,
      [tz],
    ),
    pool.query<{ d: string; seeds: string }>(
      `SELECT (timezone($1, created_at))::date::text AS d,
              COALESCE(SUM(amount), 0)::text AS seeds
       FROM points_events
       WHERE kind <> 'spend'
         AND (timezone($1, created_at))::date >= $2::date
         AND (timezone($1, created_at))::date <= $3::date
       GROUP BY 1
       ORDER BY 1`,
      [tz, activityStart, localDate],
    ),
  ]);

  const byDate = new Map(activityRows.rows.map((r) => [r.d, Number(r.seeds)]));
  const activity: SeedsActivityDay[] = dateRangeInclusive(activityStart, localDate).map(
    (date) => ({
      date,
      seeds: byDate.get(date) ?? 0,
    }),
  );

  return {
    tz,
    localDate,
    totals: {
      leetcode: Number(lcRow.rows[0]?.n ?? 0),
      apps: Number(appRow.rows[0]?.n ?? 0),
      minutes: Number(minutesRow.rows[0]?.mins ?? 0),
      seedsEarned,
      tasks: Number(taskRow.rows[0]?.n ?? 0),
      interviews: Number(interviewRow.rows[0]?.n ?? 0),
      reflections: Number(reflectionRow.rows[0]?.n ?? 0),
      daysWorked: Number(daysWorkedRow.rows[0]?.n ?? 0),
    },
    activity,
    activityDays,
  };
}
