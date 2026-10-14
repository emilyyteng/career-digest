/**
 * Server-authoritative Cat Cake pull/refund math (F08 M7-04 / R7.7).
 * Production uses OS CSPRNG; tests inject a deterministic rng.
 */
import { randomInt, randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";
import {
  CAT_CAKE_FLAVOR_IDS,
  isCatCakeFlavorId,
  nightUnlocked,
  refundableCount,
  type CatCakeEdition,
  type CatCakeFlavorId,
  type CatCakeLook,
} from "./catCakeCatalog.js";
import {
  getOwnedCopies,
  getPity,
  incrementOwned,
  setOwnedCopies,
  setPity,
  setSelectedLook,
} from "./catCakeCollection.js";
import { getPointsBalance, recordRefund, recordSpend } from "./pointsLedger.js";

type Queryable = Pool | PoolClient;

export type GachaConfig = {
  costPerPull: number;
  collectorBaseRate: number;
  softPityStart: number;
  softPityStep: number;
  hardPity: number;
  refund: Record<CatCakeEdition, number>;
};

export const GACHA_CONFIG: GachaConfig = {
  costPerPull: 180,
  collectorBaseRate: 0.015,
  softPityStart: 13,
  softPityStep: 0.08,
  hardPity: 20,
  refund: { classic: 18, collector: 90 },
};

/** Uniform [0, 1) from OS CSPRNG. */
export function csprngUnit(): number {
  // 53 bits of mantissa precision, matching Math.random quality.
  const n = randomInt(0, 2 ** 26) * 2 ** 27 + randomInt(0, 2 ** 27);
  return n / 2 ** 53;
}

export function collectorRateAt(
  pityAt: number,
  cfg: GachaConfig = GACHA_CONFIG,
): number {
  if (pityAt >= cfg.hardPity) return 1;
  if (pityAt < cfg.softPityStart) return cfg.collectorBaseRate;
  return Math.min(
    1,
    cfg.collectorBaseRate + (pityAt - cfg.softPityStart + 1) * cfg.softPityStep,
  );
}

export type PullResult = {
  flavorId: CatCakeFlavorId;
  edition: CatCakeEdition;
  isNew: boolean;
  copiesAfter: number;
  pityAt: number;
  viaHardPity: boolean;
  nightUnlocked: boolean | null;
};

export type PullOk = {
  count: 1 | 10;
  cost: number;
  balanceAfter: number;
  pity: number;
  results: PullResult[];
  spendEventId: string;
};

export type PullErr = { error: string; code: "insufficient_balance" };

export type Rng = () => number;

function pickFlavor(rng: Rng): CatCakeFlavorId {
  const idx = Math.floor(rng() * CAT_CAKE_FLAVOR_IDS.length);
  return CAT_CAKE_FLAVOR_IDS[idx]!;
}

async function rollOnce(
  db: Queryable,
  pityBefore: number,
  rng: Rng,
  cfg: GachaConfig,
): Promise<{ pityAfter: number; result: PullResult }> {
  const pityAt = pityBefore + 1;
  const rate = collectorRateAt(pityAt, cfg);
  const hitCollector = rate >= 1 || rng() < rate;
  const edition: CatCakeEdition = hitCollector ? "collector" : "classic";
  const flavorId = pickFlavor(rng);
  const prev = await getOwnedCopies(db, flavorId, edition);
  const copiesAfter = await incrementOwned(db, flavorId, edition);
  return {
    pityAfter: hitCollector ? 0 : pityAt,
    result: {
      flavorId,
      edition,
      isNew: prev === 0,
      copiesAfter,
      pityAt,
      viaHardPity: hitCollector && rate >= 1,
      nightUnlocked: edition === "collector" ? nightUnlocked(copiesAfter) : null,
    },
  };
}

/**
 * Pull ×1 or ×10. Rejects when balance < cost. Uses `rng` when provided (tests);
 * otherwise OS CSPRNG.
 */
export async function pullCatCakes(
  db: Queryable,
  count: 1 | 10,
  rng: Rng = csprngUnit,
  cfg: GachaConfig = GACHA_CONFIG,
): Promise<PullOk | PullErr> {
  const cost = count * cfg.costPerPull;
  const balance = await getPointsBalance(db);
  if (balance < cost) {
    return {
      error: `Need ${cost} Seeds, have ${balance}`,
      code: "insufficient_balance",
    };
  }

  const spend = await recordSpend(db, {
    amount: cost,
    message: count === 1 ? "Pull ×1" : "Pull ×10",
    sourceType: "gacha_pull",
    sourceId: `pull-${randomUUID()}`,
    meta: { pulls: count, cost },
  });

  let pity = await getPity(db);
  const results: PullResult[] = [];
  for (let i = 0; i < count; i++) {
    const rolled = await rollOnce(db, pity, rng, cfg);
    pity = rolled.pityAfter;
    results.push(rolled.result);
  }
  await setPity(db, pity);

  // Enrich spend meta with results for pull history (M7-09).
  await db.query(
    `UPDATE points_events SET meta = meta || $2::jsonb WHERE id = $1`,
    [
      spend.id,
      JSON.stringify({
        results: results.map((r) => ({
          flavorId: r.flavorId,
          edition: r.edition,
          isNew: r.isNew,
          copiesAfter: r.copiesAfter,
          pityAt: r.pityAt,
          viaHardPity: r.viaHardPity,
        })),
      }),
    ],
  );

  return {
    count,
    cost,
    balanceAfter: spend.balanceAfter,
    // balanceAfter on spend is pre-results; no further ledger moves in this pull
    pity,
    results,
    spendEventId: spend.id,
  };
}

export type RefundOk = {
  flavorId: CatCakeFlavorId;
  edition: CatCakeEdition;
  credited: number;
  copiesAfter: number;
  balanceAfter: number;
  refundEventId: string;
};

export type RefundErr = {
  error: string;
  code: "not_refundable" | "unknown_variant";
};

export async function refundOneDuplicate(
  db: Queryable,
  flavorId: string,
  edition: string,
  cfg: GachaConfig = GACHA_CONFIG,
): Promise<RefundOk | RefundErr> {
  if (!isCatCakeFlavorId(flavorId)) {
    return { error: "Unknown flavor", code: "unknown_variant" };
  }
  if (edition !== "classic" && edition !== "collector") {
    return { error: "Unknown edition", code: "unknown_variant" };
  }
  const copies = await getOwnedCopies(db, flavorId, edition);
  if (refundableCount(copies) <= 0) {
    return {
      error: `Nothing refundable (owned ${copies}; need more than 6)`,
      code: "not_refundable",
    };
  }
  const credited = cfg.refund[edition];
  const copiesAfter = copies - 1;
  await setOwnedCopies(db, flavorId, edition, copiesAfter);
  const event = await recordRefund(db, {
    amount: credited,
    message:
      edition === "collector"
        ? `Refund CE dupe · ${flavorId}`
        : `Refund classic dupe · ${flavorId}`,
    sourceType: "gacha_refund",
    sourceId: `refund-${flavorId}-${edition}-${Date.now()}`,
    meta: {
      flavorId,
      edition,
      copiesBefore: copies,
      copiesAfter,
      credited,
    },
  });
  return {
    flavorId,
    edition,
    credited,
    copiesAfter,
    balanceAfter: event.balanceAfter,
    refundEventId: event.id,
  };
}

export type LookOk = {
  flavorId: CatCakeFlavorId;
  selectedLook: CatCakeLook;
  nightUnlocked: boolean;
};

export type LookErr = {
  error: string;
  code: "unknown_flavor" | "night_locked";
};

export async function selectCeLook(
  db: Queryable,
  flavorId: string,
  look: string,
): Promise<LookOk | LookErr> {
  if (!isCatCakeFlavorId(flavorId)) {
    return { error: "Unknown flavor", code: "unknown_flavor" };
  }
  if (look !== "day" && look !== "night") {
    return { error: "Look must be day or night", code: "unknown_flavor" };
  }
  const copies = await getOwnedCopies(db, flavorId, "collector");
  if (!nightUnlocked(copies)) {
    return {
      error: "Night skin unlocks at the second CE copy",
      code: "night_locked",
    };
  }
  await setSelectedLook(db, flavorId, look);
  return { flavorId, selectedLook: look, nightUnlocked: true };
}
