import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { recordEarn, recordRefund, recordSpend } from "./pointsLedger.js";
import { resolveEarningsRangeBounds } from "./earningsRange.js";
import { apiClient } from "./test/apiClient.js";
import { truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "America/Los_Angeles";

describe("earningsRangeBounds", () => {
  it("maps today / this_week / all", () => {
    // Wednesday 2026-10-14 12:00 PDT
    const now = new Date("2026-10-14T19:00:00.000Z");
    expect(resolveEarningsRangeBounds("all", now, TZ)).toEqual({
      from: null,
      to: null,
    });
    const today = resolveEarningsRangeBounds("today", now, TZ);
    expect(today.from?.toISOString()).toBe("2026-10-14T07:00:00.000Z");
    expect(today.to?.toISOString()).toBe("2026-10-15T07:00:00.000Z");
    const week = resolveEarningsRangeBounds("this_week", now, TZ);
    expect(week.from?.toISOString()).toBe("2026-10-12T07:00:00.000Z");
    expect(week.to?.toISOString()).toBe("2026-10-19T07:00:00.000Z");
  });
});

describe.skipIf(!integrationReady)("GET /api/rewards/earnings", () => {
  it("excludes spends, keeps Cake refunds in earn-side totals, and tracks lifetimeAfter", async () => {
    await truncateAll();
    await recordEarn(pool, {
      category: "task",
      amount: 200,
      message: "task done",
      sourceType: "task_complete",
      sourceId: "earn-1",
      meta: { task_category_name: "Misc" },
    });
    await recordSpend(pool, {
      amount: 180,
      message: "Pull ×1",
      sourceType: "gacha_pull",
      sourceId: "pull-earn-test",
    });
    await recordRefund(pool, {
      amount: 18,
      message: "Refund classic dupe",
      sourceType: "gacha_refund",
      sourceId: "refund-earn-test",
    });

    const res = await apiClient()
      .get("/api/rewards/earnings")
      .query({ range: "all", tz: TZ })
      .expect(200);

    const body = res.body as {
      lifetimeEarned: number;
      rangeEarned: number;
      categories: Array<{ category: string; points: number }>;
      events: Array<{ kind: string; amount: number; lifetimeAfter: number }>;
    };

    expect(body.lifetimeEarned).toBe(218);
    expect(body.rangeEarned).toBe(218);
    expect(body.categories.find((c) => c.category === "task")?.points).toBe(200);
    expect(body.categories.find((c) => c.category === "gacha")?.points).toBe(18);
    expect(body.events.every((e) => e.kind !== "spend")).toBe(true);
    expect(body.events.some((e) => e.kind === "refund")).toBe(true);
    // Newest first: refund then earn; lifetime after refund is 218.
    expect(body.events[0]?.lifetimeAfter).toBe(218);
    expect(body.events[1]?.lifetimeAfter).toBe(200);
  });
});
