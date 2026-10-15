import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { recordEarn, recordSpend } from "./pointsLedger.js";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";
import { apiClient } from "./test/apiClient.js";
import { seedLeetcodeDaily, seedReflectionLog, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";

describe.skipIf(!integrationReady)("GET /api/progress/lifetime (M8-05)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("returns totals, days worked, and filled seeds/day activity (excludes spends)", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const yesterday = addCivilDays(today, -1);
    await seedLeetcodeDaily(today, 2);
    await seedLeetcodeDaily(yesterday, 3);
    await seedReflectionLog({
      lane: "technical",
      body: "note",
      createdAt: new Date(`${yesterday}T15:00:00.000Z`),
    });
    await recordEarn(pool, {
      category: "leetcode",
      amount: 50,
      message: "lc today",
      sourceType: "leetcode_daily",
      sourceId: `lc-${today}`,
    });
    await recordEarn(pool, {
      category: "reflection",
      amount: 20,
      message: "reflection",
      sourceType: "reflection_create",
      sourceId: "refl-1",
    });
    // Backdate the reflection earn to yesterday for activity grouping.
    await pool.query(
      `UPDATE points_events SET created_at = $1::timestamptz
       WHERE source_id = 'refl-1'`,
      [`${yesterday}T16:00:00.000Z`],
    );
    await recordSpend(pool, {
      amount: 40,
      message: "pull",
      sourceType: "gacha_pull",
      sourceId: "pull-life-1",
    });

    const res = await apiClient()
      .get("/api/progress/lifetime")
      .query({ tz: TZ, activityDays: 7 })
      .expect(200);

    expect(res.body.totals.leetcode).toBe(5);
    expect(res.body.totals.reflections).toBe(1);
    expect(res.body.totals.seedsEarned).toBe(70);
    expect(res.body.totals.daysWorked).toBe(2);
    expect(res.body.activity).toHaveLength(7);
    expect(res.body.activity[6]).toEqual({ date: today, seeds: 50 });
    expect(res.body.activity[5]).toEqual({ date: yesterday, seeds: 20 });
    expect(res.body.activity.filter((d: { seeds: number }) => d.seeds === 0)).toHaveLength(
      5,
    );
  });

  it("rejects missing tz", async () => {
    await apiClient().get("/api/progress/lifetime").expect(400);
  });
});
