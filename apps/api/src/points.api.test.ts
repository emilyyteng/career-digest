import { readFile } from "node:fs/promises";
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

function categoryPoints(
  summary: Awaited<ReturnType<typeof getPointsSummary>>,
  category: string,
): number {
  return summary.categories.find((c) => c.category === category)?.points ?? 0;
}

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

  it("a reversed earn nets to 0 in its category", async () => {
    await truncateAll();
    await recordEarn(pool, {
      category: "task",
      amount: 30,
      message: "done",
      sourceType: "task_complete",
      sourceId: "t-rev",
    });
    await reverseEarn(pool, "task_complete", "t-rev", "reopened");

    expect(await getPointsBalance(pool)).toBe(0);
    const summary = await getPointsSummary(pool);
    expect(categoryPoints(summary, "task")).toBe(0);

    const events = await listPointsEvents(pool, { limit: 10 });
    expect(events.find((e) => e.kind === "earn")?.amount).toBe(30);
    expect(events.find((e) => e.kind === "reverse")?.amount).toBe(-30);
  });

  it("a reverse that exceeds the remaining balance goes negative (R7.3)", async () => {
    await truncateAll();
    await recordEarn(pool, {
      category: "task",
      amount: 50,
      message: "keep",
      sourceType: "task_complete",
      sourceId: "t-keep",
    });
    // Simulate a prior spend that drained most of the purse (gacha arrives in M7-02).
    await pool.query(
      `INSERT INTO points_events (
         kind, category, amount, balance_after, message, source_type, source_id
       ) VALUES (
         'adjust', 'task', -40, 10, 'simulate prior spend', 'manual_test', 'spend-sim'
       )`,
    );
    expect(await getPointsBalance(pool)).toBe(10);

    const { appliedDelta, event } = await reverseEarn(
      pool,
      "task_complete",
      "t-keep",
      "reopened with thin balance",
    );
    expect(appliedDelta).toBe(-50);
    expect(event?.balanceAfter).toBe(-40);
    expect(await getPointsBalance(pool)).toBe(-40);

    const summary = await getPointsSummary(pool);
    expect(summary.balance).toBe(-40);
  });

  it("earn, adjust, then reverse nets to 0 in its category", async () => {
    await truncateAll();
    await recordEarn(pool, {
      category: "task",
      amount: 30,
      message: "done",
      sourceType: "task_complete",
      sourceId: "t-adj-rev",
    });
    await adjustEarnAmount(pool, "task_complete", "t-adj-rev", 45, "actual updated");
    await reverseEarn(pool, "task_complete", "t-adj-rev", "reopened");

    expect(await getPointsBalance(pool)).toBe(0);
    expect(categoryPoints(await getPointsSummary(pool), "task")).toBe(0);
  });

  it("category totals sum to the balance after mixed earns, adjusts and reverses", async () => {
    await truncateAll();
    await recordEarn(pool, {
      category: "task",
      amount: 40,
      message: "a",
      sourceType: "task_complete",
      sourceId: "t-a",
    });
    await recordEarn(pool, {
      category: "task",
      amount: 25,
      message: "b",
      sourceType: "task_complete",
      sourceId: "t-b",
    });
    await adjustEarnAmount(pool, "task_complete", "t-a", 55, "actual updated");
    await reverseEarn(pool, "task_complete", "t-b", "reopened");
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 3);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 1);
    await syncLeetcodeDailyPoints(pool, "2026-03-11", 2);
    await syncLeetcodeDailyPoints(pool, "2026-03-11", 0);

    const summary = await getPointsSummary(pool);
    const total = summary.categories.reduce((sum, c) => sum + c.points, 0);
    expect(summary.balance).toBe(55 + 30);
    expect(total).toBe(summary.balance);
    expect(categoryPoints(summary, "task")).toBe(55);
    expect(categoryPoints(summary, "leetcode")).toBe(30);
  });

  it("migration 027 repairs earns zeroed by the old reverse", async () => {
    await truncateAll();
    await recordEarn(pool, {
      category: "task",
      amount: 30,
      message: "plain",
      sourceType: "task_complete",
      sourceId: "t-legacy-1",
    });
    await reverseEarn(pool, "task_complete", "t-legacy-1", "reopened");
    await recordEarn(pool, {
      category: "task",
      amount: 30,
      message: "adjusted",
      sourceType: "task_complete",
      sourceId: "t-legacy-2",
    });
    await adjustEarnAmount(pool, "task_complete", "t-legacy-2", 45, "actual updated");
    await reverseEarn(pool, "task_complete", "t-legacy-2", "reopened");
    await recordEarn(pool, {
      category: "task",
      amount: 20,
      message: "kept",
      sourceType: "task_complete",
      sourceId: "t-kept",
    });

    // Simulate rows written before the fix: reversed earns had amount = 0.
    await pool.query(
      `UPDATE points_events SET amount = 0
       WHERE kind = 'earn' AND source_id IN ('t-legacy-1', 't-legacy-2')`,
    );
    expect(categoryPoints(await getPointsSummary(pool), "task")).toBe(20 - 30 - 30);

    const sql = await readFile(
      new URL("./sql/027_repair_reversed_earn_amounts.sql", import.meta.url),
      "utf8",
    );
    await pool.query(sql);
    await pool.query(sql);

    const summary = await getPointsSummary(pool);
    expect(summary.balance).toBe(20);
    expect(categoryPoints(summary, "task")).toBe(20);
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
    expect(await getPointsBalance(pool)).toBe(POINTS.miscTaskBase + 45 + POINTS.reflectionBonus);

    const res = await apiClient().get("/api/points");
    expect(res.status).toBe(200);
    expect(res.body.balance).toBe(75);
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
    expect(res.body.points?.amount).toBe(35);
    expect(res.body.points?.balanceAfter).toBe(35);
    expect(await getPointsBalance(pool)).toBe(35);
  });

  it("PATCH actual on pre-ledger completed task seeds earn, then adjusts", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Old homework", category: "school" });
    const completed = await apiClient()
      .post(`/api/tasks/${task.id}/complete`)
      .send({ actualMinutes: 20 });
    expect(completed.status).toBe(200);
    expect(await getPointsBalance(pool)).toBe(30);

    // Simulate pre-ledger completion: wipe events but keep completed task.
    await pool.query(`DELETE FROM points_events`);
    expect(await getPointsBalance(pool)).toBe(0);

    const seeded = await apiClient()
      .patch(`/api/tasks/${task.id}`)
      .send({ actualMinutes: 40 });
    expect(seeded.status).toBe(200);
    expect(seeded.body.actualMinutes).toBe(40);
    expect(seeded.body.pointsEarned).toBe(50);
    expect(seeded.body.points?.amount).toBe(50);
    expect(await getPointsBalance(pool)).toBe(50);

    const events = await listPointsEvents(pool, { limit: 10 });
    expect(events.some((e) => e.kind === "earn" && e.amount === 50)).toBe(true);

    const adjusted = await apiClient()
      .patch(`/api/tasks/${task.id}`)
      .send({ actualMinutes: 55 });
    expect(adjusted.status).toBe(200);
    expect(adjusted.body.points).toMatchObject({
      amount: 15,
      message: "Old homework time updated · +15 points",
      balanceAfter: 65,
    });
    expect(await getPointsBalance(pool)).toBe(65);
    const after = await listPointsEvents(pool, { limit: 10 });
    expect(after.some((e) => e.kind === "adjust" && e.amount === 15)).toBe(true);
    expect(after.some((e) => e.kind === "earn" && e.amount === 50)).toBe(true);
    const summary = await getPointsSummary(pool);
    expect(summary.balance).toBe(65);
    expect(summary.categories.find((c) => c.category === "task")?.points).toBe(65);
  });
});

describe.skipIf(!integrationReady)("reversed earns can be reinstated (M4-03)", () => {
  async function complete(id: string, actualMinutes?: number | null) {
    const res = await apiClient()
      .post(`/api/tasks/${id}/complete`)
      .send(actualMinutes === undefined ? {} : { actualMinutes });
    expect(res.status).toBe(200);
    return res.body as { points?: { amount: number; message: string; balanceAfter: number } };
  }

  async function reopen(id: string) {
    const res = await apiClient().post(`/api/tasks/${id}/reopen`);
    expect(res.status).toBe(200);
  }

  async function expectLedger(balance: number, category: string, points: number) {
    const summary = await getPointsSummary(pool);
    expect(summary.balance).toBe(balance);
    expect(categoryPoints(summary, category)).toBe(points);
    expect(summary.categories.reduce((sum, c) => sum + c.points, 0)).toBe(balance);
  }

  it("complete 30, reopen, complete 30 nets 0", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Essay", category: "school" });
    await complete(task.id, 30);
    await reopen(task.id);
    await expectLedger(0, "task", 0);
    const again = await complete(task.id, 30);
    await expectLedger(40, "task", 40);
    expect(again.points?.message).toBe(
      "Essay complete again · +40 points (40 before reopen, net ±0)",
    );
    expect(again.points?.balanceAfter).toBe(40);
  });

  it("re-complete at 45 nets +15; at 20 nets −10", async () => {
    await truncateAll();
    const up = await seedTask({ title: "Up", category: "school" });
    await complete(up.id, 30);
    await reopen(up.id);
    const upAgain = await complete(up.id, 45);
    expect(upAgain.points?.message).toContain("net +15");
    await expectLedger(55, "task", 55);

    const down = await seedTask({ title: "Down", category: "school" });
    await complete(down.id, 30);
    await reopen(down.id);
    const downAgain = await complete(down.id, 20);
    expect(downAgain.points?.message).toContain("net −10");
    await expectLedger(85, "task", 85);
  });

  it("blank actual, reopen, blank actual nets 0", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Blank", category: "school" });
    await complete(task.id);
    await expectLedger(10, "task", 10);
    await reopen(task.id);
    await complete(task.id);
    await expectLedger(10, "task", 10);
  });

  it("several reopen/re-complete cycles depend only on the last actual, and later edits adjust from it", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Cycle", category: "school" });
    await complete(task.id, 30);
    await reopen(task.id);
    await complete(task.id, 50);
    await reopen(task.id);
    await complete(task.id, 10);
    await reopen(task.id);
    await complete(task.id, 40);
    await expectLedger(50, "task", 50);

    const patched = await apiClient().patch(`/api/tasks/${task.id}`).send({ actualMinutes: 25 });
    expect(patched.status).toBe(200);
    expect(patched.body.pointsEarned).toBe(35);
    await expectLedger(35, "task", 35);

    await reopen(task.id);
    await expectLedger(0, "task", 0);
  });

  it("keeps the reflection add-on from the first completion", async () => {
    await truncateAll();
    const task = await seedTask({ title: "Reflected", category: "school" });
    const first = await apiClient()
      .post(`/api/tasks/${task.id}/complete`)
      .send({ actualMinutes: 30, reflection: { lane: "other", body: "Went well" } });
    expect(first.status).toBe(200);
    expect(first.body.points?.amount).toBe(60);
    await reopen(task.id);
    await complete(task.id, 30);
    await expectLedger(60, "task", 60);
  });

  it("LeetCode 1 → 0 → 1 earns one solve", async () => {
    await truncateAll();
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 1);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 0);
    await expectLedger(0, "leetcode", 0);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 1);
    await expectLedger(30, "leetcode", 30);
  });

  it("LeetCode 2 → 0 → 3 earns three solves, then later changes adjust", async () => {
    await truncateAll();
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 2);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 0);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 3);
    await expectLedger(90, "leetcode", 90);
    await syncLeetcodeDailyPoints(pool, "2026-03-10", 4);
    await expectLedger(120, "leetcode", 120);
  });

  it("LeetCode 1 → 0 → 1 → 0 ends at 0 with every step in the log", async () => {
    await truncateAll();
    for (const count of [1, 0, 1, 0]) {
      await syncLeetcodeDailyPoints(pool, "2026-03-10", count);
    }
    await expectLedger(0, "leetcode", 0);
    const events = (await listPointsEvents(pool, { limit: 20 })).reverse();
    expect(events.map((e) => [e.kind, e.amount])).toEqual([
      ["earn", 30],
      ["reverse", -30],
      ["adjust", 30],
      ["reverse", -30],
    ]);
    expect(events[2].message).toBe("LC 1 · +30 points");
  });
});

describe.skipIf(!integrationReady)("points breakdown by task category (M5-03)", () => {
  async function categoryId(name: string): Promise<string> {
    const { rows } = await pool.query<{ id: string }>(
      `SELECT id FROM task_categories WHERE lower(name) = lower($1)`,
      [name],
    );
    return rows[0].id;
  }

  async function complete(id: string, actualMinutes: number) {
    const res = await apiClient().post(`/api/tasks/${id}/complete`).send({ actualMinutes });
    expect(res.status).toBe(200);
  }

  async function moveTo(id: string, name: string) {
    const res = await apiClient().patch(`/api/tasks/${id}`).send({ categoryId: await categoryId(name) });
    expect(res.status).toBe(200);
  }

  /** Task category rows by name, after checking they sum to the `task` row. */
  async function breakdown(): Promise<Record<string, number>> {
    const res = await apiClient().get("/api/points");
    expect(res.status).toBe(200);
    const summary = res.body as Awaited<ReturnType<typeof getPointsSummary>>;
    const sum = summary.taskCategories.reduce((s, c) => s + c.points, 0);
    expect(sum).toBe(categoryPoints(summary, "task"));
    return Object.fromEntries(summary.taskCategories.map((c) => [c.name, c.points]));
  }

  it("splits task points across two categories", async () => {
    await truncateAll();
    const essay = await seedTask({ title: "Essay", categoryName: "School" });
    const book = await seedTask({ title: "Book", categoryName: "Reading" });
    await complete(essay.id, 30);
    await complete(book.id, 20);
    expect(await breakdown()).toEqual({ School: 40, Reading: 30 });
  });

  it("keeps points with the category at completion when the task moves, including later adjusts", async () => {
    await truncateAll();
    const essay = await seedTask({ title: "Essay", categoryName: "School" });
    await complete(essay.id, 30);
    await moveTo(essay.id, "Reading");
    expect(await breakdown()).toEqual({ School: 40 });

    const res = await apiClient().patch(`/api/tasks/${essay.id}`).send({ actualMinutes: 50 });
    expect(res.status).toBe(200);
    expect(await breakdown()).toEqual({ School: 60 });
  });

  it("an earn from before M5-03 falls back to the task's current category", async () => {
    await truncateAll();
    const essay = await seedTask({ title: "Essay", categoryName: "School" });
    await complete(essay.id, 30);
    await pool.query(
      `UPDATE points_events SET meta = meta - 'task_category_id' - 'task_category_name'
       WHERE source_type = 'task_complete'`,
    );
    await moveTo(essay.id, "Reading");
    expect(await breakdown()).toEqual({ Reading: 40 });
  });

  it("a reopened task nets 0 and drops out; re-completing counts under its new category", async () => {
    await truncateAll();
    const essay = await seedTask({ title: "Essay", categoryName: "School" });
    await complete(essay.id, 30);
    const reopened = await apiClient().post(`/api/tasks/${essay.id}/reopen`);
    expect(reopened.status).toBe(200);
    expect(await breakdown()).toEqual({});

    await moveTo(essay.id, "Writing");
    await complete(essay.id, 45);
    expect(await breakdown()).toEqual({ Writing: 55 });
  });

  it("a deleted task's points go to Deleted tasks, which is hidden at 0", async () => {
    await truncateAll();
    const kept = await seedTask({ title: "Kept", categoryName: "School" });
    const gone = await seedTask({ title: "Gone", categoryName: "School" });
    const zero = await seedTask({ title: "Zero", categoryName: "Reading" });
    await complete(kept.id, 30);
    await complete(gone.id, 20);
    await complete(zero.id, 20);
    await apiClient().post(`/api/tasks/${zero.id}/reopen`).expect(200);

    await apiClient().delete(`/api/tasks/${gone.id}`).expect(200);
    await apiClient().delete(`/api/tasks/${zero.id}`).expect(200);
    expect(await breakdown()).toEqual({ School: 40, "Deleted tasks": 30 });
  });

  it("a renamed category shows its new name; a deleted one keeps its recorded name", async () => {
    await truncateAll();
    const name = `Side ${Date.now()}`;
    const created = await apiClient().post("/api/task-categories").send({ name });
    expect(created.status).toBe(201);
    const task = await seedTask({ title: "Side task", categoryName: name });
    await complete(task.id, 20);

    await apiClient().patch(`/api/task-categories/${created.body.id}`).send({ name: `${name} 2` }).expect(200);
    expect(await breakdown()).toEqual({ [`${name} 2`]: 30 });

    await apiClient().delete(`/api/task-categories/${created.body.id}`).expect(200);
    expect(await breakdown()).toEqual({ [`${name} 2`]: 30 });
  });
});
