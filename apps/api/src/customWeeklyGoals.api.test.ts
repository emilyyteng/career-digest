import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import {
  createCustomWeeklyGoal,
  customMetWeeksStreaks,
  patchCustomWeeklyTarget,
  stepCustomWeeklyProgress,
} from "./customWeeklyGoals.js";
import { apiClient } from "./test/apiClient.js";
import { truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import { closeDueWeeks, getWeeklyGoalsSnapshot } from "./weeklyGoals.js";

const TZ = "America/Los_Angeles";
const q = `?tz=${encodeURIComponent(TZ)}`;
/** Mon Mar 2 – Sun Mar 8, 2026 */
const W1 = "2026-03-02";
const W2 = "2026-03-09";
const W3 = "2026-03-16";
const IN_W1 = new Date("2026-03-04T19:00:00Z");
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

async function seedClosedCustom(
  goalId: string,
  weekStart: string,
  opts: { target: number; done: number; met: boolean },
) {
  await pool.query(
    `INSERT INTO custom_weekly_goal_records
       (goal_id, week_start, target, done, met, points, flat_bonus_paid_before)
     VALUES ($1::uuid, $2::date, $3, $4, $5, $6, false)`,
    [
      goalId,
      weekStart,
      opts.target,
      opts.done,
      opts.met,
      opts.done * 20 + (opts.met ? 100 : 0),
    ],
  );
}

describe.skipIf(!integrationReady)("custom weekly goals API (F11 M3-02)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("create appears in weekly snapshot; ± updates done; rename; archive/restore; restore at cap fails", async () => {
    const created = await apiClient()
      .post(`/api/weekly-customs${q}`)
      .send({ name: "  Gym  " })
      .expect(201);
    expect(created.body).toEqual(
      expect.objectContaining({
        name: "Gym",
        targetCount: 3,
        done: 0,
        total: 3,
        archived: false,
        metWeeksStreak: 0,
      }),
    );

    const snap = await apiClient().get(`/api/weekly-goals${q}`).expect(200);
    expect(snap.body.customs.active).toEqual([
      expect.objectContaining({ id: created.body.id, name: "Gym", done: 0, total: 3 }),
    ]);
    expect(snap.body.customs.archived).toEqual([]);
    expect(snap.body.goals.map((g: { slot: string }) => g.slot).sort()).toEqual(["apps", "lc"]);

    const stepped = await apiClient()
      .patch(`/api/weekly-customs/${created.body.id}/progress${q}`)
      .send({ delta: 1 })
      .expect(200);
    expect(stepped.body.done).toBe(1);
    await apiClient()
      .patch(`/api/weekly-customs/${created.body.id}/progress${q}`)
      .send({ delta: -1 })
      .expect(200);
    const atZero = await apiClient()
      .patch(`/api/weekly-customs/${created.body.id}/progress${q}`)
      .send({ delta: -1 })
      .expect(409);
    expect(atZero.body.error).toMatch(/no progress/i);

    const renamed = await apiClient()
      .patch(`/api/weekly-customs/${created.body.id}${q}`)
      .send({ name: "Strength" })
      .expect(200);
    expect(renamed.body.name).toBe("Strength");

    const patched = await apiClient()
      .patch(`/api/weekly-customs/${created.body.id}/target${q}`)
      .send({ targetCount: 5 })
      .expect(200);
    expect(patched.body).toEqual(expect.objectContaining({ targetCount: 5, total: 5 }));

    await apiClient().post(`/api/weekly-customs/${created.body.id}/archive${q}`).expect(200);
    const afterArchive = await apiClient().get(`/api/weekly-goals${q}`).expect(200);
    expect(afterArchive.body.customs.active).toEqual([]);
    expect(afterArchive.body.customs.archived).toEqual([
      expect.objectContaining({ id: created.body.id, name: "Strength", archived: true }),
    ]);
    await apiClient()
      .patch(`/api/weekly-customs/${created.body.id}/progress${q}`)
      .send({ delta: 1 })
      .expect(400);

    for (const name of ["A", "B", "C", "D", "E", "F"]) {
      await apiClient().post(`/api/weekly-customs${q}`).send({ name }).expect(201);
    }
    const capped = await apiClient()
      .post(`/api/weekly-customs${q}`)
      .send({ name: "G" })
      .expect(400);
    expect(capped.body.error).toMatch(/6 active custom weekly/i);

    const blocked = await apiClient()
      .post(`/api/weekly-customs/${created.body.id}/restore${q}`)
      .expect(400);
    expect(blocked.body.error).toMatch(/6 active custom weekly/i);

    const activeId = (
      await apiClient().get(`/api/weekly-goals${q}`).expect(200)
    ).body.customs.active[0].id as string;
    await apiClient().post(`/api/weekly-customs/${activeId}/archive${q}`).expect(200);
    const restored = await apiClient()
      .post(`/api/weekly-customs/${created.body.id}/restore${q}`)
      .expect(200);
    expect(restored.body.archived).toBe(false);
  });

  it("rejects empty name and create at the active cap", async () => {
    await apiClient().post(`/api/weekly-customs${q}`).send({ name: "   " }).expect(400);
    for (const name of ["A", "B", "C", "D", "E", "F"]) {
      await apiClient().post(`/api/weekly-customs${q}`).send({ name }).expect(201);
    }
    const capped = await apiClient()
      .post(`/api/weekly-customs${q}`)
      .send({ name: "G" })
      .expect(400);
    expect(capped.body.error).toMatch(/6 active custom weekly/i);
  });

  it("target patch persists across week boundary with done reset", async () => {
    await startAt(W1);
    await lcWeek(W1, 10, 0);

    const created = await createCustomWeeklyGoal(
      pool,
      TZ,
      { name: "Gym", targetCount: 4 },
      IN_W1,
    );
    const id = created.id;

    await stepCustomWeeklyProgress(pool, id, TZ, 1, IN_W1);
    await stepCustomWeeklyProgress(pool, id, TZ, 1, IN_W1);
    await patchCustomWeeklyTarget(pool, id, TZ, 5, IN_W1);

    const mid = await getWeeklyGoalsSnapshot(pool, TZ, IN_W1);
    expect(mid?.customs.active[0]).toMatchObject({
      id,
      targetCount: 5,
      done: 2,
    });

    await closeDueWeeks(pool, TZ, IN_W2);
    const next = await getWeeklyGoalsSnapshot(pool, TZ, IN_W2);
    expect(next?.customs.active[0]).toMatchObject({
      id,
      name: "Gym",
      targetCount: 5,
      done: 0,
      total: 5,
    });
  });

  it("week close awards +20×units and +100 when met; unmet pays units only", async () => {
    await startAt(W1);
    await lcWeek(W1, 10, 0);

    const met = await createCustomWeeklyGoal(
      pool,
      TZ,
      { name: "Met", targetCount: 3 },
      IN_W1,
    );
    const unmet = await createCustomWeeklyGoal(
      pool,
      TZ,
      { name: "Unmet", targetCount: 5 },
      IN_W1,
    );

    for (let i = 0; i < 3; i++) {
      await stepCustomWeeklyProgress(pool, met.id, TZ, 1, IN_W1);
    }
    for (let i = 0; i < 2; i++) {
      await stepCustomWeeklyProgress(pool, unmet.id, TZ, 1, IN_W1);
    }

    await closeDueWeeks(pool, TZ, IN_W2);

    const { rows: records } = await pool.query<{
      goal_id: string;
      done: number;
      target: number;
      met: boolean;
      points: number;
    }>(
      `SELECT goal_id::text, done, target, met, points
       FROM custom_weekly_goal_records
       WHERE week_start = $1::date
       ORDER BY target DESC`,
      [W1],
    );
    expect(records).toEqual([
      expect.objectContaining({
        goal_id: unmet.id,
        done: 2,
        target: 5,
        met: false,
        points: 40,
      }),
      expect.objectContaining({
        goal_id: met.id,
        done: 3,
        target: 3,
        met: true,
        points: 160,
      }),
    ]);

    const { rows: earns } = await pool.query<{ source_id: string; amount: number; message: string }>(
      `SELECT source_id, amount, message FROM points_events
       WHERE category = 'weekly_goal' AND source_id LIKE $1
       ORDER BY amount DESC`,
      [`${W1}:custom:%`],
    );
    expect(earns).toEqual([
      {
        source_id: `${W1}:custom:${met.id}`,
        amount: 160,
        message: expect.stringMatching(/Met 3\/3 · \+160 points/),
      },
      {
        source_id: `${W1}:custom:${unmet.id}`,
        amount: 40,
        message: expect.stringMatching(/Unmet 2\/5 · \+40 points/),
      },
    ]);

    // Apps/LC still close as before (lc 0/10 → no earn).
    const { rows: slotRecords } = await pool.query<{ slot: string }>(
      `SELECT slot FROM weekly_goal_records WHERE week_start = $1::date ORDER BY slot`,
      [W1],
    );
    expect(slotRecords.map((r) => r.slot)).toEqual(["apps", "lc"]);
  });

  it("consecutive met weeks → streak; broken week resets", async () => {
    const created = await apiClient()
      .post(`/api/weekly-customs${q}`)
      .send({ name: "Streak" })
      .expect(201);
    const id = created.body.id as string;

    await seedClosedCustom(id, W1, { target: 3, done: 3, met: true });
    await seedClosedCustom(id, W2, { target: 3, done: 3, met: true });
    expect(await customMetWeeksStreaks(pool)).toEqual({ [id]: 2 });

    await seedClosedCustom(id, W3, { target: 3, done: 1, met: false });
    expect(await customMetWeeksStreaks(pool)).toEqual({ [id]: 0 });

    const snap = await getWeeklyGoalsSnapshot(pool, TZ, IN_W3);
    expect(snap?.customs.active[0]?.metWeeksStreak).toBe(0);
  });
});
