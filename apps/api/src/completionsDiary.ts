import type { Pool } from "pg";
import { addCivilDays } from "./homeUpcoming.js";
import { leetcodeDailySourceId } from "./pointsAwards.js";
import { POINTS } from "./pointsFormulas.js";
import { effectiveEarnAmount, findEarnEvent } from "./pointsLedger.js";
import { localDateInTimezone } from "./progress.js";
import {
  closeDueWeeks,
  listWeeklyGoalRecords,
  weekLabel,
  type WeeklyGoalRecord,
  type WeeklyGoalSlot,
} from "./weeklyGoals.js";

export type CompletionKind =
  | "task"
  | "application"
  | "interview"
  | "reflection"
  | "weekly"
  | "leetcode";

/** A closed week's record for one goal (R5.8); only on `weekly` items. */
export type CompletionWeekly = {
  slot: WeeklyGoalSlot;
  weekStart: string;
  target: number;
  done: number;
  met: boolean;
  points: number;
};

export type CompletionReflectionNest = {
  id: string;
  body: string;
  preview: string;
};

export type CompletionDiaryItem = {
  id: string;
  kind: CompletionKind;
  title: string;
  subtitle: string | null;
  at: string;
  localDate: string;
  estimateMinutes: number | null;
  actualMinutes: number | null;
  points: number | null;
  href: string | null;
  reflections: CompletionReflectionNest[];
  weekly?: CompletionWeekly;
};

export type CompletionCounts = {
  /** Solves in range (F08 M8-03 pulse). */
  leetcode: number;
  tasks: number;
  apps: number;
  interview: number;
  reflections: number;
};

export type CompletionsDiary = {
  tz: string;
  stats: {
    week: CompletionCounts & { minutes: number };
    month: CompletionCounts & { minutes: number };
    allTime: CompletionCounts & {
      weekly: number;
      /** Total solves (Q52); the `leetcode` tab badge. */
      leetcode: number;
      /** Days with at least one solve (Q53); what `all` adds. */
      leetcodeDays: number;
    };
  };
  items: CompletionDiaryItem[];
};

function mondayOf(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay();
  const daysFromMonday = (dow + 6) % 7;
  return addCivilDays(ymd, -daysFromMonday);
}

function monthStart(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function nestReflections(
  rows: Array<{
    id: string;
    body: string;
  }>,
): CompletionReflectionNest[] {
  return rows.map((r) => ({
    id: r.id,
    body: r.body,
    preview: r.body.length > 120 ? `${r.body.slice(0, 117)}…` : r.body,
  }));
}

/** M5-06 verdict, Q5 variant A: "Week of Oct 5 · 12 × 20 + 100 · target met". */
function weeklySubtitle(r: WeeklyGoalRecord): string {
  const week = weekLabel(r.weekStart);
  if (r.slot === "apps" && r.target === 0) return `${week} · no tagged applications`;
  const units = `${r.done} × ${POINTS.weeklyGoalPerUnit}`;
  return r.met ? `${week} · ${units} + ${POINTS.weeklyGoalBonus} · target met` : `${week} · ${units}`;
}

function emptyCounts(): CompletionCounts {
  return { leetcode: 0, tasks: 0, apps: 0, interview: 0, reflections: 0 };
}

export async function getCompletionsDiary(
  pool: Pool,
  tz: string,
  opts: {
    kind?: CompletionKind | "all";
    limit?: number;
    /** Inclusive end of a Past work window (R8.4). */
    endDate?: string;
    /** Days in the window ending on `endDate` (default 7 when endDate set). */
    days?: number;
  } = {},
): Promise<CompletionsDiary> {
  const kindFilter = opts.kind && opts.kind !== "all" ? opts.kind : null;
  const windowEnd =
    opts.endDate && /^\d{4}-\d{2}-\d{2}$/.test(opts.endDate) ? opts.endDate : null;
  const windowDays = windowEnd
    ? Math.min(Math.max(opts.days ?? 7, 1), 31)
    : null;
  const windowStart =
    windowEnd && windowDays != null
      ? addCivilDays(windowEnd, -(windowDays - 1))
      : null;
  // Past work week window needs enough rows to cover the slice after filter.
  const defaultLimit = windowStart ? 200 : 80;
  const limit = Math.min(Math.max(opts.limit ?? defaultLimit, 1), 200);
  const now = new Date();
  const today = localDateInTimezone(now, tz);
  const weekStart = mondayOf(today);
  const weekEnd = addCivilDays(weekStart, 6);
  const monthBegin = monthStart(today);
  await closeDueWeeks(pool, tz, now);

  const items: CompletionDiaryItem[] = [];

  // Closed weeks: one entry per goal, on the close date (R5.8, R5.23)
  if (!kindFilter || kindFilter === "weekly") {
    for (const r of await listWeeklyGoalRecords(pool, { limit })) {
      items.push({
        id: `weekly:${r.weekStart}:${r.slot}`,
        kind: "weekly",
        title: `${r.slot === "lc" ? "LC" : "Apps"} ${r.done}/${r.target}`,
        subtitle: weeklySubtitle(r),
        at: r.closedAt,
        localDate: localDateInTimezone(new Date(r.closedAt), tz),
        estimateMinutes: null,
        actualMinutes: null,
        points: r.points,
        href: null,
        reflections: [],
        weekly: {
          slot: r.slot,
          weekStart: r.weekStart,
          target: r.target,
          done: r.done,
          met: r.met,
          points: r.points,
        },
      });
    }
  }

  // Misc completed tasks
  if (!kindFilter || kindFilter === "task") {
    const { rows } = await pool.query<{
      id: string;
      title: string;
      organization: string | null;
      category_name: string;
      completed_at: Date;
      estimate_minutes: number | null;
      actual_minutes: number | null;
    }>(
      `SELECT
         t.id,
         t.title,
         t.organization,
         tc.name AS category_name,
         t.completed_at,
         t.estimate_minutes,
         t.actual_minutes
       FROM tasks t
       JOIN task_categories tc ON tc.id = t.category_id
       WHERE t.status = 'completed' AND t.category = 'misc'
         AND t.completed_at IS NOT NULL
       ORDER BY t.completed_at DESC
       LIMIT $1`,
      [limit],
    );
    for (const row of rows) {
      const at = row.completed_at.toISOString();
      const localDate = localDateInTimezone(row.completed_at, tz);
      const earn = await findEarnEvent(pool, "task_complete", row.id);
      const { rows: refl } = await pool.query<{
        id: string;
        body: string;
      }>(
        `SELECT id, body
         FROM reflection_logs
         WHERE task_id = $1
         ORDER BY created_at ASC`,
        [row.id],
      );
      items.push({
        id: `task:${row.id}`,
        kind: "task",
        title: row.title,
        subtitle: [row.organization, row.category_name].filter(Boolean).join(" · ") || null,
        at,
        localDate,
        estimateMinutes: row.estimate_minutes,
        actualMinutes: row.actual_minutes,
        points: earn ? effectiveEarnAmount(earn) : null,
        href: `/tasks/${row.id}`,
        reflections: nestReflections(refl),
      });
    }
  }

  // Applications marked applied
  if (!kindFilter || kindFilter === "application") {
    const { rows } = await pool.query<{
      id: string;
      title: string | null;
      company: string | null;
      applied_at: Date;
      actual_minutes: number | null;
    }>(
      `SELECT
         a.id,
         COALESCE(a.title, p.title) AS title,
         COALESCE(
           a.company_name,
           CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
           c.name
         ) AS company,
         a.applied_at,
         a.actual_minutes
       FROM applications a
       LEFT JOIN postings p ON p.id = a.posting_id
       LEFT JOIN companies c ON c.id = p.company_id
       WHERE a.status <> 'todo' AND a.applied_at IS NOT NULL
       ORDER BY a.applied_at DESC
       LIMIT $1`,
      [limit],
    );
    for (const row of rows) {
      const at = row.applied_at.toISOString();
      const localDate = localDateInTimezone(row.applied_at, tz);
      const earn = await findEarnEvent(pool, "application_applied", row.id);
      const { rows: refl } = await pool.query<{
        id: string;
        body: string;
      }>(
        `SELECT id, body
         FROM reflection_logs
         WHERE application_id = $1
         ORDER BY created_at ASC`,
        [row.id],
      );
      const company = row.company ?? "Unknown";
      const title = row.title ?? "Untitled";
      items.push({
        id: `application:${row.id}`,
        kind: "application",
        title: `${company} · ${title}`,
        subtitle: "Marked applied",
        at,
        localDate,
        estimateMinutes: null,
        actualMinutes: row.actual_minutes,
        points: earn ? effectiveEarnAmount(earn) : null,
        href: `/applications/${row.id}`,
        reflections: nestReflections(refl),
      });
    }
  }

  // Interview steps finished
  if (!kindFilter || kindFilter === "interview") {
    const { rows } = await pool.query<{
      id: string;
      title: string;
      kind: string;
      status: string;
      completed_at: Date;
      thread_id: string;
      company: string | null;
      actual_minutes: number | null;
    }>(
      `SELECT
         s.id,
         s.title,
         s.kind,
         s.status,
         s.completed_at,
         s.actual_minutes,
         t.id AS thread_id,
         COALESCE(
           (
             SELECT COALESCE(
               a.company_name,
               CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
               c.name
             )
             FROM application_thread_members m
             JOIN applications a ON a.id = m.application_id
             LEFT JOIN postings p ON p.id = a.posting_id
             LEFT JOIN companies c ON c.id = p.company_id
             WHERE m.thread_id = t.id
             ORDER BY CASE WHEN a.id = t.primary_application_id THEN 0 ELSE 1 END
             LIMIT 1
           ),
           t.label
         ) AS company
       FROM application_steps s
       JOIN interview_threads t ON t.id = s.thread_id
       WHERE s.status IN ('completed', 'awaiting_employer')
         AND s.completed_at IS NOT NULL
       ORDER BY s.completed_at DESC
       LIMIT $1`,
      [limit],
    );
    for (const row of rows) {
      const at = row.completed_at.toISOString();
      const localDate = localDateInTimezone(row.completed_at, tz);
      const earn = await findEarnEvent(pool, "interview_finish", row.id);
      const { rows: refl } = await pool.query<{
        id: string;
        body: string;
      }>(
        `SELECT id, body
         FROM reflection_logs
         WHERE interview_step_id = $1
         ORDER BY created_at ASC`,
        [row.id],
      );
      items.push({
        id: `interview:${row.id}`,
        kind: "interview",
        title: row.company ? `${row.company} · ${row.title}` : row.title,
        subtitle:
          row.status === "awaiting_employer"
            ? `Finished · waiting on them · ${row.kind}`
            : `Finished · ${row.kind}`,
        at,
        localDate,
        estimateMinutes: null,
        actualMinutes: row.actual_minutes,
        points: earn ? effectiveEarnAmount(earn) : null,
        href: `/interviews/${row.thread_id}`,
        reflections: nestReflections(refl),
      });
    }
  }

  // LeetCode days with at least one solve (R5.33)
  if (!kindFilter || kindFilter === "leetcode") {
    const { rows } = await pool.query<{
      local_date: string;
      count: number;
      easy_count: number;
      hard_count: number;
      updated_at: Date;
    }>(
      `SELECT local_date::text AS local_date, count, easy_count, hard_count, updated_at
       FROM leetcode_daily
       WHERE count > 0
       ORDER BY local_date DESC
       LIMIT $1`,
      [limit],
    );
    for (const row of rows) {
      const medium = row.count - row.easy_count - row.hard_count;
      const earn = await findEarnEvent(pool, "leetcode_daily", leetcodeDailySourceId(row.local_date));
      const points = earn ? effectiveEarnAmount(earn) : 0;
      items.push({
        id: `leetcode:${row.local_date}`,
        kind: "leetcode",
        title: `LC: ${row.count} solved`,
        subtitle: `${row.easy_count} easy · ${medium} medium · ${row.hard_count} hard`,
        at: row.updated_at.toISOString(),
        localDate: row.local_date,
        estimateMinutes: null,
        actualMinutes: null,
        points,
        href: null,
        reflections: [],
      });
    }
  }

  // Standalone reflections (no task/app link) — and all reflections when filter=reflection
  if (!kindFilter || kindFilter === "reflection") {
    const { rows } = await pool.query<{
      id: string;
      body: string;
      lane: string;
      created_at: Date;
      task_id: string | null;
      application_id: string | null;
      task_title: string | null;
      application_title: string | null;
      application_company: string | null;
    }>(
      kindFilter === "reflection"
        ? `SELECT
             r.id, r.body, r.lane, r.created_at,
             r.task_id, r.application_id,
             t.title AS task_title,
             COALESCE(a.title, p.title) AS application_title,
             COALESCE(
               a.company_name,
               CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
               c.name
             ) AS application_company
           FROM reflection_logs r
           LEFT JOIN tasks t ON t.id = r.task_id
           LEFT JOIN applications a ON a.id = r.application_id
           LEFT JOIN postings p ON p.id = a.posting_id
           LEFT JOIN companies c ON c.id = p.company_id
           ORDER BY r.created_at DESC
           LIMIT $1`
        : `SELECT
             r.id, r.body, r.lane, r.created_at,
             r.task_id, r.application_id,
             t.title AS task_title,
             COALESCE(a.title, p.title) AS application_title,
             COALESCE(
               a.company_name,
               CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
               c.name
             ) AS application_company
           FROM reflection_logs r
           LEFT JOIN tasks t ON t.id = r.task_id
           LEFT JOIN applications a ON a.id = r.application_id
           LEFT JOIN postings p ON p.id = a.posting_id
           LEFT JOIN companies c ON c.id = p.company_id
           WHERE r.task_id IS NULL AND r.application_id IS NULL
           ORDER BY r.created_at DESC
           LIMIT $1`,
      [limit],
    );
    for (const row of rows) {
      // When showing "all", only list unlinked reflections as top-level rows
      // (linked ones nest under work). When filter=reflection, list all.
      if (!kindFilter && (row.task_id || row.application_id)) continue;
      const at = row.created_at.toISOString();
      const localDate = localDateInTimezone(row.created_at, tz);
      const earn = await findEarnEvent(pool, "reflection_create", row.id);
      const linked =
        row.task_title ??
        (row.application_company
          ? `${row.application_company}${row.application_title ? ` · ${row.application_title}` : ""}`
          : null);
      items.push({
        id: `reflection:${row.id}`,
        kind: "reflection",
        title:
          row.body.length > 80 ? `${row.body.slice(0, 77)}…` : row.body,
        subtitle: linked
          ? `${row.lane} · ${linked}`
          : `${row.lane} · standalone`,
        at,
        localDate,
        estimateMinutes: null,
        actualMinutes: null,
        points: earn ? effectiveEarnAmount(earn) : null,
        href: row.task_id
          ? `/tasks/${row.task_id}`
          : row.application_id
            ? `/applications/${row.application_id}`
            : "/progress/past",
        reflections: [],
      });
    }
  }

  items.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
  const inWindow =
    windowStart && windowEnd
      ? items.filter(
          (item) => item.localDate >= windowStart && item.localDate <= windowEnd,
        )
      : items;
  const trimmed = inWindow.slice(0, limit);

  const allTime = { ...emptyCounts(), weekly: 0, leetcode: 0, leetcodeDays: 0 };

  // All-time counts from DB (not limited feed)
  const [taskCount, appCount, interviewCount, reflectionCount, weeklyCount, lcStats] =
    await Promise.all([
      pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM tasks WHERE status = 'completed' AND category = 'misc'`,
      ),
      pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM applications WHERE status <> 'todo' AND applied_at IS NOT NULL`,
      ),
      pool.query<{ n: string }>(
        `SELECT COUNT(*)::text AS n FROM application_steps
         WHERE status IN ('completed', 'awaiting_employer') AND completed_at IS NOT NULL`,
      ),
      pool.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM reflection_logs`),
      pool.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM weekly_goal_records`),
      pool.query<{ days: string; solves: string }>(
        `SELECT COUNT(*)::text AS days, COALESCE(SUM(count), 0)::text AS solves
         FROM leetcode_daily
         WHERE count > 0`,
      ),
    ]);
  allTime.tasks = Number(taskCount.rows[0]?.n ?? 0);
  allTime.apps = Number(appCount.rows[0]?.n ?? 0);
  allTime.interview = Number(interviewCount.rows[0]?.n ?? 0);
  allTime.reflections = Number(reflectionCount.rows[0]?.n ?? 0);
  allTime.weekly = Number(weeklyCount.rows[0]?.n ?? 0);
  allTime.leetcodeDays = Number(lcStats.rows[0]?.days ?? 0);
  allTime.leetcode = Number(lcStats.rows[0]?.solves ?? 0);

  // Accurate week/month from DB dates (timestamptz → local civil date in tz)
  async function rangeCounts(start: string, end: string) {
    const counts = { ...emptyCounts(), minutes: 0 };
    const tasks = await pool.query<{ n: string; mins: string }>(
      `SELECT COUNT(*)::text AS n, COALESCE(SUM(actual_minutes), 0)::text AS mins
       FROM tasks
       WHERE status = 'completed' AND category = 'misc'
         AND (timezone($3, completed_at))::date >= $1::date
         AND (timezone($3, completed_at))::date <= $2::date`,
      [start, end, tz],
    );
    counts.tasks = Number(tasks.rows[0]?.n ?? 0);
    counts.minutes += Number(tasks.rows[0]?.mins ?? 0);

    const apps = await pool.query<{ n: string; mins: string }>(
      `SELECT COUNT(*)::text AS n, COALESCE(SUM(actual_minutes), 0)::text AS mins
       FROM applications
       WHERE status <> 'todo' AND applied_at IS NOT NULL
         AND (timezone($3, applied_at))::date >= $1::date
         AND (timezone($3, applied_at))::date <= $2::date`,
      [start, end, tz],
    );
    counts.apps = Number(apps.rows[0]?.n ?? 0);
    counts.minutes += Number(apps.rows[0]?.mins ?? 0);

    const interview = await pool.query<{ n: string; mins: string }>(
      `SELECT COUNT(*)::text AS n, COALESCE(SUM(actual_minutes), 0)::text AS mins
       FROM application_steps
       WHERE status IN ('completed', 'awaiting_employer') AND completed_at IS NOT NULL
         AND (timezone($3, completed_at))::date >= $1::date
         AND (timezone($3, completed_at))::date <= $2::date`,
      [start, end, tz],
    );
    counts.interview = Number(interview.rows[0]?.n ?? 0);
    counts.minutes += Number(interview.rows[0]?.mins ?? 0);

    const reflections = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n
       FROM reflection_logs
       WHERE (timezone($3, created_at))::date >= $1::date
         AND (timezone($3, created_at))::date <= $2::date`,
      [start, end, tz],
    );
    counts.reflections = Number(reflections.rows[0]?.n ?? 0);

    const leetcode = await pool.query<{ n: string }>(
      `SELECT COALESCE(SUM(count), 0)::text AS n
       FROM leetcode_daily
       WHERE local_date >= $1::date AND local_date <= $2::date`,
      [start, end],
    );
    counts.leetcode = Number(leetcode.rows[0]?.n ?? 0);
    return counts;
  }

  const weekStats = await rangeCounts(weekStart, weekEnd);
  const monthStats = await rangeCounts(monthBegin, today);

  return {
    tz,
    stats: {
      week: weekStats,
      month: monthStats,
      allTime,
    },
    items: trimmed,
  };
}
