import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { habitDailySourceId } from "./streaks.js";
import { localDateInTimezone } from "./progress.js";
import { apiClient } from "./test/apiClient.js";
import { seedCustomHabitDay, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";
const q = `?tz=${encodeURIComponent(TZ)}`;

async function setLaunch(date: string) {
  await pool.query(
    `INSERT INTO streak_state (singleton, launch_date) VALUES (true, $1::date)
     ON CONFLICT (singleton) DO UPDATE SET launch_date = EXCLUDED.launch_date`,
    [date],
  );
}

async function streakEarnsFor(habitId: string, today: string) {
  const { rows } = await pool.query<{ kind: string; amount: number; source_id: string }>(
    `SELECT kind, amount, source_id FROM points_events
     WHERE category = 'streak' AND source_id = $1
     ORDER BY created_at, id`,
    [habitDailySourceId(habitId, today)],
  );
  return rows;
}

describe.skipIf(!integrationReady)("custom habits API (F11 M1-03)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("create appears on progress/today with length 0 / todayCounts false", async () => {
    const created = await apiClient()
      .post(`/api/habits${q}`)
      .send({ name: "  Morning pages  " })
      .expect(201);
    expect(created.body).toEqual(
      expect.objectContaining({
        name: "Morning pages",
        length: 0,
        todayCounts: false,
        archived: false,
      }),
    );

    const today = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(today.body.habits.active).toEqual([
      {
        id: created.body.id,
        name: "Morning pages",
        length: 0,
        todayCounts: false,
      },
    ]);
    expect(today.body.habits.archived).toEqual([]);
    expect(today.body.streaks.lc).toEqual({ length: 0, todayCounts: false });
    expect(today.body.streaks.apps).toEqual({ length: 0, todayCounts: false });
  });

  it("rejects empty name and create at the active cap", async () => {
    await apiClient().post(`/api/habits${q}`).send({ name: "   " }).expect(400);
    for (const name of ["A", "B", "C", "D", "E", "F"]) {
      await apiClient().post(`/api/habits${q}`).send({ name }).expect(201);
    }
    const capped = await apiClient().post(`/api/habits${q}`).send({ name: "G" }).expect(400);
    expect(capped.body.error).toMatch(/6 active custom habits/i);
  });

  it("checkoff awards streak points; undo reverses; double checkoff is idempotent", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    const created = await apiClient()
      .post(`/api/habits${q}`)
      .send({ name: "Gym" })
      .expect(201);
    const id = created.body.id as string;

    const on = await apiClient()
      .put(`/api/habits/${id}/checkoff${q}`)
      .send({ checked: true })
      .expect(200);
    expect(on.body.todayCounts).toBe(true);
    expect(on.body.length).toBeGreaterThanOrEqual(1);
    expect(on.body.points).toEqual(
      expect.objectContaining({
        amount: 2,
        message: expect.stringContaining("Gym streak day 1"),
      }),
    );

    const earns = await streakEarnsFor(id, today);
    expect(earns.filter((e) => e.kind === "earn")).toEqual([
      expect.objectContaining({ amount: 2 }),
    ]);

    await apiClient()
      .put(`/api/habits/${id}/checkoff${q}`)
      .send({ checked: true })
      .expect(200);
    expect((await streakEarnsFor(id, today)).filter((e) => e.kind === "earn")).toHaveLength(1);

    const off = await apiClient()
      .put(`/api/habits/${id}/checkoff${q}`)
      .send({ checked: false })
      .expect(200);
    expect(off.body.todayCounts).toBe(false);
    const cleared = await streakEarnsFor(id, today);
    expect(cleared.some((e) => e.kind === "reverse")).toBe(true);
    expect(cleared.reduce((sum, e) => sum + e.amount, 0)).toBe(0);

    await apiClient()
      .put(`/api/habits/${id}/checkoff${q}`)
      .send({ checked: false })
      .expect(200);
    expect((await streakEarnsFor(id, today)).filter((e) => e.kind === "reverse")).toHaveLength(1);

    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.habits.active[0]).toEqual(
      expect.objectContaining({ id, todayCounts: false }),
    );
  });

  it("archive frees cap; restore blocked at cap then succeeds under cap", async () => {
    const created = [];
    for (const name of ["A", "B", "C", "D", "E", "F"]) {
      created.push(
        (await apiClient().post(`/api/habits${q}`).send({ name }).expect(201)).body,
      );
    }
    const a = created[0]!;

    await apiClient().post(`/api/habits/${a.id}/archive${q}`).expect(200);
    const today = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(today.body.habits.active.map((h: { name: string }) => h.name)).toEqual([
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
    expect(today.body.habits.archived.map((h: { name: string }) => h.name)).toEqual(["A"]);

    const g = await apiClient().post(`/api/habits${q}`).send({ name: "G" }).expect(201);
    const blocked = await apiClient()
      .post(`/api/habits/${a.id}/restore${q}`)
      .expect(400);
    expect(blocked.body.error).toMatch(/6 active custom habits/i);

    await apiClient().post(`/api/habits/${g.body.id}/archive${q}`).expect(200);
    const restored = await apiClient().post(`/api/habits/${a.id}/restore${q}`).expect(200);
    expect(restored.body.archived).toBe(false);

    const after = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(after.body.habits.active.map((h: { name: string }) => h.name).sort()).toEqual([
      "A",
      "B",
      "C",
      "D",
      "E",
      "F",
    ]);
  });

  it("rename persists without resetting checkoff history / length", async () => {
    const { addCivilDays } = await import("./homeUpcoming.js");
    const today = localDateInTimezone(new Date(), TZ);
    const created = await apiClient()
      .post(`/api/habits${q}`)
      .send({ name: "Old" })
      .expect(201);
    await seedCustomHabitDay(created.body.id, addCivilDays(today, -1));
    await seedCustomHabitDay(created.body.id, today);

    const renamed = await apiClient()
      .patch(`/api/habits/${created.body.id}${q}`)
      .send({ name: "New" })
      .expect(200);
    expect(renamed.body.name).toBe("New");
    expect(renamed.body.length).toBe(2);
    expect(renamed.body.todayCounts).toBe(true);

    const dupe = await apiClient().post(`/api/habits${q}`).send({ name: "New" }).expect(201);
    expect(dupe.body.name).toBe("New");

    await apiClient()
      .patch(`/api/habits/${created.body.id}${q}`)
      .send({ name: "  " })
      .expect(400);
    await apiClient()
      .patch(`/api/habits/${created.body.id}${q}`)
      .send({ name: "x".repeat(51) })
      .expect(400);
  });

  it("unknown habit id is 404; LC/apps streaks shape unchanged when habits empty", async () => {
    const missing = "00000000-0000-4000-8000-000000000000";
    await apiClient().patch(`/api/habits/${missing}${q}`).send({ name: "X" }).expect(404);
    await apiClient().post(`/api/habits/${missing}/archive${q}`).expect(404);
    await apiClient()
      .put(`/api/habits/${missing}/checkoff${q}`)
      .send({ checked: true })
      .expect(404);

    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.streaks).toEqual({
      lc: { length: 0, todayCounts: false },
      apps: { length: 0, todayCounts: false },
    });
    expect(t.body.habits).toEqual({ active: [], archived: [] });
  });
});
