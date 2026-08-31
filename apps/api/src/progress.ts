import type { Pool } from "pg";

export const PROGRESS_LANES = ["application", "technical"] as const;
export type ProgressLane = (typeof PROGRESS_LANES)[number];

export const PROGRESS_PERIODS = ["day", "week", "month"] as const;
export type ProgressPeriod = (typeof PROGRESS_PERIODS)[number];

export const ACTIVITY_CREDIT_CAP = 5;

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
  deepWork: boolean;
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
  deepWorkUnits: number;
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
  applicationId: string | null;
  createdAt: string;
};

export type ProgressDayDetail = {
  tz: string;
  date: string;
  applications: ActivityCredit;
  leetcode: ActivityCredit;
  effortApplication: boolean;
  effortTechnical: boolean;
  deepWork: boolean;
  applicationRows: ProgressDayApplication[];
  reflections: ProgressReflection[];
};

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

  return {
    tz,
    localDate,
    applications: activityCredit(appRaw),
    leetcode: activityCredit(lcRaw),
    effortApplication: effortApp.size > 0,
    effortTechnical: effortTech.size > 0,
    deepWork: effortApp.size > 0 || effortTech.size > 0,
  };
}

export async function getProgressHeatmap(
  pool: Pool,
  lane: ProgressLane,
  tz: string,
  days: number,
): Promise<{ lane: ProgressLane; tz: string; startDate: string; endDate: string; days: ProgressHeatmapDay[] }> {
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
  const deepWorkUnits = await countReflectionsInRange(
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
    deepWorkUnits,
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

  const appRows = await pool.query<{
    id: string;
    company: string | null;
    title: string | null;
    appliedAt: string;
  }>(
    `SELECT
       a.id,
       COALESCE(a.company_name, c.name) AS company,
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
    `SELECT
       id,
       lane,
       body,
       application_id AS "applicationId",
       created_at AS "createdAt"
     FROM reflection_logs
     WHERE ((created_at AT TIME ZONE $1)::date = $2::date)
     ORDER BY created_at ASC`,
    [tz, date],
  );

  return {
    tz,
    date,
    applications: activityCredit(appRaw),
    leetcode: activityCredit(lcRaw),
    effortApplication: effortApp.size > 0,
    effortTechnical: effortTech.size > 0,
    deepWork: effortApp.size > 0 || effortTech.size > 0,
    applicationRows: appRows.rows,
    reflections: reflections.rows,
  };
}

export async function setLeetcodeDaily(
  pool: Pool,
  tz: string,
  input: { count?: number; delta?: number; date?: string },
): Promise<{ localDate: string; count: number }> {
  const localDate =
    input.date != null
      ? (() => {
          const parsed = parseLocalDate(input.date);
          if (!parsed) throw new Error("Invalid date");
          return parsed;
        })()
      : localDateInTimezone(new Date(), tz);
  if (input.count != null) {
    if (!Number.isFinite(input.count) || input.count < 0) {
      throw new Error("count must be a non-negative number");
    }
    const count = Math.floor(input.count);
    await pool.query(
      `INSERT INTO leetcode_daily (local_date, count, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (local_date) DO UPDATE SET
         count = EXCLUDED.count,
         updated_at = now()`,
      [localDate, count],
    );
    return { localDate, count };
  }
  if (input.delta != null) {
    if (!Number.isFinite(input.delta) || input.delta <= 0) {
      throw new Error("delta must be a positive number");
    }
    const delta = Math.floor(input.delta);
    const { rows } = await pool.query<{ count: number }>(
      `INSERT INTO leetcode_daily (local_date, count, updated_at)
       VALUES ($1, $2, now())
       ON CONFLICT (local_date) DO UPDATE SET
         count = leetcode_daily.count + EXCLUDED.count,
         updated_at = now()
       RETURNING count`,
      [localDate, delta],
    );
    return { localDate, count: rows[0]?.count ?? delta };
  }
  throw new Error("count or delta is required");
}

export async function createReflectionLog(
  pool: Pool,
  input: {
    lane: ProgressLane;
    body: string;
    applicationId?: string | null;
    localDate?: string | null;
    tz?: string | null;
  },
): Promise<ProgressReflection> {
  const body = input.body.trim();
  if (!body) throw new Error("body is required");
  if (input.applicationId) {
    const exists = await pool.query(`SELECT id FROM applications WHERE id = $1`, [
      input.applicationId,
    ]);
    if (!exists.rows[0]) throw new Error("Application not found");
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

  const { rows } = await pool.query<ProgressReflection>(
    `INSERT INTO reflection_logs (lane, body, application_id, created_at)
     VALUES ($1, $2, $3, COALESCE($4, now()))
     RETURNING
       id,
       lane,
       body,
       application_id AS "applicationId",
       created_at AS "createdAt"`,
    [input.lane, body, input.applicationId ?? null, createdAt],
  );
  return rows[0]!;
}

export async function updateReflectionLog(
  pool: Pool,
  id: string,
  bodyRaw: string,
): Promise<ProgressReflection | null> {
  const body = bodyRaw.trim();
  if (!body) throw new Error("body is required");
  const { rows } = await pool.query<ProgressReflection>(
    `UPDATE reflection_logs
     SET body = $2
     WHERE id = $1
     RETURNING
       id,
       lane,
       body,
       application_id AS "applicationId",
       created_at AS "createdAt"`,
    [id, body],
  );
  return rows[0] ?? null;
}

export function parseAnchorDate(raw: string | undefined, tz: string): string {
  if (raw?.trim()) {
    const parsed = parseLocalDate(raw.trim());
    if (parsed) return parsed;
    throw new Error("Invalid date");
  }
  return localDateInTimezone(new Date(), tz);
}
