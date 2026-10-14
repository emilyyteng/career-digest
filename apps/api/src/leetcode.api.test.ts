import { beforeEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { addCivilDays } from "./homeUpcoming.js";
import { syncLeetcodeDailyPoints } from "./pointsAwards.js";
import { localDateInTimezone } from "./progress.js";
import { apiClient } from "./test/apiClient.js";
import { seedLeetcodeDaily, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import { mondayOfLocalWeek } from "./weeklyGoals.js";

const TZ = "UTC";
const q = `?tz=${encodeURIComponent(TZ)}`;

type Tier = "easy" | "medium" | "hard";

function log(tier: Tier, delta: 1 | -1, type: "weekly" | "misc", date?: string) {
  return apiClient()
    .patch(`/api/progress/leetcode${q}`)
    .send({ tier, delta, type, ...(date ? { date } : {}) });
}

async function weeklyLc(): Promise<number> {
  const res = await apiClient().get(`/api/weekly-goals${q}`).expect(200);
  return res.body.goals.find((g: { slot: string }) => g.slot === "lc").progressCount;
}

async function balance(): Promise<number> {
  const res = await apiClient().get("/api/points").expect(200);
  return res.body.balance;
}

async function categoryPoints(category: string): Promise<number> {
  const res = await apiClient().get("/api/points").expect(200);
  return (
    res.body.categories.find((c: { category: string }) => c.category === category)?.points ?? 0
  );
}

describe.skipIf(!integrationReady)("LeetCode logging API (M5-01)", () => {
  beforeEach(async () => {
    await truncateAll();
  });

  it.each([
    ["easy", 20],
    ["medium", 30],
    ["hard", 50],
  ] as const)("misc +1 %s earns %i points with a banner", async (tier, amount) => {
    const res = await log(tier, 1, "misc").expect(200);
    expect(res.body.points.amount).toBe(amount);
    expect(res.body.points.message).toContain("(misc)");
    expect(res.body.points.balanceAfter).toBe(amount);
    expect(res.body.tiers[tier]).toBe(1);
    expect(res.body.count).toBe(1);
    expect(res.body.weeklyProgress).toBeNull();
  });

  it("weekly +1 raises the tier, weekly progress and points", async () => {
    const res = await log("hard", 1, "weekly").expect(200);
    expect(res.body.tiers).toEqual({ easy: 0, medium: 0, hard: 1 });
    expect(res.body.weeklyTiers).toEqual({ easy: 0, medium: 0, hard: 1 });
    expect(res.body.weeklyProgress).toBe(1);
    expect(res.body.points.amount).toBe(50);
    expect(res.body.points.message).toMatch(/Hard LeetCode \(weekly 1\/\d+\)/);
    expect(await weeklyLc()).toBe(1);
  });

  it("misc +1 leaves weekly progress alone", async () => {
    await log("easy", 1, "weekly").expect(200);
    const res = await log("medium", 1, "misc").expect(200);
    expect(await weeklyLc()).toBe(1);
    expect(res.body.weeklyTiers).toEqual({ easy: 1, medium: 0, hard: 0 });
    expect(res.body.tiers).toEqual({ easy: 1, medium: 1, hard: 0 });
  });

  it("−1 reverses that tier's points; 409 at 0", async () => {
    await log("hard", 1, "misc").expect(200);
    await log("easy", 1, "misc").expect(200);
    const res = await log("hard", -1, "misc").expect(200);
    expect(res.body.points.amount).toBe(-50);
    expect(res.body.tiers).toEqual({ easy: 1, medium: 0, hard: 0 });
    expect(await categoryPoints("leetcode")).toBe(20);
    await log("hard", -1, "misc").expect(409);
    await log("medium", -1, "misc").expect(409);
  });

  it("misc −1 only removes misc solves; weekly −1 only removes weekly", async () => {
    await log("easy", 1, "weekly").expect(200);
    await log("easy", 1, "weekly").expect(200);
    await log("easy", -1, "misc").expect(409);
    await log("easy", 1, "misc").expect(200);
    const afterMisc = await log("easy", -1, "misc").expect(200);
    expect(afterMisc.body.tiers.easy).toBe(2);
    expect(afterMisc.body.weeklyTiers.easy).toBe(2);
    expect(await weeklyLc()).toBe(2);

    const afterWeekly = await log("easy", -1, "weekly").expect(200);
    expect(afterWeekly.body.tiers.easy).toBe(1);
    expect(afterWeekly.body.weeklyTiers.easy).toBe(1);
    expect(await weeklyLc()).toBe(1);
  });

  it("weekly −1 lowers weekly progress; 409 at progress 0", async () => {
    await log("medium", 1, "misc").expect(200);
    await log("medium", -1, "weekly").expect(409);
    await log("medium", 1, "weekly").expect(200);
    const res = await log("medium", -1, "weekly").expect(200);
    expect(res.body.weeklyProgress).toBe(0);
    expect(res.body.tiers.medium).toBe(1);
    expect(res.body.weeklyTiers.medium).toBe(0);
  });

  it("GET /progress/today exposes weekly tiers separately from day totals", async () => {
    await log("easy", 1, "weekly").expect(200);
    await log("easy", 1, "misc").expect(200);
    await log("hard", 1, "misc").expect(200);
    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.leetcodeTiers).toEqual({ easy: 2, medium: 0, hard: 1 });
    expect(t.body.leetcodeWeeklyTiers).toEqual({ easy: 1, medium: 0, hard: 0 });
  });

  it("weekly progress has no cap", async () => {
    await apiClient().patch(`/api/weekly-goals/lc${q}`).send({ targetCount: 2 }).expect(200);
    for (let i = 0; i < 4; i += 1) await log("easy", 1, "weekly").expect(200);
    expect(await weeklyLc()).toBe(4);
  });

  it("weekly on a past date is a 400; misc per-tier edits work on History", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const past = addCivilDays(today, -3);
    await log("easy", 1, "weekly", past).expect(400);

    await log("hard", 1, "misc", past).expect(200);
    const res = await log("easy", 1, "misc", past).expect(200);
    expect(res.body.localDate).toBe(past);
    expect(res.body.tiers).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(res.body.points.amount).toBe(20);

    const day = await apiClient().get(`/api/progress/day/${past}${q}`).expect(200);
    expect(day.body.leetcodeTiers).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(day.body.leetcode.raw).toBe(2);
    expect(await weeklyLc()).toBe(0);
  });

  it("1→0→1→0 returns a banner every time", async () => {
    const amounts: number[] = [];
    for (const delta of [1, -1, 1, -1] as const) {
      const res = await log("medium", delta, "misc").expect(200);
      expect(res.body.points).not.toBeNull();
      amounts.push(res.body.points.amount);
    }
    expect(amounts).toEqual([30, -30, 30, -30]);
    expect(await categoryPoints("leetcode")).toBe(0);
  });

  it("legacy untiered days read as medium and keep their points", async () => {
    const past = addCivilDays(localDateInTimezone(new Date(), TZ), -10);
    await seedLeetcodeDaily(past, 2);
    await syncLeetcodeDailyPoints(pool, past, 2);
    expect(await balance()).toBe(60);

    const day = await apiClient().get(`/api/progress/day/${past}${q}`).expect(200);
    expect(day.body.leetcodeTiers).toEqual({ easy: 0, medium: 2, hard: 0 });

    const res = await log("easy", 1, "misc", past).expect(200);
    expect(res.body.points.amount).toBe(20);
    expect(await balance()).toBe(80);
  });

  it("day total is easy + medium + hard across today, day detail and outcome", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    await log("easy", 1, "weekly").expect(200);
    await log("medium", 1, "misc").expect(200);
    await log("hard", 1, "misc").expect(200);
    await log("hard", 1, "weekly").expect(200);

    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.leetcodeTiers).toEqual({ easy: 1, medium: 1, hard: 2 });
    expect(t.body.leetcodeWeeklyTiers).toEqual({ easy: 1, medium: 0, hard: 1 });
    expect(t.body.leetcode.raw).toBe(4);

    const day = await apiClient().get(`/api/progress/day/${today}${q}`).expect(200);
    expect(day.body.leetcode.raw).toBe(4);

    const outcome = await apiClient()
      .get(`/api/progress/outcome${q}&period=day&date=${today}`)
      .expect(200);
    expect(outcome.body.leetcodeSolves).toBe(4);
    expect(await categoryPoints("leetcode")).toBe(20 + 30 + 50 + 50);
  });

  it("week tiers sum Monday through today, with untiered days as medium", async () => {
    const today = localDateInTimezone(new Date(), TZ);
    const monday = mondayOfLocalWeek(new Date(), TZ);
    await seedLeetcodeDaily(addCivilDays(monday, -1), 5);
    const earlier = monday === today ? 0 : 2;
    if (earlier) await seedLeetcodeDaily(monday, earlier);

    const res = await log("hard", 1, "misc").expect(200);
    expect(res.body.weekTiers).toEqual({ easy: 0, medium: earlier, hard: 1 });

    const t = await apiClient().get(`/api/progress/today${q}`).expect(200);
    expect(t.body.leetcodeWeekTiers).toEqual({ easy: 0, medium: earlier, hard: 1 });
    expect(t.body.leetcodeTiers).toEqual({ easy: 0, medium: 0, hard: 1 });
  });

  it("validates tier, delta and type", async () => {
    await apiClient().patch(`/api/progress/leetcode${q}`).send({ tier: "x", delta: 1, type: "misc" }).expect(400);
    await apiClient().patch(`/api/progress/leetcode${q}`).send({ tier: "easy", delta: 2, type: "misc" }).expect(400);
    await apiClient().patch(`/api/progress/leetcode${q}`).send({ tier: "easy", delta: 1, type: "x" }).expect(400);
    await apiClient().patch(`/api/progress/leetcode${q}`).send({ count: 3 }).expect(400);
  });
});
