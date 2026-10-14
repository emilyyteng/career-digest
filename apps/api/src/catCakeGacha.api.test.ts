import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import {
  getCatCakeCollection,
  setOwnedCopies,
  setPity,
} from "./catCakeCollection.js";
import {
  collectorRateAt,
  pullCatCakes,
  refundOneDuplicate,
  selectCeLook,
  type Rng,
} from "./catCakeGacha.js";
import { getPointsBalance, recordEarn } from "./pointsLedger.js";
import { apiClient } from "./test/apiClient.js";
import { truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

/** Deterministic sequence: first value, then zeros (classic), with 1s for CE. */
function scriptedRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i] ?? 0;
    i += 1;
    return v;
  };
}

describe.skipIf(!integrationReady)("cat cake gacha pull/refund", () => {
  async function fund(amount: number): Promise<void> {
    await recordEarn(pool, {
      category: "task",
      amount,
      message: "fund",
      sourceType: "task_complete",
      sourceId: `fund-${amount}-${Date.now()}-${Math.random()}`,
    });
  }

  it("rejects pull when balance is below cost", async () => {
    await truncateAll();
    await fund(100);
    const res = await pullCatCakes(pool, 1, () => 0);
    expect(res).toMatchObject({ code: "insufficient_balance" });
    expect(await getPointsBalance(pool)).toBe(100);
  });

  it("rejects pull when balance is negative", async () => {
    await truncateAll();
    await fund(50);
    await pool.query(
      `INSERT INTO points_events (
         kind, category, amount, balance_after, message, source_type, source_id
       ) VALUES (
         'spend', 'gacha', -100, -50, 'prior', 'gacha_pull', 'prior-1'
       )`,
    );
    expect(await getPointsBalance(pool)).toBe(-50);
    const res = await pullCatCakes(pool, 1, () => 0.99);
    expect(res).toMatchObject({ code: "insufficient_balance" });
  });

  it("pull ×1 spends 180 and returns one result", async () => {
    await truncateAll();
    await fund(200);
    // rng: rate check (≥ base → classic), then flavor index 0 → strawberry
    const rng = scriptedRng([0.99, 0]);
    const res = await pullCatCakes(pool, 1, rng);
    expect("results" in res).toBe(true);
    if (!("results" in res)) return;
    expect(res.cost).toBe(180);
    expect(res.balanceAfter).toBe(20);
    expect(res.results).toHaveLength(1);
    expect(res.results[0]!.edition).toBe("classic");
    expect(res.results[0]!.flavorId).toBe("strawberry");
    expect(res.results[0]!.isNew).toBe(true);
    expect(res.results[0]!.copiesAfter).toBe(1);
    expect(res.results[0]!.timesPulled).toBe(1);
    expect(res.pity).toBe(1);
    expect(await getPointsBalance(pool)).toBe(20);
  });

  it("timesPulled counts historical pulls even after refunds reduce owned", async () => {
    await truncateAll();
    await fund(2000);
    const rng = () => scriptedRng([0.99, 0]);
    for (let i = 0; i < 3; i++) {
      const res = await pullCatCakes(pool, 1, rng());
      expect("results" in res).toBe(true);
      if (!("results" in res)) return;
      expect(res.results[0]!.timesPulled).toBe(i + 1);
    }
    await setOwnedCopies(pool, "strawberry", "classic", 1);
    const again = await pullCatCakes(pool, 1, scriptedRng([0.99, 0]));
    expect("results" in again).toBe(true);
    if (!("results" in again)) return;
    expect(again.results[0]!.copiesAfter).toBe(2);
    expect(again.results[0]!.timesPulled).toBe(4);
  });

  it("pull ×10 spends 1,800 and returns ten results", async () => {
    await truncateAll();
    await fund(2000);
    // Each pull: rate miss (0.99) + flavor 0
    const rng = scriptedRng(
      Array.from({ length: 20 }, (_, i) => (i % 2 === 0 ? 0.99 : 0)),
    );
    const res = await pullCatCakes(pool, 10, rng);
    expect("results" in res).toBe(true);
    if (!("results" in res)) return;
    expect(res.cost).toBe(1800);
    expect(res.results).toHaveLength(10);
    expect(res.results.every((r) => r.edition === "classic")).toBe(true);
    expect(res.balanceAfter).toBe(200);
    expect(await getPointsBalance(pool)).toBe(200);
  });

  it("hard pity guarantees a CE on the 20th pull since last CE", async () => {
    await truncateAll();
    await fund(180);
    await setPity(pool, 19);
    // rate is 1 at pityAt 20, so first rng draw is unused for rate; flavor uses next
    const rng = scriptedRng([0.5]); // only flavor roll
    const res = await pullCatCakes(pool, 1, rng);
    expect("results" in res).toBe(true);
    if (!("results" in res)) return;
    expect(res.results[0]!.edition).toBe("collector");
    expect(res.results[0]!.viaHardPity).toBe(true);
    expect(res.results[0]!.pityAt).toBe(20);
    expect(res.pity).toBe(0);
    expect(collectorRateAt(20)).toBe(1);
  });

  it("soft pity climbs the CE rate from pull 13", async () => {
    expect(collectorRateAt(13)).toBeGreaterThan(0.015);
  });

  it("second CE copy unlocks Night; first does not", async () => {
    await truncateAll();
    await fund(360);
    await setPity(pool, 19);
    const first = await pullCatCakes(pool, 1, scriptedRng([0])); // hard pity CE, flavor 0
    expect("results" in first).toBe(true);
    if (!("results" in first)) return;
    expect(first.results[0]!.edition).toBe("collector");
    expect(first.results[0]!.nightUnlocked).toBe(false);

    await setPity(pool, 19);
    const second = await pullCatCakes(pool, 1, scriptedRng([0]));
    expect("results" in second).toBe(true);
    if (!("results" in second)) return;
    expect(second.results[0]!.edition).toBe("collector");
    expect(second.results[0]!.flavorId).toBe(first.results[0]!.flavorId);
    expect(second.results[0]!.nightUnlocked).toBe(true);
    expect(second.results[0]!.copiesAfter).toBe(2);
  });

  it("refund rejects at 6 copies and credits above 6", async () => {
    await truncateAll();
    await setOwnedCopies(pool, "ube", "classic", 6);
    const rejected = await refundOneDuplicate(pool, "ube", "classic");
    expect(rejected).toMatchObject({ code: "not_refundable" });

    await setOwnedCopies(pool, "ube", "classic", 7);
    const ok = await refundOneDuplicate(pool, "ube", "classic");
    expect("credited" in ok).toBe(true);
    if (!("credited" in ok)) return;
    expect(ok.credited).toBe(18);
    expect(ok.copiesAfter).toBe(6);
    expect(await getPointsBalance(pool)).toBe(18);

    await setOwnedCopies(pool, "lemon", "collector", 8);
    const ce = await refundOneDuplicate(pool, "lemon", "collector");
    expect("credited" in ce).toBe(true);
    if (!("credited" in ce)) return;
    expect(ce.credited).toBe(90);
    expect(ce.copiesAfter).toBe(7);
  });

  it("selectCeLook requires Night unlock", async () => {
    await truncateAll();
    await setOwnedCopies(pool, "peach", "collector", 1);
    const locked = await selectCeLook(pool, "peach", "night");
    expect(locked).toMatchObject({ code: "night_locked" });
    await setOwnedCopies(pool, "peach", "collector", 2);
    const ok = await selectCeLook(pool, "peach", "night");
    expect(ok).toMatchObject({ selectedLook: "night", nightUnlocked: true });
  });

  it("HTTP pull and refund endpoints", async () => {
    await truncateAll();
    await fund(200);
    const pullRes = await apiClient()
      .post("/api/rewards/pull")
      .send({ count: 1 });
    expect(pullRes.status).toBe(200);
    expect(pullRes.body.results).toHaveLength(1);
    expect(pullRes.body.cost).toBe(180);

    const poor = await apiClient().post("/api/rewards/pull").send({ count: 10 });
    expect(poor.status).toBe(409);
    expect(poor.body.code).toBe("insufficient_balance");

    await setOwnedCopies(pool, "sesame", "classic", 7);
    const refundRes = await apiClient()
      .post("/api/rewards/refund")
      .send({ flavorId: "sesame", edition: "classic" });
    expect(refundRes.status).toBe(200);
    expect(refundRes.body.credited).toBe(18);

    await setOwnedCopies(pool, "sesame", "collector", 2);
    const lookRes = await apiClient()
      .post("/api/rewards/look")
      .send({ flavorId: "sesame", look: "night" });
    expect(lookRes.status).toBe(200);
    expect(lookRes.body.selectedLook).toBe("night");
  });
});
