import { describe, expect, it } from "vitest";
import { GACHA_CONFIG, collectorRateAt } from "./catCakeGacha.js";
import { simulateGacha } from "./gachaSimulate.js";

describe("gachaSimulate (M7-11)", () => {
  it("soft pity climbs from pull 13 and hard pity is guaranteed at 20", () => {
    const cfg = GACHA_CONFIG;
    expect(collectorRateAt(cfg.softPityStart - 1, cfg)).toBe(cfg.collectorBaseRate);
    expect(collectorRateAt(cfg.softPityStart, cfg)).toBeGreaterThan(cfg.collectorBaseRate);
    expect(collectorRateAt(cfg.hardPity, cfg)).toBe(1);
    expect(collectorRateAt(cfg.hardPity - 1, cfg)).toBeLessThan(1);
  });

  it("10k-run Monte Carlo stays near pity-inflated CE spacing (~14)", () => {
    const stats = simulateGacha(10_000, 42);
    expect(stats.runs).toBe(10_000);
    // With 1.5% base + soft from 13 + hard at 20, mean gap is ~14.
    expect(stats.avgPullsPerCollector).toBeGreaterThan(12);
    expect(stats.avgPullsPerCollector).toBeLessThan(16);
    expect(stats.p50PullsPerCollector).toBeGreaterThanOrEqual(10);
    expect(stats.p50PullsPerCollector).toBeLessThanOrEqual(18);
    expect(stats.hardPityOnlyAt20).toBe(true);
    // Soft pity is steep, so true hard-pity hits are uncommon (~3–8%).
    expect(stats.hardPityShare).toBeGreaterThan(0.02);
    expect(stats.hardPityShare).toBeLessThan(0.2);
    // Informational snapshots — fail loudly if someone nukes the pool size.
    expect(stats.avgPullsAllClassics).toBeGreaterThan(20);
    expect(stats.avgPullsFullSet).toBeGreaterThan(stats.avgPullsAllClassics);
    expect(stats.avgNetCostFullSet).toBeGreaterThan(0);
  });
});
