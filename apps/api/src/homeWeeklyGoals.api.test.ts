import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import {
  createCustomWeeklyGoal,
  stepCustomWeeklyProgress,
} from "./customWeeklyGoals.js";
import { getUpcomingThisWeek, thisWeekSunday } from "./homeUpcoming.js";
import { truncateAll, seedTask } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import { mondayOfLocalWeek } from "./weeklyGoals.js";

const TZ = "America/Los_Angeles";

describe.skipIf(!integrationReady)("home weekly goals (M5-09)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("puts unmet weekly goals on Sunday under Targets; never overdue; no apps when 0 tagged", async () => {
    // Wednesday of the week → Sunday still ahead.
    const now = new Date("2026-03-11T19:00:00Z"); // Wed Mar 11 LA
    const weekStart = mondayOfLocalWeek(now, TZ);
    const sunday = thisWeekSunday(now, TZ);
    expect(sunday).toBe("2026-03-15");

    await pool.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)`,
      [weekStart],
    );
    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count, label)
       VALUES ($1::date, 'lc', 'count', 10, 4, 'Grind 75 Week 4')`,
      [weekStart],
    );
    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'apps', 'task_set', NULL, 0)`,
      [weekStart],
    );

    const upcoming = await getUpcomingThisWeek(pool, TZ, now, 7);
    const targets = upcoming.sections.find((s) => s.key === "targets")!;
    const sundayGroup = targets.dayGroups.find((g) => g.key === sunday);
    expect(sundayGroup).toBeTruthy();
    const goals = sundayGroup!.items.filter((i) => i.kind === "weekly_goal");
    expect(goals).toHaveLength(1);
    expect(goals[0]).toMatchObject({
      slot: "lc",
      title: "Weekly LC goal · Grind 75 Week 4",
      done: 4,
      total: 10,
    });
    expect(targets.dayGroups.some((g) => g.key === "overdue")).toBe(false);

    // Tag an app → apps row appears while unmet.
    const task = await seedTask({ category: "application", title: "Target app", organization: "Acme" });
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM weekly_goals WHERE week_start = $1::date AND slot = 'apps'`,
      [weekStart],
    );
    await pool.query(`INSERT INTO weekly_goal_members (goal_id, task_id) VALUES ($1, $2)`, [
      rows[0].id,
      task.id,
    ]);
    const withApps = await getUpcomingThisWeek(pool, TZ, now, 7);
    const slots = withApps.sections
      .find((s) => s.key === "targets")!
      .dayGroups.flatMap((g) => g.items)
      .filter((i) => i.kind === "weekly_goal")
      .map((i) => i.slot);
    expect(slots).toEqual(["lc", "apps"]);
  });

  it("met goals and Sundays outside the window are omitted; Sunday evening is not overdue", async () => {
    const sundayEvening = new Date("2026-03-16T02:00:00Z"); // Sun Mar 15 evening LA
    const weekStart = mondayOfLocalWeek(sundayEvening, TZ);
    const sunday = thisWeekSunday(sundayEvening, TZ);
    await pool.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)`,
      [weekStart],
    );
    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'lc', 'count', 10, 10)`,
      [weekStart],
    );
    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'apps', 'task_set', NULL, 0)`,
      [weekStart],
    );
    const task = await seedTask({ category: "application", title: "Open app" });
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM weekly_goals WHERE week_start = $1::date AND slot = 'apps'`,
      [weekStart],
    );
    await pool.query(`INSERT INTO weekly_goal_members (goal_id, task_id) VALUES ($1, $2)`, [
      rows[0].id,
      task.id,
    ]);

    const upcoming = await getUpcomingThisWeek(pool, TZ, sundayEvening, 7);
    const targetItems = upcoming.sections
      .find((s) => s.key === "targets")!
      .dayGroups.flatMap((g) => g.items);
    expect(targetItems.some((i) => i.kind === "weekly_goal" && i.slot === "lc")).toBe(false);
    expect(targetItems.some((i) => i.kind === "weekly_goal" && i.slot === "apps")).toBe(true);
    expect(upcoming.sections.find((s) => s.key === "targets")!.dayGroups.some((g) => g.key === "overdue")).toBe(
      false,
    );
    expect(
      upcoming.sections
        .find((s) => s.key === "targets")!
        .dayGroups.some((g) => g.key === sunday),
    ).toBe(true);
  });

  it("includes unmet active customs on Sunday Targets; omits met and archived (F11 M3-05)", async () => {
    const now = new Date("2026-03-11T19:00:00Z");
    const weekStart = mondayOfLocalWeek(now, TZ);
    const sunday = thisWeekSunday(now, TZ);
    await pool.query(`INSERT INTO weekly_close_state (start_week) VALUES ($1::date)`, [weekStart]);
    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'lc', 'count', 10, 10)`,
      [weekStart],
    );
    await pool.query(
      `INSERT INTO weekly_goals (week_start, slot, kind, target_count, progress_count)
       VALUES ($1::date, 'apps', 'task_set', NULL, 0)`,
      [weekStart],
    );

    const gym = await createCustomWeeklyGoal(pool, TZ, { name: "Gym", targetCount: 3 }, now);
    const met = await createCustomWeeklyGoal(pool, TZ, { name: "Met", targetCount: 2 }, now);
    await stepCustomWeeklyProgress(pool, met.id, TZ, 1, now);
    await stepCustomWeeklyProgress(pool, met.id, TZ, 1, now);
    const archived = await createCustomWeeklyGoal(
      pool,
      TZ,
      { name: "Archived", targetCount: 3 },
      now,
    );
    await pool.query(`UPDATE custom_weekly_goals SET archived_at = now() WHERE id = $1::uuid`, [
      archived.id,
    ]);

    const upcoming = await getUpcomingThisWeek(pool, TZ, now, 7);
    const goals = upcoming.sections
      .find((s) => s.key === "targets")!
      .dayGroups.find((g) => g.key === sunday)!
      .items.filter((i) => i.kind === "weekly_goal");

    expect(goals.map((g) => ({ slot: g.slot, title: g.title, done: g.done, total: g.total }))).toEqual([
      {
        slot: "custom",
        title: "Weekly · Gym",
        done: 0,
        total: 3,
      },
    ]);
    expect(goals[0]).toMatchObject({ customGoalId: gym.id });
    expect(goals.some((g) => (g.title ?? "").includes("Met"))).toBe(false);
    expect(goals.some((g) => (g.title ?? "").includes("Archived"))).toBe(false);
  });
});
