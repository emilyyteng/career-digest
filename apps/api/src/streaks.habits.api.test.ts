import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";
import {
  getHabitStreak,
  habitDailySourceId,
  habitMilestoneSourceId,
  setHabitCheckoff,
  syncHabitStreakForDay,
  syncStreakForDay,
} from "./streaks.js";
import {
  seedCustomHabit,
  seedCustomHabitDay,
  seedLeetcodeDaily,
  truncateAll,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";

async function streakEvents() {
  const { rows } = await pool.query<{
    kind: string;
    amount: number;
    source_type: string;
    source_id: string;
  }>(
    `SELECT kind, amount, source_type, source_id
     FROM points_events
     WHERE category = 'streak'
     ORDER BY created_at, id`,
  );
  return rows;
}

async function setLaunch(date: string) {
  await pool.query(
    `INSERT INTO streak_state (singleton, launch_date) VALUES (true, $1::date)
     ON CONFLICT (singleton) DO UPDATE SET launch_date = EXCLUDED.launch_date`,
    [date],
  );
}

describe.skipIf(!integrationReady)("custom habit streaks + points (F11 M1-02)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("empty checkoffs → length 0 / todayCounts false; today checkoff awards day-1 daily", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    const habit = await seedCustomHabit({ name: "Gym" });

    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 0,
      todayCounts: false,
    });

    const view = await setHabitCheckoff(pool, habit.id, TZ, today, true);
    expect(view).toEqual({ length: 1, todayCounts: true });
    expect((await streakEvents()).filter((e) => e.kind === "earn")).toEqual([
      expect.objectContaining({
        amount: 2,
        source_type: "streak_daily",
        source_id: habitDailySourceId(habit.id, today),
      }),
    ]);
  });

  it("today unchecked keeps yesterday's run (today does not break until day ends)", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const habit = await seedCustomHabit({ name: "Read" });
    await seedCustomHabitDay(habit.id, addCivilDays(today, -2));
    await seedCustomHabitDay(habit.id, addCivilDays(today, -1));

    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 2,
      todayCounts: false,
    });
  });

  it("gap breaks the run; yesterday-only with a gap before is length 1", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const habit = await seedCustomHabit({ name: "Walk" });
    await seedCustomHabitDay(habit.id, addCivilDays(today, -4));
    await seedCustomHabitDay(habit.id, addCivilDays(today, -1));

    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 1,
      todayCounts: false,
    });
  });

  it("undo today reverses daily; re-checkoff reinstates", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    const habit = await seedCustomHabit({ name: "Meditate" });

    await setHabitCheckoff(pool, habit.id, TZ, today, true);
    await setHabitCheckoff(pool, habit.id, TZ, today, false);

    const dailyId = habitDailySourceId(habit.id, today);
    const cleared = (await streakEvents()).filter((e) => e.source_id === dailyId);
    expect(cleared.some((e) => e.kind === "reverse")).toBe(true);
    expect(cleared.reduce((sum, e) => sum + e.amount, 0)).toBe(0);
    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 0,
      todayCounts: false,
    });

    await setHabitCheckoff(pool, habit.id, TZ, today, true);
    const reinstated = (await streakEvents()).filter((e) => e.source_id === dailyId);
    expect(reinstated.reduce((sum, e) => sum + e.amount, 0)).toBe(2);
    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 1,
      todayCounts: true,
    });
  });

  it("milestone at length 5 pays daily + milestone; undo reverses both", async () => {
    const day = "2026-03-05";
    const now = new Date("2026-03-05T12:00:00Z");
    await setLaunch("2026-01-01");
    const habit = await seedCustomHabit({ name: "Write" });
    for (let i = 0; i < 5; i += 1) {
      await seedCustomHabitDay(habit.id, addCivilDays("2026-03-01", i));
    }

    await syncHabitStreakForDay(pool, habit.id, TZ, day, true, now);

    const earns = (await streakEvents()).filter((e) => e.kind === "earn");
    expect(earns).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          source_type: "streak_daily",
          source_id: habitDailySourceId(habit.id, day),
          amount: 10,
        }),
        expect.objectContaining({
          source_type: "streak_milestone",
          source_id: habitMilestoneSourceId(habit.id, "2026-03-01", 5),
          amount: 25,
        }),
      ]),
    );

    await pool.query(
      `DELETE FROM custom_habit_days WHERE habit_id = $1::uuid AND local_date = $2::date`,
      [habit.id, day],
    );
    await syncHabitStreakForDay(pool, habit.id, TZ, day, false, now);

    const dailyNet = (await streakEvents())
      .filter((e) => e.source_id === habitDailySourceId(habit.id, day))
      .reduce((sum, e) => sum + e.amount, 0);
    const milestoneNet = (await streakEvents())
      .filter(
        (e) => e.source_id === habitMilestoneSourceId(habit.id, "2026-03-01", 5),
      )
      .reduce((sum, e) => sum + e.amount, 0);
    expect(dailyNet).toBe(0);
    expect(milestoneNet).toBe(0);
  });

  it("past local dates change history but award no points", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const past = addCivilDays(today, -2);
    await setLaunch(addCivilDays(today, -5));
    const habit = await seedCustomHabit({ name: "Practice" });
    await seedCustomHabitDay(habit.id, addCivilDays(today, -1));

    await setHabitCheckoff(pool, habit.id, TZ, past, true);

    expect(await streakEvents()).toEqual([]);
    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 2,
      todayCounts: false,
    });
  });

  it("second habit and LC use distinct source_ids (no collision)", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    const a = await seedCustomHabit({ name: "A" });
    const b = await seedCustomHabit({ name: "B" });

    await setHabitCheckoff(pool, a.id, TZ, today, true);
    await setHabitCheckoff(pool, b.id, TZ, today, true);
    await seedLeetcodeDaily(today, 1);
    await syncStreakForDay(pool, "lc", TZ, today, true);

    const earns = (await streakEvents()).filter((e) => e.kind === "earn");
    const ids = earns.map((e) => e.source_id).sort();
    expect(ids).toEqual(
      [
        habitDailySourceId(a.id, today),
        habitDailySourceId(b.id, today),
        `lc:${today}`,
      ].sort(),
    );
    expect(earns.every((e) => e.amount === 2)).toBe(true);
  });

  it("archived habit: no points on checkoff; mid-day archive leaves prior earn", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    const habit = await seedCustomHabit({ name: "Archive me" });

    await setHabitCheckoff(pool, habit.id, TZ, today, true);
    expect((await streakEvents()).filter((e) => e.kind === "earn")).toHaveLength(1);

    await pool.query(
      `UPDATE custom_habits SET archived_at = now() WHERE id = $1::uuid`,
      [habit.id],
    );

    // Undo while archived must not reverse (leave ledger as-is).
    await setHabitCheckoff(pool, habit.id, TZ, today, false);
    expect((await streakEvents()).some((e) => e.kind === "reverse")).toBe(false);
    expect(
      (await streakEvents())
        .filter((e) => e.source_id === habitDailySourceId(habit.id, today))
        .reduce((sum, e) => sum + e.amount, 0),
    ).toBe(2);

    // Day row still cleared for history tooling; streak view reflects absence.
    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 0,
      todayCounts: false,
    });

    // Re-check while archived: day returns, still no new earn.
    await setHabitCheckoff(pool, habit.id, TZ, today, true);
    expect((await streakEvents()).filter((e) => e.kind === "earn")).toHaveLength(1);
    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 1,
      todayCounts: true,
    });
  });

  it("respects streak_state.launch_date (no award before launch)", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(addCivilDays(today, 1));
    const habit = await seedCustomHabit({ name: "Pre-launch" });

    await setHabitCheckoff(pool, habit.id, TZ, today, true);

    expect(await streakEvents()).toEqual([]);
    expect(await getHabitStreak(pool, habit.id, TZ)).toEqual({
      length: 1,
      todayCounts: true,
    });
  });
});
