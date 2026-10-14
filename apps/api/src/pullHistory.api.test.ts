import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { pullCatCakes, type Rng } from "./catCakeGacha.js";
import { recordEarn } from "./pointsLedger.js";
import { apiClient } from "./test/apiClient.js";
import { truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

function scriptedRng(values: number[]): Rng {
  let i = 0;
  return () => {
    const v = values[i] ?? 0;
    i += 1;
    return v;
  };
}

describe.skipIf(!integrationReady)("GET /api/rewards/history", () => {
  async function fund(amount: number): Promise<void> {
    await recordEarn(pool, {
      category: "task",
      amount,
      message: "fund",
      sourceType: "task_complete",
      sourceId: `fund-hist-${amount}-${Date.now()}-${Math.random()}`,
    });
  }

  it("lists spends with timesPulled and lifetime spend; excludes refunds", async () => {
    await truncateAll();
    await fund(2000);
    // Two classic strawberry pulls.
    await pullCatCakes(pool, 1, scriptedRng([0.99, 0]));
    await pullCatCakes(pool, 1, scriptedRng([0.99, 0]));

    const res = await apiClient()
      .get("/api/rewards/history")
      .query({ range: "all", tz: "UTC" })
      .expect(200);

    const body = res.body as {
      lifetimeSpend: number;
      rangeSpend: number;
      sessions: Array<{
        count: number;
        cost: number;
        lifetimeSpendAfter: number;
        results: Array<{
          flavorId: string;
          timesPulled: number;
          seedsSpent: number;
        }>;
      }>;
    };

    expect(body.lifetimeSpend).toBe(360);
    expect(body.rangeSpend).toBe(360);
    expect(body.sessions).toHaveLength(2);
    // Newest first: second pull is 2nd time strawberry classic.
    expect(body.sessions[0]!.results[0]!.flavorId).toBe("strawberry");
    expect(body.sessions[0]!.results[0]!.timesPulled).toBe(2);
    expect(body.sessions[0]!.lifetimeSpendAfter).toBe(360);
    expect(body.sessions[1]!.results[0]!.timesPulled).toBe(1);
    expect(body.sessions[1]!.lifetimeSpendAfter).toBe(180);
  });
});
