import { describe, expect, it } from "vitest";
import { apiClient } from "./test/apiClient.js";
import {
  seedApplication,
  seedCompany,
  seedRankedPosting,
  seedTask,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("home API", () => {
  it("GET /api/home returns job picks without todo applications", async () => {
    const company = await seedCompany({ name: "Home Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "home-ranked-1",
      companyId: company.id,
      title: "Strategy Intern",
      url: "https://boards.greenhouse.io/home/jobs/1",
      rankScore: 95,
    });
    await seedApplication({ postingId: posting.id, status: "todo" });

    const res = await apiClient().get("/api/home").expect(200);

    expect(res.body.todo).toBeUndefined();
    expect(res.body.todoTotal).toBeUndefined();
    expect(
      res.body.newAndTopPicks.topRanked.some((job: { id: string }) => job.id === posting.id),
    ).toBe(true);
    expect(res.body.newAndTopPicks.topRanked[0]).toMatchObject({
      id: posting.id,
      title: "Strategy Intern",
      company: "Home Co",
    });
  });

  it("GET /api/home returns open tasks attention slice sorted by due date", async () => {
    const later = new Date("2026-09-15T17:00:00.000Z");
    const sooner = new Date("2026-09-01T17:00:00.000Z");
    const undated = await seedTask({
      category: "personal",
      title: "Schedule interview",
      organization: null,
    });
    const datedSoon = await seedTask({
      category: "school",
      title: "Homework",
      organization: "CS 229",
      dueAt: sooner,
    });
    const datedLate = await seedTask({
      category: "application",
      title: "Apply to Stripe",
      organization: "Stripe",
      dueAt: later,
    });
    for (let i = 0; i < 3; i += 1) {
      await seedTask({
        category: "school",
        title: `Extra task ${i}`,
        dueAt: new Date(`2026-10-${String(i + 1).padStart(2, "0")}T12:00:00.000Z`),
      });
    }

    const res = await apiClient().get("/api/home").expect(200);

    expect(res.body.needsAttention.taskTotal).toBe(6);
    expect(res.body.needsAttention.tasks).toHaveLength(4);
    expect(res.body.needsAttention.tasks[0].id).toBe(datedSoon.id);
    expect(res.body.needsAttention.tasks[1].id).toBe(datedLate.id);
    expect(res.body.needsAttention.tasks.map((row: { id: string }) => row.id)).not.toContain(
      undated.id,
    );
    expect(res.body.needsAttention.tasks[0]).toMatchObject({
      title: "Homework",
      organization: "CS 229",
      category: "school",
      dueIso: sooner.toISOString(),
    });
    expect(res.body.needsAttention.tasks[0].dueLabel).toMatch(/^Due:/);
    const undatedInSlice = res.body.needsAttention.tasks.find(
      (row: { id: string }) => row.id === undated.id,
    );
    expect(undatedInSlice).toBeUndefined();
  });
});
