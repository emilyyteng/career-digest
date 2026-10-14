/**
 * Prototype pull math. Pure functions so the same code can later move to the
 * API and be covered by the simulation unit test.
 *
 * No targeting: a Collector's Edition hit is a uniformly random flavor. The
 * CE rate stays at `collectorBaseRate` until `softPityStart`, then climbs by
 * `softPityStep` per pull until `hardPity` guarantees one. Pity resets only
 * on a CE hit.
 */
import { FLAVORS, type Edition, type FlavorId } from "./flavors";

export type GachaConfig = {
  costPerPull: number;
  collectorBaseRate: number;
  softPityStart: number;
  softPityStep: number;
  hardPity: number;
  /**
   * After this many duplicate CEs in a row, the next CE is drawn only from
   * unowned CE flavors (like HSR's "Kitty Furb CE within 4 CE draws").
   * `null` disables it.
   */
  newCollectorAfterDupes: number | null;
  refund: Record<Edition, number>;
};

export const GACHA_CONFIG: GachaConfig = {
  costPerPull: 180,
  collectorBaseRate: 0.015,
  softPityStart: 13,
  softPityStep: 0.08,
  hardPity: 20,
  newCollectorAfterDupes: null,
  refund: { classic: 18, collector: 90 },
};

/** Extra copies that raise friendship before extras become refundable. */
export const FRIENDSHIP_MAX = 5;
/** Copies kept: the original plus `FRIENDSHIP_MAX` friendship dupes. */
export const KEPT_COPIES = 1 + FRIENDSHIP_MAX;

export function friendshipLevel(count: number): number {
  return Math.min(FRIENDSHIP_MAX, Math.max(0, count - 1));
}

export function refundableCount(count: number): number {
  return Math.max(0, count - KEPT_COPIES);
}

export type VariantKey = `${FlavorId}:${Edition}`;

export function variantKey(flavor: FlavorId, edition: Edition): VariantKey {
  return `${flavor}:${edition}`;
}

export type GachaState = {
  balance: number;
  /** Pulls since the last Collector's Edition hit. */
  pity: number;
  /** Consecutive CE hits that were duplicates. */
  collectorDupeStreak: number;
  owned: Partial<Record<VariantKey, number>>;
};

export type PullResult = {
  flavor: FlavorId;
  edition: Edition;
  isNew: boolean;
  /** Copies of this variant owned after the pull. */
  copiesAfter: number;
  /** Pity count at the moment of this pull (1-based). */
  pityAt: number;
  viaHardPity: boolean;
  viaNewGuarantee: boolean;
};

/** Mulberry32: tiny seeded PRNG so prototype sessions are reproducible. */
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

/** CE chance on the `pityAt`-th pull since the last CE (1-based). */
export function collectorRateAt(pityAt: number, cfg: GachaConfig = GACHA_CONFIG): number {
  if (pityAt >= cfg.hardPity) return 1;
  if (pityAt < cfg.softPityStart) return cfg.collectorBaseRate;
  return Math.min(1, cfg.collectorBaseRate + (pityAt - cfg.softPityStart + 1) * cfg.softPityStep);
}

export function rollOnce(
  state: GachaState,
  rng: () => number,
  cfg: GachaConfig = GACHA_CONFIG,
): { state: GachaState; result: PullResult } {
  const pityAt = state.pity + 1;
  const rate = collectorRateAt(pityAt, cfg);
  const hitCollector = rate >= 1 || rng() < rate;
  const edition: Edition = hitCollector ? "collector" : "classic";
  const unownedCollectors = FLAVORS.filter((f) => !state.owned[variantKey(f.id, "collector")]);
  const forceNew =
    hitCollector &&
    cfg.newCollectorAfterDupes != null &&
    state.collectorDupeStreak >= cfg.newCollectorAfterDupes &&
    unownedCollectors.length > 0;
  const pool = forceNew ? unownedCollectors : FLAVORS;
  const flavor = pool[Math.floor(rng() * pool.length)]!.id;
  const key = variantKey(flavor, edition);
  const prev = state.owned[key] ?? 0;
  return {
    state: {
      ...state,
      pity: hitCollector ? 0 : pityAt,
      collectorDupeStreak: hitCollector ? (prev > 0 ? state.collectorDupeStreak + 1 : 0) : state.collectorDupeStreak,
      owned: { ...state.owned, [key]: prev + 1 },
    },
    result: {
      flavor,
      edition,
      isNew: prev === 0,
      copiesAfter: prev + 1,
      pityAt,
      viaHardPity: hitCollector && rate >= 1,
      viaNewGuarantee: forceNew,
    },
  };
}

export function pull(
  state: GachaState,
  count: number,
  rng: () => number,
  cfg: GachaConfig = GACHA_CONFIG,
): { state: GachaState; results: PullResult[] } | { error: string } {
  const cost = count * cfg.costPerPull;
  if (state.balance < 0) {
    return { error: `Balance is ${state.balance}. Earn ${-state.balance} more to get back to zero before pulling.` };
  }
  if (state.balance < cost) return { error: `Need ${cost} points, have ${state.balance}` };
  let next: GachaState = { ...state, balance: state.balance - cost };
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const r = rollOnce(next, rng, cfg);
    next = r.state;
    results.push(r.result);
  }
  return { state: next, results };
}

export function refundValue(edition: Edition, cfg: GachaConfig = GACHA_CONFIG): number {
  return cfg.refund[edition];
}

function editionOf(key: string): Edition {
  return key.endsWith(":collector") ? "collector" : "classic";
}

export function dupeSummary(owned: GachaState["owned"]): { extras: number; value: number } {
  let extras = 0;
  let value = 0;
  for (const [key, count] of Object.entries(owned)) {
    const extra = refundableCount(count ?? 0);
    if (extra === 0) continue;
    extras += extra;
    value += extra * refundValue(editionOf(key));
  }
  return { extras, value };
}

export function refundAllDupes(state: GachaState): GachaState {
  const { value } = dupeSummary(state.owned);
  const owned: GachaState["owned"] = {};
  for (const [key, count] of Object.entries(state.owned)) {
    if ((count ?? 0) > 0) owned[key as VariantKey] = Math.min(count ?? 0, KEPT_COPIES);
  }
  return { ...state, balance: state.balance + value, owned };
}

export function refundOne(state: GachaState, key: VariantKey): GachaState {
  const count = state.owned[key] ?? 0;
  if (refundableCount(count) <= 0) return state;
  return {
    ...state,
    balance: state.balance + refundValue(editionOf(key)),
    owned: { ...state.owned, [key]: count - 1 },
  };
}

export type SimulationStats = {
  runs: number;
  avgPullsPerCollector: number;
  p50PullsPerCollector: number;
  p90PullsPerCollector: number;
  /** 1 / average pulls per CE; comparable to HSR's "consolidated chance". */
  consolidatedCollectorRate: number;
  hardPityShare: number;
  avgPullsAllClassics: number;
  avgPullsFullSet: number;
  avgNetPointsFullSet: number;
};

/**
 * Monte Carlo of the same roll rules as `rollOnce`, drawing from the RNG in
 * the same order, but on flat counters: copying `GachaState` and scanning every
 * flavor per pull made 10k runs take seconds on the pull page.
 */
export function simulate(runs = 10_000, seed = 42, cfg: GachaConfig = GACHA_CONFIG): SimulationStats {
  const rng = seededRng(seed);
  const n = FLAVORS.length;
  const classic = new Int32Array(n);
  const collector = new Int32Array(n);
  const unowned = new Int32Array(n);
  const gapCounts = new Float64Array(cfg.hardPity + 1);
  let gapTotal = 0;
  let gapSum = 0;
  let hardHits = 0;
  let sumClassics = 0;
  let sumFull = 0;
  let sumNet = 0;

  for (let run = 0; run < runs; run++) {
    classic.fill(0);
    collector.fill(0);
    let classicsOwned = 0;
    let collectorsOwned = 0;
    let pity = 0;
    let dupeStreak = 0;
    let pulls = 0;
    let classicsDoneAt = 0;
    let refunded = 0;
    while (classicsOwned < n || collectorsOwned < n) {
      const pityAt = pity + 1;
      const rate = collectorRateAt(pityAt, cfg);
      const hit = rate >= 1 || rng() < rate;
      let idx: number;
      if (
        hit &&
        cfg.newCollectorAfterDupes != null &&
        dupeStreak >= cfg.newCollectorAfterDupes &&
        collectorsOwned < n
      ) {
        let m = 0;
        for (let i = 0; i < n; i++) if (collector[i] === 0) unowned[m++] = i;
        idx = unowned[Math.floor(rng() * m)]!;
      } else {
        idx = Math.floor(rng() * n);
      }
      pulls++;
      const copies = hit ? ++collector[idx]! : ++classic[idx]!;
      if (copies > KEPT_COPIES) refunded += cfg.refund[hit ? "collector" : "classic"];
      if (hit) {
        if (copies === 1) collectorsOwned++;
        dupeStreak = copies > 1 ? dupeStreak + 1 : 0;
        pity = 0;
        gapCounts[pityAt]!++;
        gapTotal++;
        gapSum += pityAt;
        if (rate >= 1) hardHits++;
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
    avgNetPointsFullSet: sumNet / runs,
  };
}
