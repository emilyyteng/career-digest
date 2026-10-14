import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { apiClient } from "./test/apiClient.js";
import { seedTask, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";
import {
  getWeeklyGoalsSnapshot,
  mondayOfLocalWeek,
  visibleCharLength,
} from "./weeklyGoals.js";

const TZ = "UTC";
const LA = "America/Los_Angeles";
/** Mon Mar 2 – Sun Mar 8, 2026 (LA); next week starts Mar 9. */
const W1 = "2026-03-02";
const W2 = "2026-03-09";
const IN_W2 = new Date("2026-03-11T19:00:00Z");

describe.skipIf(!integrationReady)("weekly goals API", () => {
  it("ensures lc+apps pair; lc patch sets the target and solves move progress", async () => {
    await truncateAll();
    const getRes = await apiClient().get(`/api/weekly-goals?tz=${encodeURIComponent(TZ)}`).expect(200);
    expect(getRes.body.goals.map((g: { slot: string }) => g.slot).sort()).toEqual([
      "apps",
      "lc",
    ]);
    const lc = getRes.body.goals.find((g: { slot: string }) => g.slot === "lc");
    expect(lc.targetCount).toBeGreaterThanOrEqual(1);

    const patch = await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${encodeURIComponent(TZ)}`)
      .send({ targetCount: 12 })
      .expect(200);
    const lc2 = patch.body.goals.find((g: { slot: string }) => g.slot === "lc");
    expect(lc2.targetCount).toBe(12);
    expect(lc2.progressCount).toBe(0);

    for (let i = 0; i < 3; i += 1) {
      await apiClient()
        .patch(`/api/progress/leetcode?tz=${encodeURIComponent(TZ)}`)
        .send({ tier: "medium", delta: 1, type: "weekly" })
        .expect(200);
    }
    const after = await apiClient().get(`/api/weekly-goals?tz=${encodeURIComponent(TZ)}`).expect(200);
    const lc3 = after.body.goals.find((g: { slot: string }) => g.slot === "lc");
    expect(lc3.progressCount).toBe(3);
    expect(lc3.done).toBe(3);
  });

  it("a weekly +1 raises both the day's tier and the weekly progress", async () => {
    await truncateAll();
    const today = localDateInTimezone(new Date(), TZ);
    const res = await apiClient()
      .patch(`/api/progress/leetcode?tz=${encodeURIComponent(TZ)}`)
      .send({ tier: "easy", delta: 1, type: "weekly" })
      .expect(200);
    expect(res.body.weeklyProgress).toBe(1);
    expect(res.body.tiers).toEqual({ easy: 1, medium: 0, hard: 0 });

    const row = await pool.query<{ count: number; easy_count: number }>(
      `SELECT count, easy_count FROM leetcode_daily WHERE local_date = $1::date`,
      [today],
    );
    expect(row.rows[0]).toEqual({ count: 1, easy_count: 1 });
  });

  it("rejects progressCount on the weekly LC route", async () => {
    await apiClient()
      .patch(`/api/weekly-goals/lc?tz=${encodeURIComponent(TZ)}`)
      .send({ targetCount: 10, progressCount: 3 })
      .expect(400);
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

  it("saves, trims, and clears the LC label; 51 characters → 400", async () => {
    await truncateAll();
    const q = `?tz=${encodeURIComponent(TZ)}`;
    const saved = await apiClient()
      .patch(`/api/weekly-goals/lc${q}`)
      .send({ label: "  Grind 75 Week 4  " })
      .expect(200);
    expect(saved.body.goals.find((g: { slot: string }) => g.slot === "lc")).toMatchObject({
      label: "Grind 75 Week 4",
    });

    const cleared = await apiClient()
      .patch(`/api/weekly-goals/lc${q}`)
      .send({ label: "   " })
      .expect(200);
    expect(cleared.body.goals.find((g: { slot: string }) => g.slot === "lc").label).toBeNull();

    const fifty = "x".repeat(50);
    await apiClient().patch(`/api/weekly-goals/lc${q}`).send({ label: fifty }).expect(200);
    const tooLong = await apiClient()
      .patch(`/api/weekly-goals/lc${q}`)
      .send({ label: fifty + "y" })
      .expect(400);
    expect(tooLong.body.error).toMatch(/at most 50/);
    const after = await apiClient().get(`/api/weekly-goals${q}`).expect(200);
    expect(after.body.goals.find((g: { slot: string }) => g.slot === "lc").label).toBe(fifty);

    // Emoji counts as one character (matches Postgres char_length).
    const emoji50 = "🔥".repeat(50);
    expect(visibleCharLength(emoji50)).toBe(50);
    await apiClient().patch(`/api/weekly-goals/lc${q}`).send({ label: emoji50 }).expect(200);
    await apiClient()
      .patch(`/api/weekly-goals/lc${q}`)
      .send({ label: emoji50 + "🔥" })
      .expect(400);
  });

  it("database refuses a label on the apps goal", async () => {
    await truncateAll();
    await apiClient().get(`/api/weekly-goals?tz=${encodeURIComponent(TZ)}`).expect(200);
    await expect(
      pool.query(
        `UPDATE weekly_goals SET label = 'nope' WHERE slot = 'apps' AND week_start = (
           SELECT week_start FROM weekly_goals WHERE slot = 'lc' LIMIT 1
         )`,
      ),
    ).rejects.toThrow(/weekly_goals_label_lc_only|check constraint/i);
  });

  it("new week clears the label and carries the target (America/Los_Angeles)", async () => {
    await truncateAll();
    await pool.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)
       ON CONFLICT (singleton) DO UPDATE SET start_week = EXCLUDED.start_week`,
      [W1],
    );
    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count, label)
       VALUES ($1::date, 'lc', 'count', 15, 3, 'Grind 75 Week 4')`,
      [W1],
    );

    const snap = await getWeeklyGoalsSnapshot(pool, LA, IN_W2);
    expect(snap?.weekStart).toBe(W2);
    expect(snap?.goals.find((g) => g.slot === "lc")).toMatchObject({
      targetCount: 15,
      progressCount: 0,
      label: null,
    });

    const { rows } = await pool.query<{ label: string | null }>(
      `SELECT label FROM weekly_goals WHERE week_start = $1::date AND slot = 'lc'`,
      [W1],
    );
    expect(rows[0]?.label).toBe("Grind 75 Week 4");
  });
});
