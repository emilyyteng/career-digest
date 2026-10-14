import type { Pool, PoolClient } from "pg";
import type { LeetcodeTier, LeetcodeTierCounts } from "./pointsFormulas.js";
import { serializePointsEarn, type PointsEarnInfo } from "./pointsLedger.js";

export const PROGRESS_LANES = ["application", "technical", "other"] as const;
export type ProgressLane = (typeof PROGRESS_LANES)[number];

/** Heatmaps stay application vs technical only. */
export const PROGRESS_HEATMAP_LANES = ["application", "technical"] as const;
export type ProgressHeatmapLane = (typeof PROGRESS_HEATMAP_LANES)[number];

export const PROGRESS_PERIODS = ["day", "week", "month"] as const;
export type ProgressPeriod = (typeof PROGRESS_PERIODS)[number];

export const ACTIVITY_CREDIT_CAP = 3;

type Queryable = Pool | PoolClient;

export type ActivityCredit = {
  raw: number;
  earned: number;
  cap: number;
};

export type ProgressToday = {
  tz: string;
  localDate: string;
  applications: ActivityCredit;
  leetcode: ActivityCredit;
  /** The day's solves per tier; untiered solves count as medium. Sums to `leetcode.raw`. */
  leetcodeTiers: LeetcodeTierCounts;
  /** This week's solves per tier, Monday to today (the weekly goals' week). */
  leetcodeWeekTiers: LeetcodeTierCounts;
  /** Daily LC and apps streaks (R5.25); display on the today strip is M5-12. */
  streaks: {
    lc: { length: number; todayCounts: boolean };
    apps: { length: number; todayCounts: boolean };
  };
  effortApplication: boolean;
  effortTechnical: boolean;
  effortOther: boolean;
};

export type ProgressHeatmapDay = {
  date: string;
  raw: number;
  earned: number;
  effort: boolean;
};

export type ProgressOutcome = {
  period: ProgressPeriod;
  tz: string;
  anchorDate: string;
  startDate: string;
  endDate: string;
  applicationsLogged: number;
  leetcodeSolves: number;
  reflectionsWritten: number;
};

export type ProgressDayApplication = {
  id: string;
  company: string | null;
  title: string | null;
  appliedAt: string;
};

export type ProgressReflection = {
  id: string;
  lane: ProgressLane;
  body: string;
  taskId: string | null;
  applicationId: string | null;
  interviewStepId: string | null;
  taskTitle: string | null;
  applicationTitle: string | null;
  applicationCompany: string | null;
  interviewStepTitle: string | null;
  createdAt: string;
};

export type ApplicationInterviewStepOption = {
  id: string;
  title: string;
  status: string;
  threadStatus: string;
  threadCompany: string | null;
};

export type ProgressDayDetail = {
  tz: string;
  date: string;
  applications: ActivityCredit;
  leetcode: ActivityCredit;
  leetcodeTiers: LeetcodeTierCounts;
  effortApplication: boolean;
  effortTechnical: boolean;
  effortOther: boolean;
  applicationRows: ProgressDayApplication[];
  reflections: ProgressReflection[];
};

const reflectionSelect = `
  SELECT
    r.id,
    r.lane,
    r.body,
    r.task_id AS "taskId",
    r.application_id AS "applicationId",
    r.interview_step_id AS "interviewStepId",
    t.title AS "taskTitle",
    COALESCE(a.title, p.title) AS "applicationTitle",
    COALESCE(
      a.company_name,
      CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
      c.name
    ) AS "applicationCompany",
    s.title AS "interviewStepTitle",
    r.created_at AS "createdAt"
  FROM reflection_logs r
  LEFT JOIN tasks t ON t.id = r.task_id
  LEFT JOIN applications a ON a.id = r.application_id
  LEFT JOIN postings p ON p.id = a.posting_id
  LEFT JOIN companies c ON c.id = p.company_id
  LEFT JOIN application_steps s ON s.id = r.interview_step_id
`;

export function earnedCredit(raw: number): number {
  if (!Number.isFinite(raw) || raw <= 0) return 0;
  return Math.min(Math.floor(raw), ACTIVITY_CREDIT_CAP);
}

export function activityCredit(raw: number): ActivityCredit {
  return { raw, earned: earnedCredit(raw), cap: ACTIVITY_CREDIT_CAP };
}

export function isValidTimezone(tz: string): boolean {
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function localDateInTimezone(instant: Date, tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

export function isProgressLane(value: string): value is ProgressLane {
  return (PROGRESS_LANES as readonly string[]).includes(value);
}

export function isProgressHeatmapLane(value: string): value is ProgressHeatmapLane {
  return (PROGRESS_HEATMAP_LANES as readonly string[]).includes(value);
}

export function isProgressPeriod(value: string): value is ProgressPeriod {
  return (PROGRESS_PERIODS as readonly string[]).includes(value);
}

export function parseLocalDate(value: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [y, m, d] = value.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d));
  if (
    probe.getUTCFullYear() !== y ||
    probe.getUTCMonth() !== m - 1 ||
    probe.getUTCDate() !== d
  ) {
    return null;
  }
  return value;
}

export function resolveTimezone(raw: string | undefined): string | null {
  const tz = raw?.trim();
  if (!tz) return null;
  return isValidTimezone(tz) ? tz : null;
}

async function periodBounds(
  pool: Pool,
  period: ProgressPeriod,
  anchorDate: string,
): Promise<{ startDate: string; endDate: string } | null> {
  if (period === "day") {
    return { startDate: anchorDate, endDate: anchorDate };
  }
  if (period === "week") {
    const { rows } = await pool.query<{ start_date: string; end_date: string }>(
      `SELECT
         ($1::date - EXTRACT(dow FROM $1::date)::int)::date::text AS start_date,
         ($1::date - EXTRACT(dow FROM $1::date)::int + 6)::date::text AS end_date`,
      [anchorDate],
    );
    const row = rows[0];
    if (!row) return null;
    return { startDate: row.start_date, endDate: row.end_date };
  }
  const { rows } = await pool.query<{ start_date: string; end_date: string }>(
    `SELECT
       date_trunc('month', $1::date)::date::text AS start_date,
       (date_trunc('month', $1::date) + interval '1 month - 1 day')::date::text AS end_date`,
    [anchorDate],
  );
  const row = rows[0];
  if (!row) return null;
  return { startDate: row.start_date, endDate: row.end_date };
}

async function countApplicationsInRange(
  pool: Pool,
  tz: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM applications
     WHERE applied_at IS NOT NULL
       AND ((applied_at AT TIME ZONE $1)::date >= $2::date)
       AND ((applied_at AT TIME ZONE $1)::date <= $3::date)`,
    [tz, startDate, endDate],
  );
  return Number(rows[0]?.count ?? 0) || 0;
}

async function sumLeetcodeInRange(
  pool: Pool,
  startDate: string,
  endDate: string,
): Promise<number> {
  const { rows } = await pool.query<{ total: string }>(
    `SELECT COALESCE(SUM(count), 0)::text AS total
     FROM leetcode_daily
     WHERE local_date >= $1::date AND local_date <= $2::date`,
    [startDate, endDate],
  );
  return Number(rows[0]?.total ?? 0) || 0;
}

async function countReflectionsInRange(
  pool: Pool,
  tz: string,
  startDate: string,
  endDate: string,
): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM reflection_logs
     WHERE ((created_at AT TIME ZONE $1)::date >= $2::date)
       AND ((created_at AT TIME ZONE $1)::date <= $3::date)`,
    [tz, startDate, endDate],
  );
  return Number(rows[0]?.count ?? 0) || 0;
}

async function applicationCountsByDate(
  pool: Pool,
  tz: string,
  startDate: string,
  endDate: string,
): Promise<Map<string, number>> {
  const { rows } = await pool.query<{ date: string; count: number }>(
    `SELECT ((applied_at AT TIME ZONE $1)::date)::text AS date, COUNT(*)::int AS count
     FROM applications
     WHERE applied_at IS NOT NULL
       AND ((applied_at AT TIME ZONE $1)::date >= $2::date)
       AND ((applied_at AT TIME ZONE $1)::date <= $3::date)
     GROUP BY 1`,
    [tz, startDate, endDate],
  );
  return new Map(rows.map((row) => [row.date, row.count]));
}

async function leetcodeCountsByDate(
  pool: Pool,
  startDate: string,
  endDate: string,
): Promise<Map<string, number>> {
  const { rows } = await pool.query<{ date: string; count: number }>(
    `SELECT local_date::text AS date, count
     FROM leetcode_daily
     WHERE local_date >= $1::date AND local_date <= $2::date`,
    [startDate, endDate],
  );
  return new Map(rows.map((row) => [row.date, row.count]));
}

/** Days with ≥1 reflection in this lane (R5.29). */
async function effortDaysByLane(
  pool: Pool,
  tz: string,
  lane: ProgressLane,
  startDate: string,
  endDate: string,
): Promise<Set<string>> {
  const { rows } = await pool.query<{ date: string }>(
    `SELECT DISTINCT ((created_at AT TIME ZONE $1)::date)::text AS date
     FROM reflection_logs
     WHERE lane = $2
       AND ((created_at AT TIME ZONE $1)::date >= $3::date)
       AND ((created_at AT TIME ZONE $1)::date <= $4::date)`,
    [tz, lane, startDate, endDate],
  );
  return new Set(rows.map((row) => row.date));
}

function dateRangeInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const [sy, sm, sd] = startDate.split("-").map(Number);
  const [ey, em, ed] = endDate.split("-").map(Number);
  const cursor = new Date(Date.UTC(sy, sm - 1, sd));
  const end = new Date(Date.UTC(ey, em - 1, ed));
  while (cursor <= end) {
    dates.push(
      `${cursor.getUTCFullYear()}-${String(cursor.getUTCMonth() + 1).padStart(2, "0")}-${String(cursor.getUTCDate()).padStart(2, "0")}`,
    );
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function shiftLocalDate(
  pool: Pool,
  anchorDate: string,
  deltaDays: number,
): Promise<string> {
  const { rows } = await pool.query<{ date: string }>(
    `SELECT ($1::date + $2::int)::date::text AS date`,
    [anchorDate, deltaDays],
  );
  return rows[0]?.date ?? anchorDate;
}

export async function getProgressToday(pool: Pool, tz: string): Promise<ProgressToday> {
  const { getStreaks } = await import("./streaks.js");
  const localDate = localDateInTimezone(new Date(), tz);
  const appRaw = await countApplicationsInRange(pool, tz, localDate, localDate);
  const lcTiers = await readLeetcodeTiers(pool, localDate);
  const lcRaw = lcTiers.easy + lcTiers.medium + lcTiers.hard;
  const lcWeekTiers = await readLeetcodeWeekTiers(pool, localDate);
  const streaks = await getStreaks(pool, tz);
  const effortApp = await effortDaysByLane(pool, tz, "application", localDate, localDate);
  const effortTech = await effortDaysByLane(pool, tz, "technical", localDate, localDate);
  const effortOther = await effortDaysByLane(pool, tz, "other", localDate, localDate);

  return {
    tz,
    localDate,
    applications: activityCredit(appRaw),
    leetcode: activityCredit(lcRaw),
    leetcodeTiers: lcTiers,
    leetcodeWeekTiers: lcWeekTiers,
    streaks: { lc: streaks.lc, apps: streaks.apps },
    effortApplication: effortApp.size > 0,
    effortTechnical: effortTech.size > 0,
    effortOther: effortOther.size > 0,
  };
}

export async function getProgressHeatmap(
  pool: Pool,
  lane: ProgressHeatmapLane,
  tz: string,
  days: number,
): Promise<{
  lane: ProgressHeatmapLane;
  tz: string;
  startDate: string;
  endDate: string;
  days: ProgressHeatmapDay[];
}> {
  const endDate = localDateInTimezone(new Date(), tz);
  const span = Math.min(400, Math.max(1, Math.floor(days)));
  const startDate = await shiftLocalDate(pool, endDate, -(span - 1));
  const dates = dateRangeInclusive(startDate, endDate);

  const effortDays = await effortDaysByLane(pool, tz, lane, startDate, endDate);
  const daysOut: ProgressHeatmapDay[] = [];

  if (lane === "application") {
    const counts = await applicationCountsByDate(pool, tz, startDate, endDate);
    for (const date of dates) {
      const raw = counts.get(date) ?? 0;
      daysOut.push({
        date,
        raw,
        earned: earnedCredit(raw),
        effort: effortDays.has(date),
      });
    }
  } else {
    const counts = await leetcodeCountsByDate(pool, startDate, endDate);
    for (const date of dates) {
      const raw = counts.get(date) ?? 0;
      daysOut.push({
        date,
        raw,
        earned: earnedCredit(raw),
        effort: effortDays.has(date),
      });
    }
  }

  return { lane, tz, startDate, endDate, days: daysOut };
}

export async function getProgressOutcome(
  pool: Pool,
  period: ProgressPeriod,
  tz: string,
  anchorDate: string,
): Promise<ProgressOutcome | null> {
  const bounds = await periodBounds(pool, period, anchorDate);
  if (!bounds) return null;
  const applicationsLogged = await countApplicationsInRange(
    pool,
    tz,
    bounds.startDate,
    bounds.endDate,
  );
  const leetcodeSolves = await sumLeetcodeInRange(pool, bounds.startDate, bounds.endDate);
  const reflectionsWritten = await countReflectionsInRange(
    pool,
    tz,
    bounds.startDate,
    bounds.endDate,
  );

  return {
    period,
    tz,
    anchorDate,
    startDate: bounds.startDate,
    endDate: bounds.endDate,
    applicationsLogged,
    leetcodeSolves,
    reflectionsWritten,
  };
}

export async function getProgressDay(
  pool: Pool,
  tz: string,
  date: string,
): Promise<ProgressDayDetail> {
  const appRaw = await countApplicationsInRange(pool, tz, date, date);
  const lcTiers = await readLeetcodeTiers(pool, date);
  const lcRaw = lcTiers.easy + lcTiers.medium + lcTiers.hard;
  const effortApp = await effortDaysByLane(pool, tz, "application", date, date);
  const effortTech = await effortDaysByLane(pool, tz, "technical", date, date);
  const effortOther = await effortDaysByLane(pool, tz, "other", date, date);

  const appRows = await pool.query<{
    id: string;
    company: string | null;
    title: string | null;
    appliedAt: string;
  }>(
    `SELECT
       a.id,
       COALESCE(
         a.company_name,
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       COALESCE(a.title, p.title) AS title,
       a.applied_at AS "appliedAt"
     FROM applications a
     LEFT JOIN postings p ON p.id = a.posting_id
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE a.applied_at IS NOT NULL
       AND ((a.applied_at AT TIME ZONE $1)::date = $2::date)
     ORDER BY a.applied_at DESC`,
    [tz, date],
  );

  const reflections = await pool.query<ProgressReflection>(
    `${reflectionSelect}
     WHERE ((r.created_at AT TIME ZONE $1)::date = $2::date)
     ORDER BY r.created_at ASC`,
    [tz, date],
  );

  return {
    tz,
    date,
    applications: activityCredit(appRaw),
    leetcode: activityCredit(lcRaw),
    leetcodeTiers: lcTiers,
    effortApplication: effortApp.size > 0,
    effortTechnical: effortTech.size > 0,
    effortOther: effortOther.size > 0,
    applicationRows: appRows.rows,
    reflections: reflections.rows,
  };
}

async function readLeetcodeTiers(
  db: Queryable,
  date: string,
  forUpdate = false,
): Promise<LeetcodeTierCounts> {
  const { rows } = await db.query<{ count: number; easy_count: number; hard_count: number }>(
    `SELECT count, easy_count, hard_count FROM leetcode_daily WHERE local_date = $1::date
     ${forUpdate ? "FOR UPDATE" : ""}`,
    [date],
  );
  const row = rows[0];
  if (!row) return { easy: 0, medium: 0, hard: 0 };
  return { easy: row.easy_count, medium: row.count - row.easy_count - row.hard_count, hard: row.hard_count };
}

/** Monday of the week containing `today` through `today`, matching the weekly goals' week. */
async function readLeetcodeWeekTiers(db: Queryable, today: string): Promise<LeetcodeTierCounts> {
  const [y, m, d] = today.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  const { rows } = await db.query<{ count: number; easy: number; hard: number }>(
    `SELECT COALESCE(SUM(count), 0)::int AS count,
            COALESCE(SUM(easy_count), 0)::int AS easy,
            COALESCE(SUM(hard_count), 0)::int AS hard
     FROM leetcode_daily
     WHERE local_date >= $1::date - $2::int AND local_date <= $1::date`,
    [today, (dow + 6) % 7],
  );
  const row = rows[0] ?? { count: 0, easy: 0, hard: 0 };
  return { easy: row.easy, medium: row.count - row.easy - row.hard, hard: row.hard };
}

export type LeetcodeType = "weekly" | "misc";

export type LeetcodeChange = {
  tier: LeetcodeTier;
  delta: 1 | -1;
  type: LeetcodeType;
  /** A past day (History). Weekly changes are today only. */
  date?: string;
};

export type LeetcodeChangeResult = {
  localDate: string;
  count: number;
  tiers: LeetcodeTierCounts;
  /** This week's solves per tier after the change (see `ProgressToday.leetcodeWeekTiers`). */
  weekTiers: LeetcodeTierCounts;
  /** This week's LC progress after a weekly change; null for misc. */
  weeklyProgress: number | null;
  /** The points change for the banner; null if points didn't move. */
  points: PointsEarnInfo | null;
};

const TIER_NAME: Record<LeetcodeTier, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

/**
 * The single LeetCode write path (R5.17): one solve of one tier, weekly or misc, up
 * or down. Updates the day's tier count, the week's LC progress for a weekly change,
 * and the day's LeetCode points, in one transaction. Throws 409 when there's nothing
 * to remove, 400 for a weekly change on another day.
 */
export async function changeLeetcode(
  pool: Pool,
  tz: string,
  input: LeetcodeChange,
  now = new Date(),
): Promise<LeetcodeChangeResult> {
  const { syncLeetcodeDailyPoints } = await import("./pointsAwards.js");
  const { closeDueWeeks, stepLcWeeklyProgress } = await import("./weeklyGoals.js");

  const today = localDateInTimezone(now, tz);
  let localDate = today;
  if (input.date != null) {
    const parsed = parseLocalDate(input.date);
    if (!parsed) throw Object.assign(new Error("Invalid date"), { status: 400 });
    localDate = parsed;
  }
  if (input.type === "weekly" && localDate !== today) {
    throw Object.assign(new Error("Weekly solves can only be logged for today"), { status: 400 });
  }
  if (input.type === "weekly") await closeDueWeeks(pool, tz, now);

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO leetcode_daily (local_date, count) VALUES ($1::date, 0)
       ON CONFLICT (local_date) DO NOTHING`,
      [localDate],
    );
    const tiers = await readLeetcodeTiers(client, localDate, true);
    if (input.delta < 0 && tiers[input.tier] <= 0) {
      throw Object.assign(new Error(`No ${input.tier} solves to remove`), { status: 409 });
    }
    tiers[input.tier] += input.delta;

    let weeklyProgress: number | null = null;
    let where: string = input.type;
    if (input.type === "weekly") {
      const week = await stepLcWeeklyProgress(client, tz, input.delta, now);
      weeklyProgress = week.progress;
      where = `weekly ${week.progress}/${week.target}`;
    }

    await client.query(
      `UPDATE leetcode_daily
       SET count = $2, easy_count = $3, hard_count = $4, updated_at = now()
       WHERE local_date = $1::date`,
      [localDate, tiers.easy + tiers.medium + tiers.hard, tiers.easy, tiers.hard],
    );

    const label =
      input.delta > 0
        ? `${TIER_NAME[input.tier]} LeetCode (${where})`
        : `Removed one ${input.tier} LeetCode (${where})`;
    const { change } = await syncLeetcodeDailyPoints(client, localDate, tiers, label);
    const { syncStreakForDay } = await import("./streaks.js");
    await syncStreakForDay(
      client,
      "lc",
      tz,
      localDate,
      tiers.easy + tiers.medium + tiers.hard > 0,
      now,
    );
    const weekTiers = await readLeetcodeWeekTiers(client, today);
    await client.query("COMMIT");

    return {
      localDate,
      count: tiers.easy + tiers.medium + tiers.hard,
      tiers,
      weekTiers,
      weeklyProgress,
      points: serializePointsEarn(change),
    };
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function assertTaskExists(pool: Queryable, taskId: string): Promise<void> {
  const exists = await pool.query(`SELECT id FROM tasks WHERE id = $1`, [taskId]);
  if (!exists.rows[0]) throw new Error("Task not found");
}

async function assertApplicationExists(pool: Queryable, applicationId: string): Promise<void> {
  const exists = await pool.query(`SELECT id FROM applications WHERE id = $1`, [applicationId]);
  if (!exists.rows[0]) throw new Error("Application not found");
}

async function assertInterviewStepForApplication(
  pool: Queryable,
  applicationId: string,
  stepId: string,
): Promise<void> {
  const { rows } = await pool.query(
    `SELECT s.id
     FROM application_steps s
     JOIN interview_threads t ON t.id = s.thread_id
     JOIN application_thread_members m ON m.thread_id = t.id
     WHERE s.id = $1 AND m.application_id = $2`,
    [stepId, applicationId],
  );
  if (!rows[0]) throw new Error("Interview step not found for application");
}

function assertSingleWorkLink(
  taskId: string | null,
  applicationId: string | null,
  interviewStepId: string | null,
): void {
  if (taskId && applicationId) {
    throw new Error("Link to a task or an application, not both");
  }
  if (interviewStepId && !applicationId) {
    throw new Error("Interview step requires an application link");
  }
}

/** Steps on threads that include this application (active + resolved). */
export async function listInterviewStepsForApplication(
  pool: Queryable,
  applicationId: string,
): Promise<ApplicationInterviewStepOption[]> {
  await assertApplicationExists(pool, applicationId);
  const { rows } = await pool.query<ApplicationInterviewStepOption>(
    `SELECT
       s.id,
       s.title,
       s.status,
       t.status AS "threadStatus",
       COALESCE(
         a.company_name,
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS "threadCompany"
     FROM application_steps s
     JOIN interview_threads t ON t.id = s.thread_id
     JOIN application_thread_members m ON m.thread_id = t.id
     JOIN applications a ON a.id = t.primary_application_id
     LEFT JOIN postings p ON p.id = a.posting_id
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE m.application_id = $1
     ORDER BY
       CASE WHEN t.status = 'active' THEN 0 ELSE 1 END,
       s.sort_order ASC,
       s.created_at ASC`,
    [applicationId],
  );
  return rows;
}

async function fetchReflection(
  pool: Queryable,
  id: string,
): Promise<ProgressReflection | null> {
  const { rows } = await pool.query<ProgressReflection>(
    `${reflectionSelect}
     WHERE r.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export async function listReflectionsForTask(
  pool: Queryable,
  taskId: string,
): Promise<ProgressReflection[]> {
  const { rows } = await pool.query<ProgressReflection>(
    `${reflectionSelect}
     WHERE r.task_id = $1
     ORDER BY r.created_at ASC`,
    [taskId],
  );
  return rows;
}

export async function listReflectionsForApplication(
  pool: Queryable,
  applicationId: string,
): Promise<ProgressReflection[]> {
  const { rows } = await pool.query<ProgressReflection>(
    `${reflectionSelect}
     WHERE r.application_id = $1
     ORDER BY r.created_at ASC`,
    [applicationId],
  );
  return rows;
}

export async function listUnlinkedReflections(
  pool: Queryable,
  limit = 40,
): Promise<ProgressReflection[]> {
  const capped = Math.min(100, Math.max(1, Math.floor(limit)));
  const { rows } = await pool.query<ProgressReflection>(
    `${reflectionSelect}
     WHERE r.task_id IS NULL AND r.application_id IS NULL
     ORDER BY r.created_at DESC
     LIMIT $1`,
    [capped],
  );
  return rows;
}

export async function createReflectionLog(
  pool: Queryable,
  input: {
    lane: ProgressLane;
    body: string;
    taskId?: string | null;
    applicationId?: string | null;
    interviewStepId?: string | null;
    localDate?: string | null;
    tz?: string | null;
    /** When false, skip standalone reflection points (bundled into a completion earn). */
    awardPoints?: boolean;
  },
): Promise<ProgressReflection> {
  const body = input.body.trim();
  if (!body) throw new Error("body is required");
  const taskId = input.taskId ?? null;
  const applicationId = input.applicationId ?? null;
  const interviewStepId = input.interviewStepId ?? null;
  assertSingleWorkLink(taskId, applicationId, interviewStepId);
  if (taskId) await assertTaskExists(pool, taskId);
  if (applicationId) await assertApplicationExists(pool, applicationId);
  if (interviewStepId && applicationId) {
    await assertInterviewStepForApplication(pool, applicationId, interviewStepId);
  }

  let createdAt: Date | null = null;
  if (input.localDate) {
    const parsed = parseLocalDate(input.localDate);
    if (!parsed) throw new Error("Invalid date");
    const tz = input.tz?.trim();
    if (!tz || !isValidTimezone(tz)) {
      throw new Error("tz is required when localDate is set");
    }
    const { rows: atRows } = await pool.query<{ created_at: Date }>(
      `SELECT (($1::text || ' 12:00:00')::timestamp AT TIME ZONE $2) AS created_at`,
      [parsed, tz],
    );
    createdAt = atRows[0]?.created_at ?? null;
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO reflection_logs (
       lane, body, task_id, application_id, interview_step_id, created_at
     )
     VALUES ($1, $2, $3, $4, $5, COALESCE($6, now()))
     RETURNING id`,
    [
      input.lane,
      body,
      taskId,
      applicationId,
      interviewStepId,
      createdAt,
    ],
  );
  const row = await fetchReflection(pool, rows[0]!.id);
  if (!row) throw new Error("Failed to load reflection");

  if (input.awardPoints !== false) {
    const { awardReflectionCreate } = await import("./pointsAwards.js");
    const label =
      row.taskTitle ??
      (row.applicationCompany
        ? `${row.applicationCompany}${row.applicationTitle ? ` · ${row.applicationTitle}` : ""}`
        : null) ??
      "Reflection";
    await awardReflectionCreate(pool, {
      reflectionId: row.id,
      label,
    });
  }

  return row;
}

export async function updateReflectionLog(
  pool: Pool,
  id: string,
  input: {
    body?: string;
    lane?: ProgressLane;
    taskId?: string | null;
    applicationId?: string | null;
    interviewStepId?: string | null;
    clearLink?: boolean;
  },
): Promise<ProgressReflection | null> {
  const existing = await fetchReflection(pool, id);
  if (!existing) return null;

  let body = existing.body;
  if (input.body !== undefined) {
    body = input.body.trim();
    if (!body) throw new Error("body is required");
  }
  const lane = input.lane ?? existing.lane;
  if (!isProgressLane(lane)) throw new Error("Invalid lane");

  let taskId = existing.taskId;
  let applicationId = existing.applicationId;
  let interviewStepId = existing.interviewStepId;
  if (input.clearLink) {
    taskId = null;
    applicationId = null;
    interviewStepId = null;
  }
  if (input.taskId !== undefined) {
    taskId = input.taskId;
    if (taskId) {
      applicationId = null;
      interviewStepId = null;
    }
  }
  if (input.applicationId !== undefined) {
    applicationId = input.applicationId;
    if (applicationId) taskId = null;
    if (!applicationId) {
      interviewStepId = null;
    } else if (
      input.interviewStepId === undefined &&
      applicationId !== existing.applicationId
    ) {
      // Application changed without a new step — drop the prior step.
      interviewStepId = null;
    }
  }
  if (input.interviewStepId !== undefined) {
    interviewStepId = input.interviewStepId;
  }
  assertSingleWorkLink(taskId, applicationId, interviewStepId);
  if (taskId) await assertTaskExists(pool, taskId);
  if (applicationId) await assertApplicationExists(pool, applicationId);
  if (interviewStepId && applicationId) {
    await assertInterviewStepForApplication(pool, applicationId, interviewStepId);
  }

  await pool.query(
    `UPDATE reflection_logs
     SET body = $2,
         lane = $3,
         task_id = $4,
         application_id = $5,
         interview_step_id = $6
     WHERE id = $1`,
    [id, body, lane, taskId, applicationId, interviewStepId],
  );
  return fetchReflection(pool, id);
}

/** Move reflections from a completed application task onto its application row. */
export async function transferTaskReflectionsToApplication(
  db: Queryable,
  taskId: string,
  applicationId: string,
): Promise<number> {
  const { rowCount } = await db.query(
    `UPDATE reflection_logs
     SET application_id = $2,
         task_id = NULL,
         interview_step_id = NULL
     WHERE task_id = $1`,
    [taskId, applicationId],
  );
  return rowCount ?? 0;
}

export function parseAnchorDate(raw: string | undefined, tz: string): string {
  if (raw?.trim()) {
    const parsed = parseLocalDate(raw.trim());
    if (parsed) return parsed;
    throw new Error("Invalid date");
  }
  return localDateInTimezone(new Date(), tz);
}
