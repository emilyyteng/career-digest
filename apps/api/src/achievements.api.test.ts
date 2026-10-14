import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { listAchievements, syncAchievements } from "./achievements.js";
import { apiClient } from "./test/apiClient.js";
import {
  seedCompany,
  seedInterviewThread,
  seedLeetcodeDaily,
  seedManualApplication,
  seedPosting,
  truncateAll,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";
const q = `?tz=${encodeURIComponent(TZ)}`;

let appSeq = 0;
async function seedAppliedApps(n: number) {
  for (let i = 0; i < n; i += 1) {
    appSeq += 1;
    const company = await seedCompany({ name: `Ach Co ${appSeq}` });
    const posting = await seedPosting({
      source: "greenhouse",
      externalId: `ach-${appSeq}`,
      companyId: company.id,
      title: "Role",
      url: `https://boards.greenhouse.io/ach/jobs/${appSeq}`,
    });
    await pool.query(
      `INSERT INTO applications (posting_id, status, applied_at, status_changed_at)
       VALUES ($1, 'applied', now(), now())`,
      [posting.id],
    );
  }
}

describe.skipIf(!integrationReady)("achievements API (M5-11)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("unlocks passed achievements at launch with no points", async () => {
    await seedAppliedApps(25);
    await seedLeetcodeDaily("2026-01-01", 30);

    const unlocks = await syncAchievements(pool);
    expect(unlocks).toEqual([]);

    const listed = await listAchievements(pool);
    const apps10 = listed.achievements.find((a) => a.id === "apps:10");
    const apps25 = listed.achievements.find((a) => a.id === "apps:25");
    const lc25 = listed.achievements.find((a) => a.id === "lc:25");
    expect(apps10).toMatchObject({ unlocked: true, launchUnlock: true, pointsPaid: 0 });
    expect(apps25).toMatchObject({ unlocked: true, launchUnlock: true, pointsPaid: 0 });
    expect(lc25).toMatchObject({ unlocked: true, launchUnlock: true, pointsPaid: 0 });

    const { rows } = await pool.query(
      `SELECT COALESCE(SUM(amount), 0)::int AS n FROM points_events WHERE category = 'achievement'`,
    );
    expect(rows[0]?.n).toBe(0);
  });

  it("pays once on a post-launch crossing; decrement does not re-lock or re-pay", async () => {
    // Launch with 9 apps (no apps:10 yet).
    await seedAppliedApps(9);
    await syncAchievements(pool);

    const company = await seedCompany({ name: "Cross Co" });
    const posting = await seedPosting({
      source: "greenhouse",
      externalId: "cross-10",
      companyId: company.id,
      title: "Role",
      url: "https://boards.greenhouse.io/ach/jobs/cross",
    });
    const task = await apiClient()
      .post("/api/tasks/from-posting")
      .send({ postingId: posting.id })
      .expect(201);
    const res = await apiClient()
      .post(`/api/tasks/${task.body.id}/complete${q}`)
      .send({})
      .expect(200);

    expect(res.body.achievementUnlocks).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: "apps:10", points: 30 }),
      ]),
    );

    const after = await listAchievements(pool);
    expect(after.achievements.find((a) => a.id === "apps:10")).toMatchObject({
      unlocked: true,
      launchUnlock: false,
      pointsPaid: 30,
    });

    // Drop below 10 by deleting an application — unlock stays; no reverse.
    await pool.query(`DELETE FROM applications WHERE posting_id = $1`, [posting.id]);
    const mid = await listAchievements(pool);
    expect(mid.achievements.find((a) => a.id === "apps:10")?.unlocked).toBe(true);

    // Re-apply to cross again — no second pay.
    await seedAppliedApps(1);
    const again = await syncAchievements(pool);
    expect(again.filter((u) => u.id === "apps:10")).toEqual([]);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM points_events
       WHERE category = 'achievement' AND source_id = 'apps:10' AND kind = 'earn'`,
    );
    expect(rows[0]?.n).toBe(1);
  });

  it("GET /achievements returns the catalog with progress", async () => {
    await seedLeetcodeDaily("2026-02-01", 40);
    await syncAchievements(pool);
    const res = await apiClient().get("/api/achievements").expect(200);
    expect(res.body.achievements.length).toBeGreaterThan(10);
    const lc25 = res.body.achievements.find((a: { id: string }) => a.id === "lc:25");
    expect(lc25.current).toBe(40);
    expect(lc25.unlocked).toBe(true);
  });

  it("LC logging after launch pays lc:25 once", async () => {
    await syncAchievements(pool); // launch empty
    for (let i = 0; i < 24; i += 1) {
      await seedLeetcodeDaily(`2026-03-${String(i + 1).padStart(2, "0")}`, 1);
    }
    // 24 solves seeded; one more via API → 25.
    const res = await apiClient()
      .patch(`/api/progress/leetcode${q}`)
      .send({ tier: "easy", delta: 1, type: "misc" })
      .expect(200);
    expect(res.body.achievementUnlocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "lc:25", points: 125 })]),
    );
  });

  it("finishing an offer step after launch pays offer:1 once; re-finish does not", async () => {
    await syncAchievements(pool); // launch empty
    const app = await seedManualApplication({ status: "interviewing", company: "Offer Co" });
    const { threadId, stepId } = await seedInterviewThread({
      primaryApplicationId: app.id,
      stepTitle: "Offer",
    });
    await pool.query(`UPDATE application_steps SET kind = 'offer' WHERE id = $1`, [stepId]);

    const res = await apiClient()
      .patch(`/api/interviews/${threadId}/steps/${stepId}`)
      .send({ status: "completed", actualMinutes: 15 })
      .expect(200);
    expect(res.body.achievementUnlocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "offer:1", points: 200 })]),
    );

    // Re-finish (R4.11): no second achievement pay.
    const again = await apiClient()
      .patch(`/api/interviews/${threadId}/steps/${stepId}`)
      .send({ status: "completed", actualMinutes: 20 })
      .expect(200);
    expect(again.body.achievementUnlocks ?? []).toEqual([]);
    const { rows } = await pool.query(
      `SELECT COUNT(*)::int AS n FROM points_events
       WHERE category = 'achievement' AND source_id = 'offer:1' AND kind = 'earn'`,
    );
    expect(rows[0]?.n).toBe(1);
  });

  it("awaiting_employer counts toward interview achievements", async () => {
    await syncAchievements(pool);
    const app = await seedManualApplication({ status: "interviewing", company: "Offer Wait Co" });
    const { threadId, stepId } = await seedInterviewThread({
      primaryApplicationId: app.id,
      stepTitle: "Offer",
    });
    await pool.query(`UPDATE application_steps SET kind = 'offer' WHERE id = $1`, [stepId]);

    const res = await apiClient()
      .patch(`/api/interviews/${threadId}/steps/${stepId}`)
      .send({ status: "awaiting_employer", actualMinutes: 15 })
      .expect(200);
    expect(res.body.achievementUnlocks).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "offer:1", points: 200 })]),
    );

    const listed = await listAchievements(pool);
    expect(listed.achievements.find((a) => a.id === "offer:1")).toMatchObject({
      current: 1,
      unlocked: true,
    });
  });
});
