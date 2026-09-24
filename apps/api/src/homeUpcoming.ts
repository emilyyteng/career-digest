import type { Pool, PoolClient } from "pg";
import { localDateInTimezone } from "./progress.js";
import type { TaskPriority } from "./taskSubtasks.js";

type Queryable = Pool | PoolClient;

export type HomeUpcomingKind = "interview" | "task" | "subtask";

export type HomeUpcomingItem = {
  kind: HomeUpcomingKind;
  /** Shared sort / countdown instant (ISO). */
  at: string;
  deadlineLabel: string;
  dueKind: "deadline" | "target";
  priority: TaskPriority | null;
  estimateMinutes: number | null;
  // interview
  threadId?: string;
  stepId?: string;
  company?: string | null;
  primaryTitle?: string | null;
  stepTitle?: string | null;
  // task / subtask
  id?: string;
  title?: string;
  organization?: string | null;
  categoryName?: string;
  // subtask
  parentId?: string;
  parentTitle?: string;
  subtaskId?: string;
};

export type HomeUpcomingGroup = {
  key: string;
  label: string;
  items: HomeUpcomingItem[];
};

export type HomeUpcomingSection = {
  key: "deadlines" | "targets";
  label: string;
  /** Flat list (deadlines). Empty when layout is by_day. */
  items: HomeUpcomingItem[];
  /** Day buckets for targets (and unused for deadlines). */
  dayGroups: HomeUpcomingGroup[];
  layout: "flat" | "by_day";
};

export type HomeUpcomingThisWeek = {
  /** Legacy day groups (still filled for tests / transition). */
  groups: HomeUpcomingGroup[];
  sections: HomeUpcomingSection[];
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

function taskDueLabel(dueAt: string, kind: "deadline" | "target"): string {
  const formatted = formatDeadlineLong(dueAt);
  const prefix = kind === "deadline" ? "Deadline" : "Target";
  return formatted ? `${prefix}: ${formatted}` : prefix;
}

function interviewDeadlineLabel(at: string, scheduled: boolean): string {
  const formatted = formatDeadlineLong(at);
  const prefix = scheduled ? "Scheduled" : "Due";
  return formatted ? `${prefix}: ${formatted}` : prefix;
}

function asPriority(value: number | null | undefined): TaskPriority | null {
  return value === 0 || value === 1 || value === 2 ? value : null;
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

function priorityRank(priority: TaskPriority | null | undefined): number {
  return priority == null ? 99 : priority;
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
    [...rows].sort((a, b) => {
      const atDiff = new Date(a.at).getTime() - new Date(b.at).getTime();
      if (atDiff !== 0) return atDiff;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });

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
  dueKind: "deadline" | "target" | null;
  priority: number | null;
  estimateMinutes: number | null;
};

type SubtaskDueRow = {
  subtaskId: string;
  taskId: string;
  subtaskTitle: string;
  parentTitle: string;
  organization: string | null;
  categoryName: string;
  dueAt: string;
  dueKind: "deadline" | "target" | null;
  parentPriority: number | null;
  priorityOverride: number | null;
  estimateMinutes: number | null;
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
       t.due_at AS "dueAt",
       t.due_kind AS "dueKind",
       t.priority,
       t.estimate_minutes AS "estimateMinutes"
     FROM tasks t
     JOIN task_categories tc ON tc.id = t.category_id
     LEFT JOIN applications a ON a.id = t.application_id
     LEFT JOIN postings p ON p.id = COALESCE(t.posting_id, a.posting_id)
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE t.status = 'open'
       AND t.due_at IS NOT NULL
     ORDER BY t.due_at ASC`,
  );
  return rows.map((row) => {
    const dueKind = row.dueKind === "target" ? "target" : "deadline";
    return {
      kind: "task" as const,
      id: row.id,
      title: row.title,
      organization: row.organization,
      categoryName: row.categoryName,
      at: row.dueAt,
      dueKind,
      deadlineLabel: taskDueLabel(row.dueAt, dueKind),
      priority: asPriority(row.priority),
      estimateMinutes: row.estimateMinutes,
    };
  });
}

async function loadDatedOpenSubtasks(db: Queryable): Promise<HomeUpcomingItem[]> {
  const { rows } = await db.query<SubtaskDueRow>(
    `SELECT
       s.id AS "subtaskId",
       s.task_id AS "taskId",
       s.title AS "subtaskTitle",
       COALESCE(t.title, a.title, p.title) AS "parentTitle",
       COALESCE(t.organization, a.company_name, c.name) AS organization,
       tc.name AS "categoryName",
       s.due_at AS "dueAt",
       s.due_kind AS "dueKind",
       t.priority AS "parentPriority",
       s.priority_override AS "priorityOverride",
       s.estimate_minutes AS "estimateMinutes"
     FROM task_subtasks s
     JOIN tasks t ON t.id = s.task_id
     JOIN task_categories tc ON tc.id = t.category_id
     LEFT JOIN applications a ON a.id = t.application_id
     LEFT JOIN postings p ON p.id = COALESCE(t.posting_id, a.posting_id)
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE s.status = 'open'
       AND t.status = 'open'
       AND t.category = 'misc'
       AND s.parent_subtask_id IS NULL
       AND s.due_at IS NOT NULL
     ORDER BY s.due_at ASC`,
  );
  return rows.map((row) => {
    const dueKind = row.dueKind === "deadline" ? "deadline" : "target";
    return {
      kind: "subtask" as const,
      id: row.taskId,
      parentId: row.taskId,
      parentTitle: row.parentTitle,
      subtaskId: row.subtaskId,
      title: `${row.parentTitle} · ${row.subtaskTitle}`,
      organization: row.organization,
      categoryName: row.categoryName,
      at: row.dueAt,
      dueKind,
      deadlineLabel: taskDueLabel(row.dueAt, dueKind),
      priority: asPriority(row.priorityOverride) ?? asPriority(row.parentPriority),
      estimateMinutes: row.estimateMinutes,
    };
  });
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
      dueKind: "deadline",
      deadlineLabel: interviewDeadlineLabel(at, scheduled),
      priority: null,
      estimateMinutes: null,
    });
  }
  return items;
}

/** Flat list for a dueKind section: overdue first, then by date within the week window. */
export function buildFlatSectionItems(
  items: HomeUpcomingItem[],
  now: Date,
  tz: string,
): HomeUpcomingItem[] {
  const todayYmd = localDateInTimezone(now, tz);
  const lastYmd = addCivilDays(todayYmd, WINDOW_DAYS - 1);
  const nowMs = now.getTime();
  const overdue: HomeUpcomingItem[] = [];
  const upcoming: HomeUpcomingItem[] = [];

  for (const item of items) {
    const atMs = new Date(item.at).getTime();
    if (Number.isNaN(atMs)) continue;
    if (atMs < nowMs) {
      overdue.push(item);
      continue;
    }
    const day = localDateInTimezone(new Date(item.at), tz);
    if (day < todayYmd || day > lastYmd) continue;
    upcoming.push(item);
  }

  const sortItems = (rows: HomeUpcomingItem[]) =>
    [...rows].sort((a, b) => {
      const atDiff = new Date(a.at).getTime() - new Date(b.at).getTime();
      if (atDiff !== 0) return atDiff;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });

  return [...sortItems(overdue), ...sortItems(upcoming)];
}

export async function getUpcomingThisWeek(
  db: Queryable,
  tz: string,
  now: Date = new Date(),
): Promise<HomeUpcomingThisWeek> {
  const [tasks, subtasks, interviews] = await Promise.all([
    loadDatedOpenTasks(db),
    loadDatedOpenSubtasks(db),
    loadDatedInterviewSteps(db),
  ]);
  const all = [...tasks, ...subtasks, ...interviews];
  const deadlines = all.filter((i) => i.dueKind === "deadline");
  const targets = all.filter((i) => i.dueKind === "target");
  return {
    groups: buildUpcomingGroups(all, now, tz),
    sections: [
      {
        key: "deadlines",
        label: "Deadlines",
        layout: "flat",
        items: buildFlatSectionItems(deadlines, now, tz),
        dayGroups: [],
      },
      {
        key: "targets",
        label: "Targets",
        layout: "by_day",
        items: [],
        dayGroups: buildUpcomingGroups(targets, now, tz),
      },
    ],
  };
}
