import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./test/apiClient.js";
import {
  seedApplication,
  seedCompany,
  seedInterviewThread,
  seedLeetcodeDaily,
  seedManualApplication,
  seedRankedPosting,
  seedReflectionLog,
  seedTask,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";
import { pool } from "./db.js";

const TZ = "America/Los_Angeles";
const FIXED_NOW = new Date("2025-08-10T20:00:00.000Z");

describe.skipIf(!integrationReady)("progress API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it("GET /api/progress/today uses tz for local calendar day", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "prog-app-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1",
    });
    await seedApplication({
      postingId: posting.id,
      appliedAt: new Date("2025-08-10T20:00:00.000Z"),
    });
    await seedLeetcodeDaily("2025-08-10", 2);
    await seedReflectionLog({
      lane: "technical",
      body: "Worked through DP",
      createdAt: new Date("2025-08-10T21:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/today")
      .query({ tz: TZ })
      .expect(200);

    expect(res.body.localDate).toBe("2025-08-10");
    expect(res.body.applications).toMatchObject({ raw: 1, earned: 1, cap: 3 });
    expect(res.body.leetcode).toMatchObject({ raw: 2, earned: 2, cap: 3 });
    expect(res.body.effortApplication).toBe(false);
    expect(res.body.effortTechnical).toBe(true);
    expect(res.body.effortOther).toBe(false);
    expect(res.body).not.toHaveProperty("deepWork");
  });

  it("GET /api/progress/today lane effort counts any reflection, including legacy deep-work-off rows", async () => {
    await seedReflectionLog({
      lane: "other",
      body: "Journaled after networking coffee",
      createdAt: new Date("2025-08-10T21:00:00.000Z"),
    });
    await seedReflectionLog({
      lane: "application",
      body: "Quick note saved with deep work off",
      deepWork: false,
      createdAt: new Date("2025-08-10T21:30:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/today")
      .query({ tz: TZ })
      .expect(200);

    expect(res.body.effortOther).toBe(true);
    expect(res.body.effortApplication).toBe(true);
    expect(res.body.effortTechnical).toBe(false);
  });

  it("GET /api/progress/heatmap returns earned credit capped at 5", async () => {
    const company = await seedCompany();
    for (let i = 0; i < 7; i += 1) {
      const posting = await seedRankedPosting({
        source: "greenhouse",
        externalId: `prog-heat-${i}`,
        companyId: company.id,
        url: `https://boards.greenhouse.io/acme/jobs/${i + 10}`,
      });
      await seedApplication({
        postingId: posting.id,
        appliedAt: new Date(`2025-08-10T${10 + i}:00:00.000Z`),
      });
    }

    const res = await apiClient()
      .get("/api/progress/heatmap")
      .query({ tz: TZ, lane: "application", days: 30 })
      .expect(200);

    const day = res.body.days.find((row: { date: string }) => row.date === "2025-08-10");
    expect(day).toMatchObject({ raw: 7, earned: 3, effort: false });
  });

  it("GET /api/progress/heatmap marks a lane day from a reflection saved with deep work off", async () => {
    await seedReflectionLog({
      lane: "technical",
      body: "Legacy quick note",
      deepWork: false,
      createdAt: new Date("2025-08-10T21:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/heatmap")
      .query({ tz: TZ, lane: "technical", days: 30 })
      .expect(200);

    const day = res.body.days.find((row: { date: string }) => row.date === "2025-08-10");
    expect(day).toMatchObject({ effort: true });
  });

  it("POST /api/progress/reflections creates effort entry", async () => {
    const res = await apiClient()
      .post("/api/progress/reflections")
      .send({ lane: "application", body: "Drafted project story" })
      .expect(201);

    expect(res.body).toMatchObject({
      lane: "application",
      body: "Drafted project story",
      taskId: null,
      applicationId: null,
    });
    expect(res.body).not.toHaveProperty("deepWork");
  });

  it("POST /api/progress/reflections accepts other lane and task link", async () => {
    const task = await seedTask({
      category: "misc",
      title: "Networking coffee",
    });

    const res = await apiClient()
      .post("/api/progress/reflections")
      .send({
        lane: "other",
        body: "Followed up after chat",
        taskId: task.id,
        localDate: "2025-08-10",
        tz: TZ,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      lane: "other",
      body: "Followed up after chat",
      taskId: task.id,
      taskTitle: "Networking coffee",
      applicationId: null,
    });

    const today = await apiClient()
      .get("/api/progress/today")
      .query({ tz: TZ })
      .expect(200);
    expect(today.body.effortOther).toBe(true);

    const linked = await apiClient().get(`/api/tasks/${task.id}/reflections`).expect(200);
    expect(linked.body.reflections).toHaveLength(1);
    expect(linked.body.reflections[0].id).toBe(res.body.id);
  });

  it("POST /api/progress/reflections rejects linking task and application together", async () => {
    const task = await seedTask({ title: "Xor task" });
    const app = await seedManualApplication({
      status: "applied",
      company: "Xor Co",
      title: "Intern",
    });

    await apiClient()
      .post("/api/progress/reflections")
      .send({
        lane: "application",
        body: "Both links",
        taskId: task.id,
        applicationId: app.id,
      })
      .expect(400);
  });

  it("GET /api/progress/outcome aggregates week totals", async () => {
    await seedLeetcodeDaily("2025-08-10", 1);
    await seedLeetcodeDaily("2025-08-11", 2);
    await seedReflectionLog({
      lane: "application",
      body: "Research",
      createdAt: new Date("2025-08-10T18:00:00.000Z"),
    });
    await seedReflectionLog({
      lane: "technical",
      body: "Trees review",
      createdAt: new Date("2025-08-11T18:00:00.000Z"),
    });
    await seedReflectionLog({
      lane: "other",
      body: "Legacy note saved with deep work off",
      deepWork: false,
      createdAt: new Date("2025-08-12T18:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/outcome")
      .query({ tz: TZ, period: "week", date: "2025-08-10" })
      .expect(200);

    expect(res.body).toMatchObject({
      period: "week",
      leetcodeSolves: 3,
      reflectionsWritten: 3,
    });
    expect(res.body).not.toHaveProperty("deepWorkUnits");
    expect(res.body.startDate).toBe("2025-08-10");
    expect(res.body.endDate).toBe("2025-08-16");
  });

  it("GET /api/progress/day returns 400 for impossible calendar dates", async () => {
    await apiClient()
      .get("/api/progress/day/2025-02-30")
      .query({ tz: TZ })
      .expect(400);
  });

  it("GET /api/progress/heatmap defaults days when query is non-numeric", async () => {
    const res = await apiClient()
      .get("/api/progress/heatmap")
      .query({ tz: TZ, lane: "technical", days: "abc" })
      .expect(200);

    expect(res.body.days.length).toBeGreaterThan(0);
  });

  it("GET /api/progress/day returns drill-down for a date", async () => {
    const company = await seedCompany({ name: "Prog Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "prog-day-1",
      companyId: company.id,
      title: "Intern",
      url: "https://boards.greenhouse.io/acme/jobs/99",
    });
    const app = await seedApplication({
      postingId: posting.id,
      appliedAt: new Date("2025-08-12T18:00:00.000Z"),
    });
    await seedLeetcodeDaily("2025-08-12", 4);
    await seedReflectionLog({
      lane: "application",
      body: "Tailored cover letter",
      applicationId: app.id,
      createdAt: new Date("2025-08-12T19:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/day/2025-08-12")
      .query({ tz: TZ })
      .expect(200);

    expect(res.body.applications).toMatchObject({ raw: 1, earned: 1 });
    expect(res.body.leetcode).toMatchObject({ raw: 4, earned: 3 });
    expect(res.body).not.toHaveProperty("deepWork");
    expect(res.body.effortApplication).toBe(true);
    expect(res.body.applicationRows).toHaveLength(1);
    expect(res.body.applicationRows[0]).toMatchObject({
      company: "Prog Co",
      title: "Intern",
    });
    expect(res.body.interviewRows).toEqual([]);
    expect(res.body.reflections).toHaveLength(1);
  });

  it("GET /api/progress/day uses Simplify posting department as company name", async () => {
    const company = await seedCompany({ name: "Simplify", source: "simplify" });
    const posting = await seedRankedPosting({
      source: "simplify",
      externalId: "prog-simplify-google",
      companyId: company.id,
      department: "Google",
      title: "Software Engineer Intern",
      url: "https://simplify.jobs/p/google-intern",
    });
    await seedApplication({
      postingId: posting.id,
      appliedAt: new Date("2025-08-12T18:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/day/2025-08-12")
      .query({ tz: TZ })
      .expect(200);

    expect(res.body.applicationRows).toHaveLength(1);
    expect(res.body.applicationRows[0]).toMatchObject({
      company: "Google",
      title: "Software Engineer Intern",
    });
  });

  it("POST /api/progress/reflections accepts localDate for History backfill", async () => {
    const res = await apiClient()
      .post("/api/progress/reflections")
      .send({
        lane: "technical",
        body: "Backfilled graphs note",
        localDate: "2025-08-05",
        tz: TZ,
      })
      .expect(201);

    expect(res.body).toMatchObject({
      lane: "technical",
      body: "Backfilled graphs note",
    });

    const day = await apiClient()
      .get("/api/progress/day/2025-08-05")
      .query({ tz: TZ })
      .expect(200);
    expect(day.body.reflections).toHaveLength(1);
    expect(day.body.effortTechnical).toBe(true);
  });

  it("PATCH /api/progress/reflections/:id updates note body", async () => {
    const created = await apiClient()
      .post("/api/progress/reflections")
      .send({ lane: "application", body: "Draft note" })
      .expect(201);

    const updated = await apiClient()
      .patch(`/api/progress/reflections/${created.body.id}`)
      .send({ body: "Edited note with more detail" })
      .expect(200);

    expect(updated.body.body).toBe("Edited note with more detail");
  });

  it("PATCH /api/progress/reflections/:id changes lane and links to application", async () => {
    const app = await seedManualApplication({
      status: "applied",
      company: "Link Co",
      title: "SWE Intern",
    });
    const created = await apiClient()
      .post("/api/progress/reflections")
      .send({ lane: "application", body: "Story draft" })
      .expect(201);

    const updated = await apiClient()
      .patch(`/api/progress/reflections/${created.body.id}`)
      .send({ applicationId: app.id, lane: "other" })
      .expect(200);

    expect(updated.body).toMatchObject({
      lane: "other",
      applicationId: app.id,
      applicationTitle: "SWE Intern",
      applicationCompany: "Link Co",
      taskId: null,
    });

    const unlinked = await apiClient()
      .get("/api/progress/reflections/unlinked")
      .expect(200);
    expect(
      unlinked.body.reflections.some((row: { id: string }) => row.id === created.body.id),
    ).toBe(false);

    const appRefl = await apiClient()
      .get(`/api/applications/${app.id}/reflections`)
      .expect(200);
    expect(appRefl.body.reflections).toHaveLength(1);
  });

  it("GET /api/progress/reflections/unlinked lists only unassociated rows", async () => {
    const task = await seedTask({ title: "Linked task" });
    const linked = await seedReflectionLog({
      lane: "technical",
      body: "Linked to task",
      taskId: task.id,
    });
    const free = await seedReflectionLog({
      lane: "other",
      body: "Floating note",
    });

    const res = await apiClient()
      .get("/api/progress/reflections/unlinked")
      .query({ limit: 50 })
      .expect(200);

    const ids = res.body.reflections.map((row: { id: string }) => row.id);
    expect(ids).toContain(free.id);
    expect(ids).not.toContain(linked.id);
  });

  it("application-linked reflection can optionally attach an interview step", async () => {
    const app = await seedManualApplication({
      status: "interviewing",
      company: "Stripe",
      title: "SWE Intern",
    });
    const { threadId, stepId } = await seedInterviewThread({
      primaryApplicationId: app.id,
      stepTitle: "Phone screen",
    });
    await pool.query(
      `UPDATE interview_threads SET status = 'resolved', resolution = 'accepted', resolved_at = now()
       WHERE id = $1`,
      [threadId],
    );

    const steps = await apiClient()
      .get(`/api/applications/${app.id}/interview-steps`)
      .expect(200);
    expect(steps.body.steps).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: stepId,
          title: "Phone screen",
          threadStatus: "resolved",
        }),
      ]),
    );

    const created = await apiClient()
      .post("/api/progress/reflections")
      .send({
        lane: "application",
        body: "Debriefed phone screen",
        applicationId: app.id,
        interviewStepId: stepId,
      })
      .expect(201);

    expect(created.body).toMatchObject({
      applicationId: app.id,
      interviewStepId: stepId,
      interviewStepTitle: "Phone screen",
    });

    await apiClient()
      .post("/api/progress/reflections")
      .send({
        lane: "application",
        body: "Step without application",
        interviewStepId: stepId,
      })
      .expect(400);
  });
});
