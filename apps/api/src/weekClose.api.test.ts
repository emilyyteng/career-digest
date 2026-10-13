import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { addCivilDays } from "./homeUpcoming.js";
import { recordEarn } from "./pointsLedger.js";
import { apiClient } from "./test/apiClient.js";
import { seedCompany, seedPosting, seedTask, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import {
  closeDueWeeks,
  getWeeklyGoalsSnapshot,
  mondayOfLocalWeek,
  setAppTargetMembership,
} from "./weeklyGoals.js";

const TZ = "America/Los_Angeles";
/** Mon Mar 2 – Sun Mar 8, 2026; DST starts Sunday Mar 8, so the week ends at 07:00Z. */
const W1 = "2026-03-02";
const W2 = "2026-03-09";
const W3 = "2026-03-16";
const IN_W2 = new Date("2026-03-11T19:00:00Z");
const IN_W3 = new Date("2026-03-18T19:00:00Z");

async function startAt(week: string) {
  await pool.query(
    `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)
     ON CONFLICT (singleton) DO UPDATE SET start_week = EXCLUDED.start_week`,
    [week],
  );
}

async function lcWeek(week: string, target: number, progress: number) {
  await pool.query(
    `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
     VALUES ($1::date, 'lc', 'count', $2, $3)`,
    [week, target, progress],
  );
}

/** Tags application tasks into a week's apps goal. `completedAt` null leaves a task open. */
async function appsWeek(week: string, tasks: Array<Date | null>): Promise<string[]> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
     VALUES ($1::date, 'apps', 'task_set', NULL, 0)
     ON CONFLICT (week_start, slot) DO UPDATE SET updated_at = now()
     RETURNING id`,
    [week],
  );
  const ids: string[] = [];
  for (const [i, completedAt] of tasks.entries()) {
    const task = await seedTask({
      category: "application",
      title: `App ${i + 1}`,
      status: completedAt ? "completed" : "open",
      completedAt,
    });
    await pool.query(`INSERT INTO weekly_goal_members (goal_id, task_id) VALUES ($1, $2)`, [
      rows[0].id,
      task.id,
    ]);
    ids.push(task.id);
  }
  return ids;
}

function times<T>(n: number, value: T): T[] {
  return Array.from({ length: n }, () => value);
}

async function records() {
  const { rows } = await pool.query<{
    week_start: string;
    slot: string;
    target: number;
    done: number;
    met: boolean;
    points: number;
    flat_bonus_paid_before: boolean;
  }>(
    `SELECT week_start::text AS week_start, slot, target, done, met, points, flat_bonus_paid_before
     FROM weekly_goal_records ORDER BY week_start, slot`,
  );
  return rows;
}

async function weeklyEarns() {
  const { rows } = await pool.query<{ source_type: string; source_id: string; amount: number }>(
    `SELECT source_type, source_id, amount FROM points_events
     WHERE category = 'weekly_goal' ORDER BY source_id`,
  );
  return rows;
}

async function membersOf(week: string): Promise<string[]> {
  const { rows } = await pool.query<{ task_id: string }>(
    `SELECT m.task_id FROM weekly_goal_members m
     JOIN weekly_goals g ON g.id = m.goal_id
     WHERE g.week_start = $1::date AND g.slot = 'apps'`,
    [week],
  );
  return rows.map((r) => r.task_id).sort();
}

const DONE_IN_W1 = new Date("2026-03-04T18:00:00Z");

let postingSeq = 0;
/** An open application task with its to-do application, so mark applied works on it. */
async function applicationTask(): Promise<string> {
  postingSeq += 1;
  const company = await seedCompany({ name: `Week Co ${postingSeq}` });
  const posting = await seedPosting({
    source: "greenhouse",
    externalId: `week-${postingSeq}`,
    companyId: company.id,
    title: "SWE Intern",
    url: `https://boards.greenhouse.io/week/jobs/${postingSeq}`,
  });
  const res = await apiClient().post("/api/tasks/from-posting").send({ postingId: posting.id }).expect(201);
  return res.body.id as string;
}

describe.skipIf(!integrationReady)("week close and records (M5-05)", () => {
  it("6/10 apps records 6/10, not met, +120; open tasks move to the next week", async () => {
    await truncateAll();
    await startAt(W1);
    await lcWeek(W1, 10, 0);
    const ids = await appsWeek(W1, [...times(6, DONE_IN_W1), ...times(4, null)]);

    await closeDueWeeks(pool, TZ, IN_W2);

    expect(await records()).toEqual([
      { week_start: W1, slot: "apps", target: 10, done: 6, met: false, points: 120, flat_bonus_paid_before: false },
      { week_start: W1, slot: "lc", target: 10, done: 0, met: false, points: 0, flat_bonus_paid_before: false },
    ]);
    expect(await weeklyEarns()).toEqual([
      { source_type: "weekly_record", source_id: `${W1}:apps`, amount: 120 },
    ]);
    expect(await membersOf(W2)).toEqual(ids.slice(6).sort());
    expect(await membersOf(W1)).toEqual(ids.slice(0, 6).sort());

    const snap = await getWeeklyGoalsSnapshot(pool, TZ, IN_W2);
    expect(snap?.goals.find((g) => g.slot === "apps")).toMatchObject({ done: 0, total: 4 });
    expect((await records())[0]).toMatchObject({ done: 6, target: 10 });
  });

  it("10/10 apps: met, +300. LC 12/10: met, +340", async () => {
    await truncateAll();
    await startAt(W1);
    await lcWeek(W1, 10, 12);
    await appsWeek(W1, times(10, DONE_IN_W1));

    await closeDueWeeks(pool, TZ, IN_W2);

    expect((await records()).map((r) => [r.slot, r.done, r.target, r.met, r.points])).toEqual([
      ["apps", 10, 10, true, 300],
      ["lc", 12, 10, true, 340],
    ]);
    const earns = await pool.query<{ message: string; breakdown: unknown }>(
      `SELECT message, breakdown FROM points_events WHERE source_id = $1`,
      [`${W1}:lc`],
    );
    expect(earns.rows[0]).toEqual({
      message: "Week of Mar 2 · LC 12/10 · +340 points",
      breakdown: [
        { category: "weekly_goal", amount: 240, label: "12 × 20" },
        { category: "weekly_goal", amount: 100, label: "target met" },
      ],
    });
  });

  it("0/0 apps is recorded, not met, with no points", async () => {
    await truncateAll();
    await startAt(W1);
    await lcWeek(W1, 10, 3);

    await closeDueWeeks(pool, TZ, IN_W2);

    expect((await records()).find((r) => r.slot === "apps")).toMatchObject({
      target: 0,
      done: 0,
      met: false,
      points: 0,
    });
    expect((await weeklyEarns()).map((e) => e.source_id)).toEqual([`${W1}:lc`]);
  });

  it("two weeks without a visit close in order and members carry forward", async () => {
    await truncateAll();
    await startAt(W1);
    await lcWeek(W1, 7, 7);
    const [done, open] = await appsWeek(W1, [DONE_IN_W1, null]);

    const closed = await closeDueWeeks(pool, TZ, IN_W3);

    expect(closed.map((r) => `${r.weekStart}:${r.slot}`)).toEqual([
      `${W1}:lc`,
      `${W1}:apps`,
      `${W2}:lc`,
      `${W2}:apps`,
    ]);
    expect((await records()).map((r) => [r.week_start, r.slot, r.done, r.target])).toEqual([
      [W1, "apps", 1, 2],
      [W1, "lc", 7, 7],
      [W2, "apps", 0, 1],
      [W2, "lc", 0, 7],
    ]);
    expect(await membersOf(W1)).toEqual([done]);
    expect(await membersOf(W2)).toEqual([]);
    expect(await membersOf(W3)).toEqual([open]);
  });

  it("concurrent requests close a week exactly once", async () => {
    await truncateAll();
    await startAt(W1);
    await lcWeek(W1, 5, 6);
    await appsWeek(W1, times(3, DONE_IN_W1));

    await Promise.all(times(6, null).map(() => getWeeklyGoalsSnapshot(pool, TZ, IN_W2)));

    expect(await records()).toHaveLength(2);
    expect((await weeklyEarns()).map((e) => [e.source_id, e.amount])).toEqual([
      [`${W1}:apps`, 160],
      [`${W1}:lc`, 220],
    ]);
  });

  it("week boundaries follow the local time zone, and a late completion counts toward the next week", async () => {
    await truncateAll();
    await startAt(W1);
    await lcWeek(W1, 10, 0);
    const sundayNight = new Date("2026-03-09T06:30:00Z"); // Sun Mar 8, 23:30 PDT
    const mondayEarly = new Date("2026-03-09T08:00:00Z"); // Mon Mar 9, 01:00 PDT
    const [, late] = await appsWeek(W1, [sundayNight, mondayEarly]);

    await closeDueWeeks(pool, TZ, IN_W2);

    expect((await records()).find((r) => r.slot === "apps")).toMatchObject({ done: 1, target: 2 });
    expect(await membersOf(W2)).toEqual([late]);
    const snap = await getWeeklyGoalsSnapshot(pool, TZ, IN_W2);
    expect(snap?.goals.find((g) => g.slot === "apps")).toMatchObject({ done: 1, total: 1 });
  });

  it("the switch-over week doesn't pay the flat bonus twice; earlier weeks get no record", async () => {
    await truncateAll();
    await startAt(W2);
    await lcWeek(W1, 10, 10);
    await lcWeek(W2, 10, 12);
    await recordEarn(pool, {
      category: "weekly_goal",
      amount: 100,
      message: "Weekly LC target met! · +100 points",
      sourceType: "weekly_goal",
      sourceId: `${W2}:lc`,
    });

    await closeDueWeeks(pool, TZ, IN_W3);

    expect((await records()).map((r) => [r.week_start, r.slot, r.points, r.flat_bonus_paid_before])).toEqual([
      [W2, "apps", 0, false],
      [W2, "lc", 340, true],
    ]);
    expect((await weeklyEarns()).map((e) => [e.source_type, e.amount])).toEqual([
      ["weekly_goal", 100],
      ["weekly_record", 240],
    ]);
  });

  it("the first check only records the switch-over week and adopts stranded open tasks", async () => {
    await truncateAll();
    await lcWeek(W1, 10, 10);
    const [open, done] = await appsWeek(W1, [null, DONE_IN_W1]);

    expect(await closeDueWeeks(pool, TZ, IN_W3)).toEqual([]);
    const state = await pool.query<{ start_week: string }>(
      `SELECT start_week::text AS start_week FROM weekly_close_state`,
    );
    expect(state.rows[0].start_week).toBe(W3);
    expect(await records()).toEqual([]);
    expect(await membersOf(W3)).toEqual([open]);
    expect(await membersOf(W1)).toEqual([done]);
  });

  it("no weekly points are awarded mid-week when a target is hit", async () => {
    await truncateAll();
    const tz = "UTC";
    await startAt(mondayOfLocalWeek(new Date(), tz));
    const taskId = await applicationTask();
    await apiClient()
      .put(`/api/weekly-goals/apps/members/${taskId}?tz=${tz}`)
      .send({ member: true })
      .expect(200);
    await apiClient().post(`/api/tasks/${taskId}/complete?tz=${tz}`).send({}).expect(200);
    await apiClient().patch(`/api/weekly-goals/lc?tz=${tz}`).send({ targetCount: 2, progressCount: 2 }).expect(200);
    await apiClient().patch(`/api/progress/leetcode?tz=${tz}`).send({ delta: 1 }).expect(200);

    expect(await weeklyEarns()).toEqual([]);
    const snap = await getWeeklyGoalsSnapshot(pool, tz);
    expect(snap?.goals.find((g) => g.slot === "apps")).toMatchObject({ done: 1, total: 1 });
  });

  it("LC progress can pass the target, and lowering the target keeps it", async () => {
    await truncateAll();
    const tz = "UTC";
    await startAt(mondayOfLocalWeek(new Date(), tz));
    const over = await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${tz}`)
      .send({ targetCount: 10, progressCount: 12 })
      .expect(200);
    expect(over.body.goals.find((g: { slot: string }) => g.slot === "lc")).toMatchObject({
      targetCount: 10,
      progressCount: 12,
      done: 12,
      total: 10,
      pace: { label: "on_track" },
    });
    const lowered = await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${tz}`)
      .send({ targetCount: 5 })
      .expect(200);
    expect(lowered.body.goals.find((g: { slot: string }) => g.slot === "lc")).toMatchObject({
      done: 12,
      total: 5,
    });
  });

  it("after close, a late weekly solve raises the current week and the record stays fixed", async () => {
    await truncateAll();
    const tz = "UTC";
    const current = mondayOfLocalWeek(new Date(), tz);
    const last = addCivilDays(current, -7);
    await startAt(last);
    await lcWeek(last, 10, 4);

    await apiClient().get(`/api/weekly-goals?tz=${tz}`).expect(200);
    const res = await apiClient().patch(`/api/weekly-goals/lc?tz=${tz}`).send({ progressCount: 1 }).expect(200);

    expect(res.body.weekStart).toBe(current);
    expect(res.body.goals.find((g: { slot: string }) => g.slot === "lc")).toMatchObject({ done: 1 });
    expect((await records()).find((r) => r.slot === "lc")).toMatchObject({ week_start: last, done: 4, points: 80 });
    expect((await weeklyEarns()).map((e) => e.amount)).toEqual([80]);
  });

  it("untagging an open task shrinks the goal; a deleted tagged task drops out (R5.24)", async () => {
    await truncateAll();
    const tz = "UTC";
    await startAt(mondayOfLocalWeek(new Date(), tz));
    const [done, untagged, deleted] = [await applicationTask(), await applicationTask(), await applicationTask()];
    for (const id of [done, untagged, deleted]) await setAppTargetMembership(pool, tz, id, true);
    await apiClient().post(`/api/tasks/${done}/complete?tz=${tz}`).send({}).expect(200);

    await setAppTargetMembership(pool, tz, untagged, false);
    await apiClient().delete(`/api/tasks/${deleted}`).expect(200);

    const snap = await getWeeklyGoalsSnapshot(pool, tz);
    expect(snap?.goals.find((g) => g.slot === "apps")).toMatchObject({ done: 1, total: 1 });
  });

  it("each goal's run of consecutive met weeks is in the snapshot", async () => {
    await truncateAll();
    const W0 = addCivilDays(W1, -7);
    await startAt(W0);
    await lcWeek(W0, 1, 0);
    await lcWeek(W1, 1, 1);
    await lcWeek(W2, 1, 2);
    await appsWeek(W2, [new Date("2026-03-10T18:00:00Z")]);

    const snap = await getWeeklyGoalsSnapshot(pool, TZ, IN_W3);
    expect(Object.fromEntries(snap!.goals.map((g) => [g.slot, g.metWeeksStreak]))).toEqual({
      lc: 2,
      apps: 1,
    });
  });

  it("the completions diary lists each closed week per goal on its close date", async () => {
    await truncateAll();
    const tz = "UTC";
    const current = mondayOfLocalWeek(new Date(), tz);
    const last = addCivilDays(current, -7);
    await startAt(last);
    await lcWeek(last, 10, 12);

    const res = await apiClient().get(`/api/progress/completions?tz=${tz}&kind=weekly`).expect(200);
    const label = new Date(`${last}T12:00:00Z`).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      timeZone: "UTC",
    });
    expect(res.body.items).toEqual([
      expect.objectContaining({
        kind: "weekly",
        title: "LC 12/10",
        subtitle: `Week of ${label} · 12 × 20 + 100 · target met`,
        points: 340,
        localDate: new Date().toISOString().slice(0, 10),
        weekly: { slot: "lc", weekStart: last, target: 10, done: 12, met: true, points: 340 },
      }),
      expect.objectContaining({
        kind: "weekly",
        title: "Apps 0/0",
        subtitle: `Week of ${label} · no tagged applications`,
        points: 0,
      }),
    ]);
    expect(res.body.stats.allTime.weekly).toBe(2);

    const all = await apiClient().get(`/api/progress/completions?tz=${tz}`).expect(200);
    expect(all.body.items.filter((i: { kind: string }) => i.kind === "weekly")).toHaveLength(2);
  });

  it("mark applied without a time zone leaves ended weeks open; with one, it closes them", async () => {
    await truncateAll();
    const tz = "UTC";
    const current = mondayOfLocalWeek(new Date(), tz);
    await startAt(addCivilDays(current, -7));
    const first = await applicationTask();
    const second = await applicationTask();

    await apiClient().post(`/api/tasks/${first}/complete`).send({}).expect(200);
    expect(await records()).toEqual([]);

    await apiClient().post(`/api/tasks/${second}/complete?tz=${tz}`).send({}).expect(200);
    expect(await records()).toHaveLength(2);
  });
});
