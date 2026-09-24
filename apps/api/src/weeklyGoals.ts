import type { Pool, PoolClient } from "pg";
import { addCivilDays } from "./homeUpcoming.js";
import { isValidTimezone, localDateInTimezone } from "./progress.js";

type Queryable = Pool | PoolClient;

export type WeeklyGoalSlot = "lc" | "apps";
export type WeeklyGoalKind = "count" | "task_set";
export type WeeklyPaceLabel = "on_track" | "ahead" | "behind";

export type WeeklyGoalMember = {
  taskId: string;
  title: string;
  organization: string | null;
  status: "open" | "completed";
  url: string | null;
};

export type WeeklyGoalView = {
  id: string;
  weekStart: string;
  slot: WeeklyGoalSlot;
  kind: WeeklyGoalKind;
  /** Fixed display title */
  title: string;
  targetCount: number | null;
  progressCount: number;
  done: number;
  total: number;
  pace: {
    label: WeeklyPaceLabel;
    amount: number;
    expected: number;
    fractionElapsed: number;
  };
  members: WeeklyGoalMember[];
};

export type WeeklyGoalsSnapshot = {
  tz: string;
  weekStart: string;
  weekEnd: string;
  goals: WeeklyGoalView[];
};

const DEFAULT_LC_TARGET = 10;

export function mondayOfLocalWeek(instant: Date, tz: string): string {
  const ymd = localDateInTimezone(instant, tz);
  const [y, m, d] = ymd.split("-").map(Number);
  const dow = new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay(); // 0=Sun
  const daysFromMonday = (dow + 6) % 7;
  return addCivilDays(ymd, -daysFromMonday);
}

/** UTC instant for local midnight of a civil YMD in tz. */
export function zonedMidnightUtc(ymd: string, tz: string): Date {
  const [y, m, d] = ymd.split("-").map(Number);
  let guess = Date.UTC(y, m - 1, d, 12, 0, 0);
  for (let i = 0; i < 48; i += 1) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    }).formatToParts(new Date(guess));
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? NaN);
    const ly = get("year");
    const lm = get("month");
    const ld = get("day");
    const lh = get("hour");
    const lmin = get("minute");
    const ls = get("second");
    if (ly === y && lm === m && ld === d && lh === 0 && lmin === 0 && ls === 0) {
      return new Date(guess);
    }
    const localAsUtc = Date.UTC(ly, lm - 1, ld, lh, lmin, ls);
    const desired = Date.UTC(y, m - 1, d, 0, 0, 0);
    guess += desired - localAsUtc;
  }
  return new Date(guess);
}

export function weekElapsedFraction(now: Date, weekStart: string, tz: string): number {
  const startMs = zonedMidnightUtc(weekStart, tz).getTime();
  const endMs = zonedMidnightUtc(addCivilDays(weekStart, 7), tz).getTime();
  if (!(endMs > startMs)) return 0;
  return Math.min(1, Math.max(0, (now.getTime() - startMs) / (endMs - startMs)));
}

export function computePace(
  done: number,
  total: number,
  fractionElapsed: number,
): WeeklyGoalView["pace"] {
  if (total <= 0 || done >= total) {
    return { label: "on_track", amount: 0, expected: total, fractionElapsed };
  }
  const expected = fractionElapsed * total;
  const delta = Math.floor(done - expected);
  if (delta > 0) return { label: "ahead", amount: delta, expected, fractionElapsed };
  if (delta < 0) return { label: "behind", amount: -delta, expected, fractionElapsed };
  return { label: "on_track", amount: 0, expected, fractionElapsed };
}

function slotTitle(slot: WeeklyGoalSlot): string {
  return slot === "lc" ? "LC target" : "App target";
}

type GoalRow = {
  id: string;
  weekStart: string;
  slot: WeeklyGoalSlot;
  kind: WeeklyGoalKind;
  targetCount: number | null;
  progressCount: number;
};

async function loadGoalRows(db: Queryable, weekStart: string): Promise<GoalRow[]> {
  const { rows } = await db.query<{
    id: string;
    week_start: string;
    slot: WeeklyGoalSlot;
    kind: WeeklyGoalKind;
    target_count: number | null;
    progress_count: number;
  }>(
    `SELECT id, week_start::text AS week_start, slot, kind, target_count, progress_count
     FROM weekly_goals
     WHERE week_start = $1::date
     ORDER BY CASE slot WHEN 'lc' THEN 0 ELSE 1 END`,
    [weekStart],
  );
  return rows.map((r) => ({
    id: r.id,
    weekStart: r.week_start,
    slot: r.slot,
    kind: r.kind,
    targetCount: r.target_count,
    progressCount: r.progress_count,
  }));
}

async function loadMembers(db: Queryable, goalId: string): Promise<WeeklyGoalMember[]> {
  const { rows } = await db.query<{
    taskId: string;
    title: string;
    organization: string | null;
    status: "open" | "completed";
    url: string | null;
  }>(
    `SELECT
       t.id AS "taskId",
       COALESCE(t.title, a.title, p.title) AS title,
       COALESCE(t.organization, a.company_name, c.name) AS organization,
       t.status,
       COALESCE(t.url, a.url, p.url) AS url
     FROM weekly_goal_members m
     JOIN tasks t ON t.id = m.task_id
     LEFT JOIN applications a ON a.id = t.application_id
     LEFT JOIN postings p ON p.id = COALESCE(t.posting_id, a.posting_id)
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE m.goal_id = $1
     ORDER BY
       CASE t.status WHEN 'open' THEN 0 ELSE 1 END,
       t.created_at ASC`,
    [goalId],
  );
  return rows;
}

function toView(
  row: GoalRow,
  members: WeeklyGoalMember[],
  fractionElapsed: number,
): WeeklyGoalView {
  let done: number;
  let total: number;
  let targetCount = row.targetCount;
  let progressCount = row.progressCount;

  if (row.kind === "count") {
    total = targetCount ?? 0;
    done = Math.min(progressCount, total);
    progressCount = done;
  } else {
    total = members.length;
    done = members.filter((m) => m.status === "completed").length;
    targetCount = null;
    progressCount = 0;
  }

  return {
    id: row.id,
    weekStart: row.weekStart,
    slot: row.slot,
    kind: row.kind,
    title: slotTitle(row.slot),
    targetCount,
    progressCount,
    done,
    total,
    pace: computePace(done, total, fractionElapsed),
    members: row.kind === "task_set" ? members : [],
  };
}

async function previousLcTarget(db: Queryable, weekStart: string): Promise<number> {
  const prev = addCivilDays(weekStart, -7);
  const { rows } = await db.query<{ target_count: number | null }>(
    `SELECT target_count FROM weekly_goals
     WHERE week_start = $1::date AND slot = 'lc'`,
    [prev],
  );
  const n = rows[0]?.target_count;
  return n != null && n > 0 ? n : DEFAULT_LC_TARGET;
}

async function ensurePair(db: Queryable, weekStart: string): Promise<void> {
  const existing = await loadGoalRows(db, weekStart);
  const hasLc = existing.some((g) => g.slot === "lc");
  const hasApps = existing.some((g) => g.slot === "apps");

  if (!hasLc) {
    const target = await previousLcTarget(db, weekStart);
    await db.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'lc', 'count', $2, 0)
       ON CONFLICT (week_start, slot) DO NOTHING`,
      [weekStart, target],
    );
  }
  if (!hasApps) {
    await db.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'apps', 'task_set', NULL, 0)
       ON CONFLICT (week_start, slot) DO NOTHING`,
      [weekStart],
    );
  }

  // Carry incomplete app members from previous week into this week's apps goal.
  const prev = addCivilDays(weekStart, -7);
  await db.query(
    `UPDATE weekly_goal_members AS m
     SET goal_id = curr.id
     FROM weekly_goals AS prev,
          weekly_goals AS curr,
          tasks AS t
     WHERE m.goal_id = prev.id
       AND prev.week_start = $2::date
       AND prev.slot = 'apps'
       AND curr.week_start = $1::date
       AND curr.slot = 'apps'
       AND t.id = m.task_id
       AND t.status = 'open'
       AND NOT EXISTS (
         SELECT 1 FROM weekly_goal_members AS already
         WHERE already.goal_id = curr.id AND already.task_id = m.task_id
       )`,
    [weekStart, prev],
  );
}

export async function getWeeklyGoalsSnapshot(
  db: Queryable,
  tz: string,
  now = new Date(),
): Promise<WeeklyGoalsSnapshot | null> {
  if (!isValidTimezone(tz)) return null;
  const weekStart = mondayOfLocalWeek(now, tz);
  const weekEnd = addCivilDays(weekStart, 6);
  await ensurePair(db, weekStart);
  const rows = await loadGoalRows(db, weekStart);
  const fraction = weekElapsedFraction(now, weekStart, tz);
  const goals: WeeklyGoalView[] = [];
  for (const row of rows) {
    const members = row.kind === "task_set" ? await loadMembers(db, row.id) : [];
    goals.push(toView(row, members, fraction));
  }
  return { tz, weekStart, weekEnd, goals };
}

export async function patchLcGoal(
  db: Queryable,
  tz: string,
  patch: { targetCount?: number; progressCount?: number },
): Promise<WeeklyGoalsSnapshot | null> {
  if (!isValidTimezone(tz)) return null;
  const weekStart = mondayOfLocalWeek(new Date(), tz);
  await ensurePair(db, weekStart);
  const { rows } = await db.query<{ id: string; target_count: number; progress_count: number }>(
    `SELECT id, target_count, progress_count FROM weekly_goals
     WHERE week_start = $1::date AND slot = 'lc'`,
    [weekStart],
  );
  const row = rows[0];
  if (!row) return null;

  let target = row.target_count;
  let progress = row.progress_count;
  if (patch.targetCount !== undefined) {
    if (!Number.isInteger(patch.targetCount) || patch.targetCount < 1) {
      throw Object.assign(new Error("targetCount must be a positive integer"), { status: 400 });
    }
    target = patch.targetCount;
    if (progress > target) progress = target;
  }
  if (patch.progressCount !== undefined) {
    if (!Number.isInteger(patch.progressCount) || patch.progressCount < 0) {
      throw Object.assign(new Error("progressCount must be a non-negative integer"), {
        status: 400,
      });
    }
    progress = Math.min(patch.progressCount, target);
  }

  await db.query(
    `UPDATE weekly_goals
     SET target_count = $2, progress_count = $3, updated_at = now()
     WHERE id = $1`,
    [row.id, target, progress],
  );
  return getWeeklyGoalsSnapshot(db, tz);
}

export async function setAppTargetMembership(
  db: Queryable,
  tz: string,
  taskId: string,
  member: boolean,
): Promise<WeeklyGoalsSnapshot | null> {
  if (!isValidTimezone(tz)) return null;
  const weekStart = mondayOfLocalWeek(new Date(), tz);
  await ensurePair(db, weekStart);

  const task = await db.query<{ id: string; category: string; status: string }>(
    `SELECT id, category, status FROM tasks WHERE id = $1`,
    [taskId],
  );
  const row = task.rows[0];
  if (!row) throw Object.assign(new Error("Task not found"), { status: 404 });
  if (row.category !== "application") {
    throw Object.assign(new Error("Only application tasks can join App target"), { status: 400 });
  }
  if (member && row.status !== "open") {
    throw Object.assign(new Error("Only open application tasks can be tagged"), { status: 400 });
  }

  const apps = await db.query<{ id: string }>(
    `SELECT id FROM weekly_goals WHERE week_start = $1::date AND slot = 'apps'`,
    [weekStart],
  );
  const goalId = apps.rows[0]?.id;
  if (!goalId) return null;

  if (member) {
    await db.query(`DELETE FROM weekly_goal_members WHERE task_id = $1`, [taskId]);
    await db.query(
      `INSERT INTO weekly_goal_members (goal_id, task_id) VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [goalId, taskId],
    );
  } else {
    await db.query(`DELETE FROM weekly_goal_members WHERE goal_id = $1 AND task_id = $2`, [
      goalId,
      taskId,
    ]);
  }
  return getWeeklyGoalsSnapshot(db, tz);
}

export async function isTaskInCurrentAppTarget(
  db: Queryable,
  tz: string,
  taskId: string,
): Promise<boolean> {
  if (!isValidTimezone(tz)) return false;
  const weekStart = mondayOfLocalWeek(new Date(), tz);
  const { rows } = await db.query<{ ok: number }>(
    `SELECT 1 AS ok
     FROM weekly_goal_members m
     JOIN weekly_goals g ON g.id = m.goal_id
     WHERE m.task_id = $1 AND g.week_start = $2::date AND g.slot = 'apps'`,
    [taskId, weekStart],
  );
  return Boolean(rows[0]);
}

export async function currentAppTargetTaskIds(
  db: Queryable,
  tz: string,
): Promise<Set<string>> {
  if (!isValidTimezone(tz)) return new Set();
  const weekStart = mondayOfLocalWeek(new Date(), tz);
  const { rows } = await db.query<{ task_id: string }>(
    `SELECT m.task_id
     FROM weekly_goal_members m
     JOIN weekly_goals g ON g.id = m.goal_id
     WHERE g.week_start = $1::date AND g.slot = 'apps'`,
    [weekStart],
  );
  return new Set(rows.map((r) => r.task_id));
}
