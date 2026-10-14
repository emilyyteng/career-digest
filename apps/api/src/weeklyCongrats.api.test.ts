import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { addCivilDays } from "./homeUpcoming.js";
import { truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import { getHomeDashboard } from "./home.js";
import { getWeeklyCongrats } from "./weeklyCongrats.js";
import { mondayOfLocalWeek } from "./weeklyGoals.js";

const TZ = "America/Los_Angeles";

async function seedRecord(
  weekStart: string,
  slot: "lc" | "apps",
  target: number,
  done: number,
  met: boolean,
  points: number,
) {
  await pool.query(
    `INSERT INTO weekly_goal_records
       (week_start, slot, target, done, met, points, flat_bonus_paid_before)
     VALUES ($1::date, $2, $3, $4, $5, $6, false)`,
    [weekStart, slot, target, done, met, points],
  );
}

describe.skipIf(!integrationReady)("weekly congrats (M5-02)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("returns only met goals from last week with streaks; null when none met", async () => {
    const now = new Date("2026-03-11T19:00:00Z"); // in W2 (week of Mar 9)
    const last = addCivilDays(mondayOfLocalWeek(now, TZ), -7); // 2026-03-02
    await pool.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)`,
      [last],
    );
    await seedRecord(last, "lc", 10, 12, true, 340);
    await seedRecord(last, "apps", 5, 3, false, 60);

    const bothWait = await getWeeklyCongrats(pool, TZ, now);
    expect(bothWait).toMatchObject({
      weekStart: last,
      weekLabel: "Week of Mar 2",
      goals: [{ slot: "lc", done: 12, target: 10, points: 340, metWeeksStreak: 1 }],
    });

    await seedRecord(addCivilDays(last, -7), "lc", 10, 10, true, 300);
    const streaked = await getWeeklyCongrats(pool, TZ, now);
    expect(streaked?.goals[0]?.metWeeksStreak).toBe(2);

    await truncateAll();
    await pool.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)`,
      [last],
    );
    await seedRecord(last, "lc", 10, 4, false, 80);
    await seedRecord(last, "apps", 0, 0, false, 0);
    expect(await getWeeklyCongrats(pool, TZ, now)).toBeNull();
  });

  it("0/0 apps is never met and never appears", async () => {
    const now = new Date("2026-03-11T19:00:00Z");
    const last = addCivilDays(mondayOfLocalWeek(now, TZ), -7);
    await pool.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)`,
      [last],
    );
    await seedRecord(last, "apps", 0, 0, false, 0);
    await seedRecord(last, "lc", 10, 10, true, 300);
    const res = await getWeeklyCongrats(pool, TZ, now);
    expect(res?.goals.map((g) => g.slot)).toEqual(["lc"]);
  });
});

  it("GET /api/home includes weeklyCongrats for last week's met goals", async () => {
    const now = new Date("2026-03-11T19:00:00Z");
    const last = addCivilDays(mondayOfLocalWeek(now, TZ), -7);
    await pool.query(
      `INSERT INTO weekly_close_state (start_week) VALUES ($1::date)`,
      [last],
    );
    await pool.query(
      `INSERT INTO weekly_goal_records
         (week_start, slot, target, done, met, points, flat_bonus_paid_before)
       VALUES ($1::date, 'lc', 10, 12, true, 340, false),
              ($1::date, 'apps', 5, 5, true, 200, false)`,
      [last],
    );

    const dash = await getHomeDashboard(TZ, 7, now);
    expect(dash.weeklyCongrats).toMatchObject({
      weekStart: last,
      goals: [
        { slot: "lc", done: 12, target: 10, points: 340 },
        { slot: "apps", done: 5, target: 5, points: 200 },
      ],
    });
  });

