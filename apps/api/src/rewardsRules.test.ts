import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG } from "./achievements.js";
import { GACHA_CONFIG, collectorRateAt } from "./catCakeGacha.js";
import { FRIENDSHIP_MAX, KEPT_COPIES } from "./catCakeCatalog.js";
import { POINTS } from "./pointsFormulas.js";
import { getRewardsRulesPayload } from "./rewardsRules.js";

describe("getRewardsRulesPayload", () => {
  it("reads live POINTS, gacha, and achievement exports (no hand-copied drift)", () => {
    const rules = getRewardsRulesPayload();
    expect(rules.earning.points).toEqual(POINTS);
    expect(rules.earning.points.miscTaskBase).toBe(10);
    expect(rules.earning.points.reflectionBonus).toBe(20);
    expect(rules.earning.points.weeklyGoalBonus).toBe(100);
    expect(rules.earning.notes.weeklyGoalStreakEarnsNothing).toBe(true);
    expect(rules.earning.achievements).toHaveLength(ACHIEVEMENT_CATALOG.length);
    expect(rules.spending.gacha).toEqual(GACHA_CONFIG);
    expect(rules.spending.gacha.costPerPull).toBe(180);
    expect(rules.spending.friendshipMax).toBe(FRIENDSHIP_MAX);
    expect(rules.spending.keptCopies).toBe(KEPT_COPIES);
    expect(rules.spending.nightUnlockAtCopies).toBe(2);
    expect(rules.spending.pityLadder[12]?.rate).toBe(collectorRateAt(13));
    expect(rules.spending.pityLadder[19]?.rate).toBe(1);
  });
});
