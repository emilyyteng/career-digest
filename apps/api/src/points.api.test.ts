import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import {
  adjustEarnAmount,
  getPointsBalance,
  getPointsSummary,
  listPointsEvents,
  recordEarn,
  reverseEarn,
} from "./pointsLedger.js";
import {
  awardMiscTaskComplete,
  syncLeetcodeDailyPoints,
} from "./pointsAwards.js";
import { POINTS } from "./pointsFormulas.js";
import { apiClient } from "./test/apiClient.js";
import { seedTask, truncateAll } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("points ledger", () => {
  it("recordEarn accumulates balance and is idempotent per source", async () => {
    await truncateAll();
    const first = await recordEarn(pool, {
      category: "task",
      amount: 40,
      message: "Essay complete! +40 points",
      sourceType: "task_complete",
      sourceId: "t1",
    });
    expect(first.created).toBe(true);
    expect(first.event.balanceAfter).toBe(40);

    const second = await recordEarn(pool, {
      category: "task",
      amount: 99,
      message: "dup",
      sourceType: "task_complete",
      sourceId: "t1",
    });
    expect(second.created).toBe(false);
    expect(await getPointsBalance(pool)).toBe(40);

    await recordEarn(pool, {
      category: "leetcode",
      amount: 30,
      message: "LC +1",
      sourceType: "leetcode_daily",
      sourceId: "2026-03-10",
    });
    expect(await getPointsBalance(pool)).toBe(70);

    const summary = await getPointsSummary(pool);
    expect(summary.balance).toBe(70);
    expect(summary.categories.some((c) => c.category === "task" && c.points === 40)).toBe(
      true,
    );
  });

  it("reverseEarn and adjustEarnAmount keep balance ≥ 0", async () => {
    await truncateAll();
    await recordEarn(pool, {
      category: "task",
      amount: 100,
      message: "big",
      sourceType: "task_complete",
      sourceId: "t-adj",
    });
    await recordEarn(pool, {
      category: "application",
      amount: 5,
      message: "app",
      sourceType: "application_applied",
      sourceId: "a1",
    });
    await reverseEarn(pool, "application_applied", "a1", "undo app");

    const mid = await adjustEarnAmount(
      pool,
      "task_complete",
      "t-adj",
      20,
      "actual updated",
    );
    expect(mid.appliedDelta).toBe(-80);
    expect(await getPointsBalance(pool)).toBe(20);
    // Earn row keeps original amount; category SUM = earn + adjusts.
    expect(mid.earn?.amount).toBe(100);
    expect(mid.earn?.meta.current_amount).toBe(20);
    const midSummary = await getPointsSummary(pool);
    expect(midSummary.categories.find((c) => c.category === "task")?.points).toBe(20);

    const clamped = await adjustEarnAmount(
      pool,
      "task_complete",
      "t-adj",
      0,
      "actual updated",
    );
    expect(clamped.requestedDelta).toBe(-20);
    expect(clamped.appliedDelta).toBe(-20);
    expect(await getPointsBalance(pool)).toBe(0);
  });

  it("awardMiscTaskComplete + GET /api/points", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Essay", category: "school" });
    await awardMiscTaskComplete(pool, {
      taskId: task.id,
      title: "Essay",
      actualMinutes: 45,
      withReflection: true,
    });
    expect(await getPointsBalance(pool)).toBe(45 + POINTS.reflectionDefault);

    const res = await apiClient().get("/api/points");
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(65);
  });

  it("syncLeetcodeDailyPoints tracks count up and down", async () => {
    await truncateAll();
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 2);
    expect(await getPointsBalance(pool)).toBe(60);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 3);
    expect(await getPointsBalance(pool)).toBe(90);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 1);
    expect(await getPointsBalance(pool)).toBe(30);
  });

  it("POST /api/tasks/:id/complete awards misc task points", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Read chapter", category: "school" });
    const res = await apiClient()
      .post(`/api/tasks/${task.id}/complete`)
      .send({ actualMinutes: 25 });
    expect(res.status).toBe(200);
    expect(res.body.actualMinutes).toBe(25);
    expect(res.body.points?.amount).toBe(25);
    expect(res.body.points?.balanceAfter).toBe(25);
    expect(await getPointsBalance(pool)).toBe(25);
  });

  it("PATCH actual on pre-ledger completed task seeds earn, then adjusts", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Old homework", category: "school" });
    const completed = await apiClient()
      .post(`/api/tasks/${task.id}/complete`)
      .send({ actualMinutes: 20 });
    expect(completed.status).toBe(200);
    expect(await getPointsBalance(pool)).toBe(20);

    // Simulate pre-ledger completion: wipe events but keep completed task.
    await pool.query(`DELETE FROM points_events`);
    expect(await getPointsBalance(pool)).toBe(0);

    const seeded = await apiClient()
      .patch(`/api/tasks/${task.id}`)
      .send({ actualMinutes: 40 });
    expect(seeded.status).toBe(200);
    expect(seeded.body.actualMinutes).toBe(40);
    expect(seeded.body.pointsEarned).toBe(40);
    expect(await getPointsBalance(pool)).toBe(40);

    const events = await listPointsEvents(pool, { limit: 10 });
    expect(events.some((e) => e.kind === "earn" && e.amount === 40)).toBe(true);

    const adjusted = await apiClient()
      .patch(`/api/tasks/${task.id}`)
      .send({ actualMinutes: 55 });
    expect(adjusted.status).toBe(200);
    expect(await getPointsBalance(pool)).toBe(55);
    const after = await listPointsEvents(pool, { limit: 10 });
    expect(after.some((e) => e.kind === "adjust" && e.amount === 15)).toBe(true);
    expect(after.some((e) => e.kind === "earn" && e.amount === 40)).toBe(true);
    const summary = await getPointsSummary(pool);
    expect(summary.balance).toBe(55);
    expect(summary.categories.find((c) => c.category === "task")?.points).toBe(55);
  });
});
