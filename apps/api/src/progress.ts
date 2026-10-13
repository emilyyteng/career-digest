import type { Pool, PoolClient } from "pg";

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
  actualMinutes: number | null;
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
    r.actual_minutes AS "actualMinutes",
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
  const localDate = localDateInTimezone(new Date(), tz);
  const appRaw = await countApplicationsInRange(pool, tz, localDate, localDate);
  const lcRows = await pool.query<{ count: number }>(
    `SELECT count FROM leetcode_daily WHERE local_date = $1::date`,
    [localDate],
  );
  const lcRaw = lcRows.rows[0]?.count ?? 0;
  const effortApp = await effortDaysByLane(pool, tz, "application", localDate, localDate);
  const effortTech = await effortDaysByLane(pool, tz, "technical", localDate, localDate);
  const effortOther = await effortDaysByLane(pool, tz, "other", localDate, localDate);

  return {
    tz,
    localDate,
    applications: activityCredit(appRaw),
    leetcode: activityCredit(lcRaw),
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
  const lcRows = await pool.query<{ count: number }>(
    `SELECT count FROM leetcode_daily WHERE local_date = $1::date`,
    [date],
  );
  const lcRaw = lcRows.rows[0]?.count ?? 0;
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
    effortApplication: effortApp.size > 0,
    effortTechnical: effortTech.size > 0,
    effortOther: effortOther.size > 0,
    applicationRows: appRows.rows,
    reflections: reflections.rows,
  };
}

export async function setLeetcodeDaily(
  pool: Pool,
  tz: string,
  input: { count?: number; delta?: number; date?: string },
): Promise<{ localDate: string; count: number }> {
  const { syncLeetcodeDailyPoints } = await import("./pointsAwards.js");
  const { awardWeeklyGoalIfNeeded } = await import("./pointsAwards.js");
  const { getWeeklyGoalsSnapshot } = await import("./weeklyGoals.js");

  const localDate =
    input.date != null
      ? (() => {
          const parsed = parseLocalDate(input.date);
          if (!parsed) throw new Error("Invalid date");
          return parsed;
        })()
      : localDateInTimezone(new Date(), tz);
  let count: number;
  if (input.count != null) {
    if (!Number.isFinite(input.count) || input.count < 0) {
      throw new Error("count must be a non-negative number");
    }
    count = Math.floor(input.count);
    await pool.query(
      `INSERT INTO leetcode_daily (local_date, count, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (local_date) DO UPDATE SET
         count = EXCLUDED.count,
         updated_at = now()`,
      [localDate, count],
    );
  } else if (input.delta != null) {
    // Allow negative delta so LC −1 can reverse points.
    if (!Number.isFinite(input.delta) || input.delta === 0) {
      throw new Error("delta must be a non-zero number");
    }
    const delta = Math.floor(input.delta);
    const { rows } = await pool.query<{ count: number }>(
      `INSERT INTO leetcode_daily (local_date, count, updated_at)
       VALUES ($1, GREATEST(0, $2), now())
       ON CONFLICT (local_date) DO UPDATE SET
         count = GREATEST(0, leetcode_daily.count + $2),
         updated_at = now()
       RETURNING count`,
      [localDate, delta],
    );
    count = rows[0]?.count ?? Math.max(0, delta);
  } else {
    throw new Error("count or delta is required");
  }

  await syncLeetcodeDailyPoints(pool, localDate, count);

  try {
    const snap = await getWeeklyGoalsSnapshot(pool, tz);
    const lcGoal = snap?.goals.find((g) => g.slot === "lc");
    if (snap && lcGoal && lcGoal.done >= lcGoal.total && lcGoal.total > 0) {
      await awardWeeklyGoalIfNeeded(pool, {
        weekStart: snap.weekStart,
        slot: "lc",
        met: true,
        label: "Weekly LC target met!",
      });
    }
  } catch {
    // Weekly goals optional if table missing in odd test setups.
  }

  return { localDate, count };
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
    actualMinutes?: number | null;
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

  let actualMinutes: number | null = null;
  if (input.actualMinutes !== undefined && input.actualMinutes !== null) {
    if (!Number.isFinite(input.actualMinutes) || input.actualMinutes < 0) {
      throw new Error("actualMinutes must be a non-negative number");
    }
    actualMinutes = Math.floor(input.actualMinutes);
  }

  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO reflection_logs (
       lane, body, actual_minutes, task_id, application_id, interview_step_id, created_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, COALESCE($7, now()))
     RETURNING id`,
    [
      input.lane,
      body,
      actualMinutes,
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
      actualMinutes: row.actualMinutes,
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
