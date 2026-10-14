import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";
import { syncStreakForDay } from "./streaks.js";
import { apiClient } from "./test/apiClient.js";
import { seedCompany, seedLeetcodeDaily, seedPosting, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";
const q = `?tz=${encodeURIComponent(TZ)}`;

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

async function logLcToday() {
  return apiClient()
    .patch(`/api/progress/leetcode${q}`)
    .send({ tier: "medium", delta: 1, type: "misc" })
    .expect(200);
}

async function clearLcToday() {
  return apiClient()
    .patch(`/api/progress/leetcode${q}`)
    .send({ tier: "medium", delta: -1, type: "misc" })
    .expect(200);
}

let postingSeq = 0;
async function markAppliedToday(): Promise<void> {
  postingSeq += 1;
  const company = await seedCompany({ name: `Streak Co ${postingSeq}` });
  const posting = await seedPosting({
    source: "greenhouse",
    externalId: `streak-${postingSeq}`,
    companyId: company.id,
    title: "Role",
    url: `https://boards.greenhouse.io/streak/jobs/${postingSeq}`,
  });
  const task = await apiClient()
    .post("/api/tasks/from-posting")
    .send({ postingId: posting.id })
    .expect(201);
  await apiClient().post(`/api/tasks/${task.body.id}/complete${q}`).send({}).expect(200);
}

describe.skipIf(!integrationReady)("daily streaks API (M5-10)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("awards day-1 daily points and exposes length on progress/today", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    await logLcToday();

    expect((await streakEvents()).filter((e) => e.kind === "earn")).toEqual([
      expect.objectContaining({
        amount: 2,
        source_type: "streak_daily",
        source_id: `lc:${today}`,
      }),
    ]);

    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.streaks.lc).toEqual({ length: 1, todayCounts: true });
    expect(t.body.streaks.apps).toEqual({ length: 0, todayCounts: false });
  });

  it("pays day-5 daily + milestone; a later streak with a new start earns its own milestone", async () => {
    await setLaunch("2026-01-01");
    for (let i = 0; i < 5; i += 1) await seedLeetcodeDaily(addCivilDays("2026-01-01", i), 1);
    await syncStreakForDay(
      pool,
      "lc",
      TZ,
      "2026-01-05",
      true,
      new Date("2026-01-05T12:00:00Z"),
    );

    for (let i = 0; i < 5; i += 1) await seedLeetcodeDaily(addCivilDays("2026-02-01", i), 1);
    await syncStreakForDay(
      pool,
      "lc",
      TZ,
      "2026-02-05",
      true,
      new Date("2026-02-05T12:00:00Z"),
    );

    const milestones = (await streakEvents()).filter(
      (e) => e.kind === "earn" && e.source_type === "streak_milestone",
    );
    expect(milestones).toEqual([
      expect.objectContaining({ source_id: "lc:2026-01-01:5", amount: 25 }),
      expect.objectContaining({ source_id: "lc:2026-02-01:5", amount: 25 }),
    ]);
    expect((await streakEvents()).filter((e) => e.source_type === "streak_daily" && e.kind === "earn")).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source_id: "lc:2026-01-05", amount: 10 }),
        expect.objectContaining({ source_id: "lc:2026-02-05", amount: 10 }),
      ]),
    );
  });

  it("same-day LC undo reverses streak points; logging again reinstates them", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    await logLcToday();
    await clearLcToday();

    const dailyId = `lc:${today}`;
    const cleared = (await streakEvents()).filter((e) => e.source_id === dailyId);
    expect(cleared.some((e) => e.kind === "reverse")).toBe(true);
    expect(cleared.reduce((sum, e) => sum + e.amount, 0)).toBe(0);

    await logLcToday();
    const reinstated = (await streakEvents()).filter((e) => e.source_id === dailyId);
    expect(reinstated.reduce((sum, e) => sum + e.amount, 0)).toBe(2);
    const summary = await apiClient().get("/api/points").expect(200);
    expect(summary.body.categories).toEqual(
      expect.arrayContaining([expect.objectContaining({ category: "streak", points: 2 })]),
    );
    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.streaks.lc.todayCounts).toBe(true);
  });

  it("History edits change the displayed streak but award no points", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const past = addCivilDays(today, -2);
    await setLaunch(addCivilDays(today, -5));
    await seedLeetcodeDaily(addCivilDays(today, -1), 1);

    await apiClient()
      .patch(`/api/progress/leetcode${q}`)
      .send({ tier: "easy", delta: 1, type: "misc", date: past })
      .expect(200);

    expect(await streakEvents()).toEqual([]);
    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.streaks.lc).toEqual({ length: 2, todayCounts: false });
  });

  it("a pre-launch run keeps its length; only today after launch earns points", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    for (let i = 3; i >= 1; i -= 1) await seedLeetcodeDaily(addCivilDays(today, -i), 1);
    await logLcToday();

    const earns = (await streakEvents()).filter((e) => e.kind === "earn");
    expect(earns).toEqual([
      expect.objectContaining({ source_type: "streak_daily", amount: 8 }),
    ]);
    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.streaks.lc.length).toBe(4);
  });

  it("apps streak awards on first mark-applied of the day", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    await markAppliedToday();

    expect((await streakEvents()).filter((e) => e.kind === "earn")).toEqual([
      expect.objectContaining({
        source_type: "streak_daily",
        source_id: `apps:${today}`,
        amount: 2,
      }),
    ]);
    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.streaks.apps).toEqual({ length: 1, todayCounts: true });
  });

  it("streak events show under the streak category in the points summary", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await setLaunch(today);
    await logLcToday();
    const res = await apiClient().get("/api/points").expect(200);
    expect(res.body.categories).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "leetcode" }),
        expect.objectContaining({ category: "streak", points: 2 }),
      ]),
    );
  });
});
