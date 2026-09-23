import type { Pool, PoolClient } from "pg";
import { localDateInTimezone } from "./progress.js";

type Queryable = Pool | PoolClient;

export type HomeUpcomingKind = "interview" | "task";

export type HomeUpcomingItem = {
  kind: HomeUpcomingKind;
  /** Shared sort / countdown instant (ISO). */
  at: string;
  deadlineLabel: string;
  // interview
  threadId?: string;
  stepId?: string;
  company?: string | null;
  primaryTitle?: string | null;
  stepTitle?: string | null;
  // task
  id?: string;
  title?: string;
  organization?: string | null;
  categoryName?: string;
};

export type HomeUpcomingGroup = {
  key: string;
  label: string;
  items: HomeUpcomingItem[];
};

export type HomeUpcomingThisWeek = {
  groups: HomeUpcomingGroup[];
};

const WINDOW_DAYS = 7;

function formatDeadlineLong(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function addCivilDays(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d + days));
  return probe.toISOString().slice(0, 10);
}

export function upcomingDayLabel(ymd: string, todayYmd: string): string {
  if (ymd === todayYmd) return "Today";
  if (ymd === addCivilDays(todayYmd, 1)) return "Tomorrow";
  const [y, m, d] = ymd.split("-").map(Number);
  const probe = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone: "UTC",
  }).format(probe);
  const monthDay = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(probe);
  return `${weekday} · ${monthDay}`;
}

function taskDueLabel(dueAt: string): string {
  const formatted = formatDeadlineLong(dueAt);
  return formatted ? `Due: ${formatted}` : "Due";
}

function interviewDeadlineLabel(at: string, scheduled: boolean): string {
  const formatted = formatDeadlineLong(at);
  const prefix = scheduled ? "Scheduled" : "Due";
  return formatted ? `${prefix}: ${formatted}` : prefix;
}

/** Actionable dated steps only (not awaiting_employer / completed / skipped). */
export function interviewStepAt(row: {
  status: string;
  dueAt: string | null;
  scheduledAt: string | null;
}): string | null {
  if (row.status === "scheduled" && row.scheduledAt) return row.scheduledAt;
  if (row.dueAt) return row.dueAt;
  if (row.scheduledAt) return row.scheduledAt;
  return null;
}

export function buildUpcomingGroups(
  items: HomeUpcomingItem[],
  now: Date,
  tz: string,
): HomeUpcomingGroup[] {
  const todayYmd = localDateInTimezone(now, tz);
  const lastYmd = addCivilDays(todayYmd, WINDOW_DAYS - 1);
  const nowMs = now.getTime();

  const overdue: HomeUpcomingItem[] = [];
  const byDay = new Map<string, HomeUpcomingItem[]>();

  for (const item of items) {
    const atMs = new Date(item.at).getTime();
    if (Number.isNaN(atMs)) continue;
    if (atMs < nowMs) {
      overdue.push(item);
      continue;
    }
    const day = localDateInTimezone(new Date(item.at), tz);
    if (day < todayYmd || day > lastYmd) continue;
    const bucket = byDay.get(day);
    if (bucket) bucket.push(item);
    else byDay.set(day, [item]);
  }

  const sortItems = (rows: HomeUpcomingItem[]) =>
    [...rows].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime());

  const groups: HomeUpcomingGroup[] = [];
  if (overdue.length > 0) {
    groups.push({ key: "overdue", label: "Overdue", items: sortItems(overdue) });
  }

  const days = [...byDay.keys()].sort();
  for (const day of days) {
    groups.push({
      key: day,
      label: upcomingDayLabel(day, todayYmd),
      items: sortItems(byDay.get(day) ?? []),
    });
  }
  return groups;
}

type TaskDueRow = {
  id: string;
  title: string;
  organization: string | null;
  categoryName: string;
  dueAt: string;
};

type InterviewStepDueRow = {
  stepId: string;
  threadId: string;
  status: string;
  dueAt: string | null;
  scheduledAt: string | null;
  stepTitle: string;
  company: string | null;
  primaryTitle: string | null;
};

async function loadDatedOpenTasks(db: Queryable): Promise<HomeUpcomingItem[]> {
  const { rows } = await db.query<TaskDueRow>(
    `SELECT
       t.id,
       COALESCE(t.title, a.title, p.title) AS title,
       COALESCE(t.organization, a.company_name, c.name) AS organization,
       tc.name AS "categoryName",
       t.due_at AS "dueAt"
     FROM tasks t
     JOIN task_categories tc ON tc.id = t.category_id
     LEFT JOIN applications a ON a.id = t.application_id
     LEFT JOIN postings p ON p.id = COALESCE(t.posting_id, a.posting_id)
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE t.status = 'open'
       AND t.due_at IS NOT NULL
     ORDER BY t.due_at ASC`,
  );
  return rows.map((row) => ({
    kind: "task" as const,
    id: row.id,
    title: row.title,
    organization: row.organization,
    categoryName: row.categoryName,
    at: row.dueAt,
    deadlineLabel: taskDueLabel(row.dueAt),
  }));
}

async function loadDatedInterviewSteps(db: Queryable): Promise<HomeUpcomingItem[]> {
  const { rows } = await db.query<InterviewStepDueRow>(
    `SELECT
       s.id AS "stepId",
       s.thread_id AS "threadId",
       s.status,
       s.due_at AS "dueAt",
       s.scheduled_at AS "scheduledAt",
       s.title AS "stepTitle",
       COALESCE(
         pa.company_name,
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       COALESCE(pa.title, p.title) AS "primaryTitle"
     FROM application_steps s
     JOIN interview_threads t ON t.id = s.thread_id
     JOIN applications pa ON pa.id = t.primary_application_id
     LEFT JOIN postings p ON p.id = pa.posting_id
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE t.status = 'active'
       AND s.status IN ('pending', 'scheduled')
       AND (s.due_at IS NOT NULL OR s.scheduled_at IS NOT NULL)`,
  );

  const items: HomeUpcomingItem[] = [];
  for (const row of rows) {
    const at = interviewStepAt(row);
    if (!at) continue;
    const scheduled = row.status === "scheduled";
    items.push({
      kind: "interview",
      threadId: row.threadId,
      stepId: row.stepId,
      company: row.company,
      primaryTitle: row.primaryTitle,
      stepTitle: row.stepTitle,
      at,
      deadlineLabel: interviewDeadlineLabel(at, scheduled),
    });
  }
  return items;
}

export async function getUpcomingThisWeek(
  db: Queryable,
  tz: string,
  now: Date = new Date(),
): Promise<HomeUpcomingThisWeek> {
  const [tasks, interviews] = await Promise.all([
    loadDatedOpenTasks(db),
    loadDatedInterviewSteps(db),
  ]);
  return { groups: buildUpcomingGroups([...tasks, ...interviews], now, tz) };
}
