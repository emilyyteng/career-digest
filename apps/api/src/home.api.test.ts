import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { apiClient } from "./test/apiClient.js";
import {
  seedApplication,
  seedCompany,
  seedInterviewThread,
  seedRankedPosting,
  seedTask,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "America/Los_Angeles";

describe.skipIf(!integrationReady)("home API", () => {
  it("GET /api/home returns job picks without todo applications", async () => {
    const company = await seedCompany({ name: "Home Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "home-ranked-1",
      companyId: company.id,
      title: "Strategy Intern",
      url: "https://boards.greenhouse.io/home/jobs/1",
    });
    await seedApplication({ postingId: posting.id, status: "todo" });

    const res = await apiClient().get(`/api/home?tz=${encodeURIComponent(TZ)}`).expect(200);

    expect(res.body.todo).toBeUndefined();
    expect(res.body.todoTotal).toBeUndefined();
    expect(res.body.needsAttention).toBeUndefined();
    expect(
      res.body.newAndTopPicks.topRanked.some((job: { id: string }) => job.id === posting.id),
    ).toBe(true);
    expect(res.body.newAndTopPicks.topRanked[0]).toMatchObject({
      id: posting.id,
      title: "Strategy Intern",
      company: "Home Co",
    });
  });

  it("GET /api/home upcomingThisWeek merges dated tasks and interview steps by day", async () => {
    const now = Date.now();
    const overdueAt = new Date(now - 2 * 24 * 60 * 60 * 1000);
    const inTwoDays = new Date(now + 2 * 24 * 60 * 60 * 1000);
    const inThreeDays = new Date(now + 3 * 24 * 60 * 60 * 1000);
    const farAway = new Date(now + 20 * 24 * 60 * 60 * 1000);

    const undated = await seedTask({
      category: "personal",
      title: "No due date",
      organization: null,
    });
    const overdueTask = await seedTask({
      category: "school",
      title: "Late homework",
      organization: "CS 229",
      dueAt: overdueAt,
    });
    const soonTask = await seedTask({
      category: "school",
      title: "Reading",
      dueAt: inThreeDays,
    });
    await seedTask({
      category: "school",
      title: "Far away",
      dueAt: farAway,
    });

    const company = await seedCompany({ name: "Interview Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "home-interview-1",
      companyId: company.id,
      title: "SWE Intern",
      url: "https://boards.greenhouse.io/home/jobs/interview-1",
    });
    const app = await seedApplication({
      postingId: posting.id,
      status: "interviewing",
    });
    const { threadId, stepId } = await seedInterviewThread({
      primaryApplicationId: app.id,
      stepTitle: "Phone screen",
    });
    await pool.query(
      `UPDATE application_steps
       SET due_at = $2, status = 'pending'
       WHERE id = $1`,
      [stepId, inTwoDays],
    );

    const secondStep = await pool.query<{ id: string }>(
      `INSERT INTO application_steps (thread_id, title, sort_order, status, scheduled_at)
       VALUES ($1, 'Onsite', 1, 'scheduled', $2)
       RETURNING id`,
      [threadId, inThreeDays],
    );

    const awaitingStep = await pool.query<{ id: string }>(
      `INSERT INTO application_steps (thread_id, title, sort_order, status, due_at)
       VALUES ($1, 'Waiting on them', 2, 'awaiting_employer', $2)
       RETURNING id`,
      [threadId, overdueAt],
    );

    const res = await apiClient().get(`/api/home?tz=${encodeURIComponent(TZ)}`).expect(200);
    const groups = res.body.upcomingThisWeek.groups as Array<{
      key: string;
      label: string;
      items: Array<{
        kind: string;
        id?: string;
        stepId?: string;
        title?: string;
        stepTitle?: string;
        categoryName?: string;
      }>;
    }>;

    expect(groups[0]?.key).toBe("overdue");
    expect(groups[0]?.label).toBe("Overdue");
    expect(groups[0]?.items.some((i) => i.id === overdueTask.id)).toBe(true);

    const flat = groups.flatMap((g) => g.items);
    expect(flat.some((i) => i.id === undated.id)).toBe(false);
    expect(flat.some((i) => i.title === "Far away")).toBe(false);
    expect(flat.some((i) => i.stepId === stepId && i.kind === "interview")).toBe(true);
    expect(flat.some((i) => i.stepId === secondStep.rows[0]!.id)).toBe(true);
    expect(flat.some((i) => i.stepId === awaitingStep.rows[0]!.id)).toBe(false);
    expect(flat.some((i) => i.id === soonTask.id && i.categoryName)).toBe(true);

    for (const group of groups) {
      if (group.key === "overdue") continue;
      expect(group.key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
