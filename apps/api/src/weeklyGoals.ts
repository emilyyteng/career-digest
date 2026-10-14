import type { Pool, PoolClient } from "pg";
import { addCivilDays } from "./homeUpcoming.js";
import { POINTS, weeklyRecordPoints } from "./pointsFormulas.js";
import { effectiveEarnAmount, findEarnEvent, recordEarn } from "./pointsLedger.js";
import { weeklyGoalSourceId } from "./pointsAwards.js";
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
  /** Consecutive met weeks ending with the last closed week (R5.28; display only). */
  metWeeksStreak: number;
};

export type WeeklyGoalRecord = {
  weekStart: string;
  slot: WeeklyGoalSlot;
  /** LC: the target. Apps: tagged tasks at close. */
  target: number;
  /** LC: weekly solves, possibly past the target. Apps: tagged tasks completed in the week. */
  done: number;
  met: boolean;
  /** The week's worth under R5.15. */
  points: number;
  flatBonusPaidBefore: boolean;
  closedAt: string;
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
  metWeeksStreak: number,
): WeeklyGoalView {
  let done: number;
  let total: number;
  let targetCount = row.targetCount;
  let progressCount = row.progressCount;

  if (row.kind === "count") {
    total = targetCount ?? 0;
    done = progressCount;
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
    metWeeksStreak,
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
}

async function appsGoalId(db: Queryable, weekStart: string): Promise<string | null> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM weekly_goals WHERE week_start = $1::date AND slot = 'apps'`,
    [weekStart],
  );
  return rows[0]?.id ?? null;
}

/** Arbitrary key for the advisory lock that serializes week close. */
const WEEK_CLOSE_LOCK_KEY = 508_005;

async function readCloseStart(db: Queryable): Promise<string | null> {
  const { rows } = await db.query<{ start_week: string }>(
    `SELECT start_week::text AS start_week FROM weekly_close_state WHERE singleton`,
  );
  return rows[0]?.start_week ?? null;
}

async function lastClosedWeek(db: Queryable): Promise<string | null> {
  const { rows } = await db.query<{ week: string | null }>(
    `SELECT MAX(week_start)::text AS week FROM weekly_goal_records`,
  );
  return rows[0]?.week ?? null;
}

/** "Week of Oct 5" for a Monday YMD. */
export function weekLabel(weekStart: string): string {
  const [y, m, d] = weekStart.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  return `Week of ${date.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

function isPool(db: Queryable): db is Pool {
  return !("release" in db);
}

/**
 * R5.23: close every ended, unclosed week, oldest first, before anything reads or
 * changes weekly goals. Runs in its own transaction under an advisory lock, so
 * concurrent requests close a week once. The first call ever only records the
 * switch-over week (R5.22): earlier weeks are never closed.
 */
export async function closeDueWeeks(
  db: Queryable,
  tz: string,
  now = new Date(),
): Promise<WeeklyGoalRecord[]> {
  if (!isValidTimezone(tz)) return [];
  const currentWeek = mondayOfLocalWeek(now, tz);
  const start = await readCloseStart(db);
  if (start) {
    const lastEnded = addCivilDays(currentWeek, -7);
    if (lastEnded < start) return [];
    const closed = await lastClosedWeek(db);
    if (closed && closed >= lastEnded) return [];
  }

  if (!isPool(db)) {
    await db.query(`SELECT pg_advisory_xact_lock($1)`, [WEEK_CLOSE_LOCK_KEY]);
    return closeDueWeeksLocked(db, tz, currentWeek);
  }
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await client.query(`SELECT pg_advisory_xact_lock($1)`, [WEEK_CLOSE_LOCK_KEY]);
    const records = await closeDueWeeksLocked(client, tz, currentWeek);
    await client.query("COMMIT");
    return records;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

async function closeDueWeeksLocked(
  db: Queryable,
  tz: string,
  currentWeek: string,
): Promise<WeeklyGoalRecord[]> {
  let start = await readCloseStart(db);
  if (!start) {
    await db.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date) ON CONFLICT DO NOTHING`,
      [currentWeek],
    );
    start = (await readCloseStart(db)) ?? currentWeek;
    await adoptStrandedMembers(db, start);
  }

  const closed = await lastClosedWeek(db);
  let week = closed && closed >= start ? addCivilDays(closed, 7) : start;
  const records: WeeklyGoalRecord[] = [];
  while (week < currentWeek) {
    records.push(...(await closeWeek(db, week, tz)));
    week = addCivilDays(week, 7);
  }
  return records;
}

/**
 * The switch-over: open tagged tasks left in earlier weeks (the old carry-over only
 * looked one week back) join the first week that closes.
 */
async function adoptStrandedMembers(db: Queryable, startWeek: string): Promise<void> {
  await ensurePair(db, startWeek);
  const goalId = await appsGoalId(db, startWeek);
  if (!goalId) return;
  await db.query(
    `UPDATE weekly_goal_members AS m
     SET goal_id = $1
     FROM weekly_goals AS g, tasks AS t
     WHERE m.goal_id = g.id
       AND g.slot = 'apps'
       AND g.week_start < $2::date
       AND t.id = m.task_id
       AND t.status = 'open'`,
    [goalId, startWeek],
  );
}

async function closeWeek(db: Queryable, weekStart: string, tz: string): Promise<WeeklyGoalRecord[]> {
  await ensurePair(db, weekStart);
  const nextWeek = addCivilDays(weekStart, 7);
  const weekEnd = zonedMidnightUtc(nextWeek, tz);
  const records: WeeklyGoalRecord[] = [];

  for (const row of await loadGoalRows(db, weekStart)) {
    let target: number;
    let done: number;
    if (row.kind === "count") {
      target = row.targetCount ?? 0;
      done = row.progressCount;
    } else {
      // A tagged task completed after the week ended counts toward the week it was completed in.
      const { rows } = await db.query<{ total: number; done: number }>(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (
             WHERE t.status = 'completed' AND t.completed_at IS NOT NULL AND t.completed_at < $2
           )::int AS done
         FROM weekly_goal_members m
         JOIN tasks t ON t.id = m.task_id
         WHERE m.goal_id = $1`,
        [row.id, weekEnd],
      );
      target = rows[0]?.total ?? 0;
      done = rows[0]?.done ?? 0;
    }
    const met = target > 0 && done >= target;
    const points = weeklyRecordPoints(done, met);

    const flatEarn = await findEarnEvent(db, "weekly_goal", weeklyGoalSourceId(weekStart, row.slot));
    const flatBonusPaidBefore = flatEarn != null && effectiveEarnAmount(flatEarn) > 0;

    const inserted = await db.query<{ closed_at: Date }>(
      `INSERT INTO weekly_goal_records
         (week_start, slot, target, done, met, points, flat_bonus_paid_before)
       VALUES ($1::date, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (week_start, slot) DO NOTHING
       RETURNING closed_at`,
      [weekStart, row.slot, target, done, met, points, flatBonusPaidBefore],
    );
    if (!inserted.rows[0]) continue;

    const bonusDue = met && !flatBonusPaidBefore;
    const unitPoints = done * POINTS.weeklyGoalPerUnit;
    const amount = unitPoints + (bonusDue ? POINTS.weeklyGoalBonus : 0);
    const name = row.slot === "lc" ? "LC" : "Apps";
    if (amount > 0) {
      await recordEarn(db, {
        category: "weekly_goal",
        amount,
        message: `${weekLabel(weekStart)} · ${name} ${done}/${target} · +${amount} points`,
        sourceType: "weekly_record",
        sourceId: weeklyGoalSourceId(weekStart, row.slot),
        breakdown: [
          ...(unitPoints > 0
            ? [{ category: "weekly_goal" as const, amount: unitPoints, label: `${done} × ${POINTS.weeklyGoalPerUnit}` }]
            : []),
          ...(bonusDue
            ? [{ category: "weekly_goal" as const, amount: POINTS.weeklyGoalBonus, label: "target met" }]
            : []),
        ],
        meta: { week_start: weekStart, slot: row.slot, target, done, met },
      });
    }
    records.push({
      weekStart,
      slot: row.slot,
      target,
      done,
      met,
      points,
      flatBonusPaidBefore,
      closedAt: inserted.rows[0].closed_at.toISOString(),
    });
  }

  // R5.11: open tagged tasks, and ones completed after the week ended, move into next week.
  await ensurePair(db, nextWeek);
  const fromId = await appsGoalId(db, weekStart);
  const toId = await appsGoalId(db, nextWeek);
  if (fromId && toId) {
    await db.query(
      `UPDATE weekly_goal_members AS m
       SET goal_id = $2
       FROM tasks AS t
       WHERE m.goal_id = $1
         AND t.id = m.task_id
         AND (t.status = 'open' OR t.completed_at IS NULL OR t.completed_at >= $3)`,
      [fromId, toId, weekEnd],
    );
  }
  return records;
}

export async function listWeeklyGoalRecords(
  db: Queryable,
  opts: { limit?: number } = {},
): Promise<WeeklyGoalRecord[]> {
  const limit = Math.min(Math.max(opts.limit ?? 80, 1), 500);
  const { rows } = await db.query<{
    week_start: string;
    slot: WeeklyGoalSlot;
    target: number;
    done: number;
    met: boolean;
    points: number;
    flat_bonus_paid_before: boolean;
    closed_at: Date;
  }>(
    `SELECT week_start::text AS week_start, slot, target, done, met, points,
            flat_bonus_paid_before, closed_at
     FROM weekly_goal_records
     ORDER BY week_start DESC, CASE slot WHEN 'lc' THEN 0 ELSE 1 END
     LIMIT $1`,
    [limit],
  );
  return rows.map((r) => ({
    weekStart: r.week_start,
    slot: r.slot,
    target: r.target,
    done: r.done,
    met: r.met,
    points: r.points,
    flatBonusPaidBefore: r.flat_bonus_paid_before,
    closedAt: r.closed_at.toISOString(),
  }));
}

/** R5.28: consecutive met weeks per goal, counting back from the last closed week. */
export async function metWeeksStreaks(db: Queryable): Promise<Record<WeeklyGoalSlot, number>> {
  const { rows } = await db.query<{ slot: WeeklyGoalSlot; streak: number }>(
    `WITH ranked AS (
       SELECT slot, met, week_start,
              MAX(week_start) OVER (PARTITION BY slot) AS last_week,
              ROW_NUMBER() OVER (PARTITION BY slot ORDER BY week_start DESC) - 1 AS back
       FROM weekly_goal_records
     ),
     first_break AS (
       SELECT slot, MIN(back) AS back
       FROM ranked
       WHERE NOT met OR week_start <> last_week - (back * 7)::int
       GROUP BY slot
     )
     SELECT r.slot, COALESCE(MIN(b.back), COUNT(*))::int AS streak
     FROM ranked r
     LEFT JOIN first_break b ON b.slot = r.slot
     GROUP BY r.slot`,
  );
  const out: Record<WeeklyGoalSlot, number> = { lc: 0, apps: 0 };
  for (const r of rows) out[r.slot] = r.streak;
  return out;
}

/** The current week's goals, after closing any ended weeks. Null if `tz` isn't valid. */
export async function getWeeklyGoalsSnapshot(
  db: Queryable,
  tz: string,
  now = new Date(),
): Promise<WeeklyGoalsSnapshot | null> {
  if (!isValidTimezone(tz)) return null;
  await closeDueWeeks(db, tz, now);
  const weekStart = mondayOfLocalWeek(now, tz);
  const weekEnd = addCivilDays(weekStart, 6);
  await ensurePair(db, weekStart);
  const rows = await loadGoalRows(db, weekStart);
  const fraction = weekElapsedFraction(now, weekStart, tz);
  const streaks = await metWeeksStreaks(db);
  const goals: WeeklyGoalView[] = [];
  for (const row of rows) {
    const members = row.kind === "task_set" ? await loadMembers(db, row.id) : [];
    goals.push(toView(row, members, fraction, streaks[row.slot]));
  }
  return { tz, weekStart, weekEnd, goals };
}

/** Sets this week's LC target. Progress moves only through LeetCode logging (R5.17). */
export async function patchLcGoal(
  db: Queryable,
  tz: string,
  patch: { targetCount: number },
): Promise<WeeklyGoalsSnapshot | null> {
  if (!isValidTimezone(tz)) return null;
  if (!Number.isInteger(patch.targetCount) || patch.targetCount < 1) {
    throw Object.assign(new Error("targetCount must be a positive integer"), { status: 400 });
  }
  await closeDueWeeks(db, tz);
  const weekStart = mondayOfLocalWeek(new Date(), tz);
  await ensurePair(db, weekStart);
  await db.query(
    `UPDATE weekly_goals SET target_count = $2, updated_at = now()
     WHERE week_start = $1::date AND slot = 'lc'`,
    [weekStart, patch.targetCount],
  );
  return getWeeklyGoalsSnapshot(db, tz);
}

/**
 * Moves the current week's LC progress by `delta` (R5.17), with no cap at the target
 * (R5.14). Call inside the LeetCode write transaction, after `closeDueWeeks`.
 * Throws 409 if a −1 would take progress below 0.
 */
export async function stepLcWeeklyProgress(
  db: Queryable,
  tz: string,
  delta: 1 | -1,
  now = new Date(),
): Promise<{ progress: number; target: number }> {
  const weekStart = mondayOfLocalWeek(now, tz);
  await ensurePair(db, weekStart);
  const { rows } = await db.query<{ id: string; target_count: number; progress_count: number }>(
    `SELECT id, target_count, progress_count FROM weekly_goals
     WHERE week_start = $1::date AND slot = 'lc'
     FOR UPDATE`,
    [weekStart],
  );
  const row = rows[0];
  if (!row) throw new Error("Weekly LC goal is missing");
  if (delta < 0 && row.progress_count <= 0) {
    throw Object.assign(new Error("No weekly solves to remove this week"), { status: 409 });
  }
  const progress = row.progress_count + delta;
  await db.query(
    `UPDATE weekly_goals SET progress_count = $2, updated_at = now() WHERE id = $1`,
    [row.id, progress],
  );
  return { progress, target: row.target_count };
}

export async function setAppTargetMembership(
  db: Queryable,
  tz: string,
  taskId: string,
  member: boolean,
): Promise<WeeklyGoalsSnapshot | null> {
  if (!isValidTimezone(tz)) return null;
  await closeDueWeeks(db, tz);
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
