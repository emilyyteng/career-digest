import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { apiClient } from "./test/apiClient.js";
import { seedTask, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";
import { mondayOfLocalWeek } from "./weeklyGoals.js";

const TZ = "UTC";

describe.skipIf(!integrationReady)("weekly goals API", () => {
  it("ensures lc+apps pair and patches lc progress/target", async () => {
    const getRes = await apiClient().get(`/api/weekly-goals?tz=${encodeURIComponent(TZ)}`).expect(200);
    expect(getRes.body.goals.map((g: { slot: string }) => g.slot).sort()).toEqual([
      "apps",
      "lc",
    ]);
    const lc = getRes.body.goals.find((g: { slot: string }) => g.slot === "lc");
    expect(lc.targetCount).toBeGreaterThanOrEqual(1);

    const patch = await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${encodeURIComponent(TZ)}`)
      .send({ targetCount: 12, progressCount: 3 })
      .expect(200);
    const lc2 = patch.body.goals.find((g: { slot: string }) => g.slot === "lc");
    expect(lc2.targetCount).toBe(12);
    expect(lc2.progressCount).toBe(3);
    expect(lc2.done).toBe(3);
  });

  it("weekly LC progress delta bumps today's daily LC stepper", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await pool.query(`DELETE FROM leetcode_daily WHERE local_date = $1::date`, [today]);

    await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${encodeURIComponent(TZ)}`)
      .send({ targetCount: 20, progressCount: 2 })
      .expect(200);

    const afterSet = await pool.query<{ count: number }>(
      `SELECT count FROM leetcode_daily WHERE local_date = $1::date`,
      [today],
    );
    // Absolute set from whatever prior weekly value — only assert the next delta.
    const baseline = afterSet.rows[0]?.count ?? 0;

    await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${encodeURIComponent(TZ)}`)
      .send({ progressCount: 5 })
      .expect(200);

    const bumped = await pool.query<{ count: number }>(
      `SELECT count FROM leetcode_daily WHERE local_date = $1::date`,
      [today],
    );
    expect(bumped.rows[0]?.count).toBe(baseline + 3);

    await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${encodeURIComponent(TZ)}`)
      .send({ progressCount: 4 })
      .expect(200);

    const reduced = await pool.query<{ count: number }>(
      `SELECT count FROM leetcode_daily WHERE local_date = $1::date`,
      [today],
    );
    expect(reduced.rows[0]?.count).toBe(baseline + 2);
  });

  it("tags application tasks into apps set and carries open members at week close", async () => {
    await truncateAll();
    const task = await seedTask({
      category: "application",
      title: "Weekly target app",
      organization: "Acme",
    });

    const put = await apiClient()
      .put(`/api/weekly-goals/apps/members/${task.id}?tz=${encodeURIComponent(TZ)}`)
      .send({ member: true })
      .expect(200);
    const apps = put.body.goals.find((g: { slot: string }) => g.slot === "apps");
    expect(apps.members.some((m: { taskId: string }) => m.taskId === task.id)).toBe(true);
    expect(apps.total).toBeGreaterThanOrEqual(1);

    const weekStart = mondayOfLocalWeek(new Date(), TZ);
    const prevStart = addCivilDays(weekStart, -7);

    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'apps', 'task_set', NULL, 0)
       ON CONFLICT (week_start, slot) DO NOTHING`,
      [prevStart],
    );
    await pool.query(
      `UPDATE weekly_goal_members AS m
       SET goal_id = prev.id
       FROM weekly_goals AS curr, weekly_goals AS prev
       WHERE m.task_id = $3
         AND curr.week_start = $1::date AND curr.slot = 'apps'
         AND prev.week_start = $2::date AND prev.slot = 'apps'
         AND m.goal_id = curr.id`,
      [weekStart, prevStart, task.id],
    );
    await pool.query(`UPDATE weekly_close_state SET start_week = $1::date`, [prevStart]);

    const again = await apiClient()
      .get(`/api/weekly-goals?tz=${encodeURIComponent(TZ)}`)
      .expect(200);
    const apps2 = again.body.goals.find((g: { slot: string }) => g.slot === "apps");
    expect(apps2.members.some((m: { taskId: string }) => m.taskId === task.id)).toBe(true);

    const clear = await apiClient()
      .put(`/api/weekly-goals/apps/members/${task.id}?tz=${encodeURIComponent(TZ)}`)
      .send({ member: false })
      .expect(200);
    const apps3 = clear.body.goals.find((g: { slot: string }) => g.slot === "apps");
    expect(apps3.members.some((m: { taskId: string }) => m.taskId === task.id)).toBe(false);
  });
});
