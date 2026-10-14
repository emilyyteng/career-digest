import { beforeEach, describe, expect, it } from "vitest";
import { syncLeetcodeDailyPoints } from "./pointsAwards.js";
import { pool } from "./db.js";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";
import { apiClient } from "./test/apiClient.js";
import { seedLeetcodeDaily, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";
const q = `?tz=${encodeURIComponent(TZ)}`;

describe.skipIf(!integrationReady)("completions diary · LeetCode (M5-16)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it("lists days with solves as LC rows; untiered days are medium; zero days are omitted", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const past = addCivilDays(today, -5);
    const empty = addCivilDays(today, -2);

    await seedLeetcodeDaily(past, 2);
    await seedLeetcodeDaily(empty, 0);
    await apiClient()
      .patch(`/api/progress/leetcode${q}`)
      .send({ tier: "hard", delta: 1, type: "misc" })
      .expect(200);
    await apiClient()
      .patch(`/api/progress/leetcode${q}`)
      .send({ tier: "easy", delta: 1, type: "misc" })
      .expect(200);

    const res = await apiClient().get(`/api/progress/completions${q}&kind=leetcode`).expect(200);
    expect(res.body.items).toEqual([
      expect.objectContaining({
        kind: "leetcode",
        id: `leetcode:${today}`,
        title: "LC: 2 solved",
        subtitle: "1 easy · 0 medium · 1 hard",
        localDate: today,
        points: 70,
      }),
      expect.objectContaining({
        kind: "leetcode",
        id: `leetcode:${past}`,
        title: "LC: 2 solved",
        subtitle: "0 easy · 2 medium · 0 hard",
        localDate: past,
        points: 0,
      }),
    ]);
    expect(res.body.items.some((i: { localDate: string }) => i.localDate === empty)).toBe(false);
    expect(res.body.stats.allTime.leetcode).toBe(4);
    expect(res.body.stats.allTime.leetcodeDays).toBe(2);
  });

  it("shows the day's current LeetCode points when an earn exists", async () => {
    const past = addCivilDays(localDateInTimezone(new Date(), TZ), -3);
    await seedLeetcodeDaily(past, 1);
    await syncLeetcodeDailyPoints(pool, past, 1);

    const res = await apiClient().get(`/api/progress/completions${q}&kind=leetcode`).expect(200);
    expect(res.body.items[0]).toEqual(
      expect.objectContaining({
        title: "LC: 1 solved",
        subtitle: "0 easy · 1 medium · 0 hard",
        points: 30,
      }),
    );
  });

  it("includes LeetCode days in all; all counts days, the leetcode tab counts solves", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await seedLeetcodeDaily(addCivilDays(today, -1), 5);
    await seedLeetcodeDaily(today, 3);

    const all = await apiClient().get(`/api/progress/completions${q}`).expect(200);
    expect(all.body.items.filter((i: { kind: string }) => i.kind === "leetcode")).toHaveLength(2);
    expect(all.body.stats.allTime.leetcode).toBe(8);
    expect(all.body.stats.allTime.leetcodeDays).toBe(2);
  });
});
