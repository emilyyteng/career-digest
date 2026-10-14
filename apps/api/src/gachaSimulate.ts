/**
 * Fast Monte Carlo of production gacha pity/rates (F08 M7-11 / R7.7).
 * Same rate ladder as `collectorRateAt` / `GACHA_CONFIG`; no DB.
 */
import { CAT_CAKE_FLAVOR_IDS, KEPT_COPIES } from "./catCakeCatalog.js";
import { GACHA_CONFIG, collectorRateAt, type GachaConfig } from "./catCakeGacha.js";

/** Mulberry32 — fixed seed for CI reproducibility. */
export function seededRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type SimulationStats = {
  runs: number;
  avgPullsPerCollector: number;
  p50PullsPerCollector: number;
  p90PullsPerCollector: number;
  consolidatedCollectorRate: number;
  hardPityShare: number;
  avgPullsAllClassics: number;
  avgPullsFullSet: number;
  avgNetCostFullSet: number;
  /** Share of CE hits that landed exactly on hard pity (pull 20). */
  hardPityOnlyAt20: boolean;
};

/**
 * Monte Carlo matching production roll order: rate check then uniform flavor.
 * Typed arrays keep 10k full-set runs under a second in CI.
 */
export function simulateGacha(
  runs = 10_000,
  seed = 42,
  cfg: GachaConfig = GACHA_CONFIG,
): SimulationStats {
  const rng = seededRng(seed);
  const n = CAT_CAKE_FLAVOR_IDS.length;
  const classic = new Int32Array(n);
  const collector = new Int32Array(n);
  const gapCounts = new Float64Array(cfg.hardPity + 1);
  let gapTotal = 0;
  let gapSum = 0;
  let hardHits = 0;
  let hardHitsNotAt20 = 0;
  let sumClassics = 0;
  let sumFull = 0;
  let sumNet = 0;

  for (let run = 0; run < runs; run++) {
    classic.fill(0);
    collector.fill(0);
    let classicsOwned = 0;
    let collectorsOwned = 0;
    let pity = 0;
    let pulls = 0;
    let classicsDoneAt = 0;
    let refunded = 0;
    while (classicsOwned < n || collectorsOwned < n) {
      const pityAt = pity + 1;
      const rate = collectorRateAt(pityAt, cfg);
      const hit = rate >= 1 || rng() < rate;
      const idx = Math.floor(rng() * n);
      pulls++;
      const copies = hit ? ++collector[idx]! : ++classic[idx]!;
      if (copies > KEPT_COPIES) {
        refunded += cfg.refund[hit ? "collector" : "classic"];
      }
      if (hit) {
        if (copies === 1) collectorsOwned++;
        pity = 0;
        gapCounts[pityAt]!++;
        gapTotal++;
        gapSum += pityAt;
        if (rate >= 1) {
          hardHits++;
          if (pityAt !== cfg.hardPity) hardHitsNotAt20++;
        }
      } else {
        if (copies === 1 && ++classicsOwned === n) classicsDoneAt = pulls;
        pity = pityAt;
      }
    }
    sumClassics += classicsDoneAt;
    sumFull += pulls;
    sumNet += pulls * cfg.costPerPull - refunded;
  }

  const percentile = (q: number) => {
    const target = Math.floor(gapTotal * q);
    let seen = 0;
    for (let g = 1; g < gapCounts.length; g++) {
      seen += gapCounts[g]!;
      if (seen > target) return g;
    }
    return cfg.hardPity;
  };
  const avg = gapSum / gapTotal;
  return {
    runs,
    avgPullsPerCollector: avg,
    p50PullsPerCollector: percentile(0.5),
    p90PullsPerCollector: percentile(0.9),
    consolidatedCollectorRate: 1 / avg,
    hardPityShare: hardHits / gapTotal,
    avgPullsAllClassics: sumClassics / runs,
    avgPullsFullSet: sumFull / runs,
    avgNetCostFullSet: sumNet / runs,
    hardPityOnlyAt20: hardHitsNotAt20 === 0,
  };
}
