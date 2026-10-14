import { describe, expect, it } from "vitest";
import { collectorRateAt, GACHA_CONFIG } from "./catCakeGacha.js";

describe("collectorRateAt", () => {
  it("matches R7.7 soft and hard pity", () => {
    expect(collectorRateAt(1)).toBe(GACHA_CONFIG.collectorBaseRate);
    expect(collectorRateAt(12)).toBe(GACHA_CONFIG.collectorBaseRate);
    expect(collectorRateAt(13)).toBeCloseTo(0.015 + 0.08, 6);
    expect(collectorRateAt(20)).toBe(1);
  });
});
