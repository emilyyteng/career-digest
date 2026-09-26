import { describe, expect, it } from "vitest";
import { apiClient } from "./test/apiClient.js";
import { seedManualApplication } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("interviews API", () => {
  it("creates and fetches an interview thread", async () => {
    const application = await seedManualApplication({
      status: "applied",
      company: "Interview Co",
      title: "Analyst Intern",
    });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [application.id],
        label: "Fall loop",
        step: {
          title: "Phone screen",
          kind: "phone",
          dueAt: "2025-09-01T15:00:00.000Z",
        },
      })
      .expect(201);

    const threadId = createRes.body.id as string;

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body).toMatchObject({
      id: threadId,
      label: "Fall loop",
      primaryApplicationId: application.id,
      company: "Interview Co",
      primaryTitle: "Analyst Intern",
    });
    expect(detail.body.steps).toHaveLength(1);
    expect(detail.body.steps[0]).toMatchObject({
      title: "Phone screen",
      kind: "phone",
      status: "pending",
    });

    const list = await apiClient().get("/api/interviews").expect(200);
    expect(list.body.actionRequired.length + list.body.awaiting.length).toBeGreaterThan(0);
  });

  it("PATCH /api/interviews/:threadId/steps/:stepId can set a scheduled time on a phone step", async () => {
    const application = await seedManualApplication({ status: "interviewing" });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [application.id],
        step: { title: "Phone screen", kind: "phone" },
      })
      .expect(201);

    const threadId = createRes.body.id as string;
    const detailBefore = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    const stepId = detailBefore.body.steps[0].id as string;
    expect(detailBefore.body.steps[0].status).toBe("pending");

    const scheduledAt = "2026-09-10T18:30:00.000Z";
    await apiClient()
      .patch(`/api/interviews/${threadId}/steps/${stepId}`)
      .send({ scheduledAt, title: "Recruiter phone screen" })
      .expect(200);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.steps[0]).toMatchObject({
      id: stepId,
      title: "Recruiter phone screen",
      kind: "phone",
      status: "scheduled",
    });
    expect(new Date(detail.body.steps[0].scheduledAt).toISOString()).toBe(scheduledAt);
  });

  it("POST /api/interviews/:threadId/steps adds another step after closing the current one", async () => {
    const application = await seedManualApplication({ status: "interviewing" });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [application.id],
        step: { title: "Recruiter call" },
      })
      .expect(201);

    const threadId = createRes.body.id as string;
    const detailBefore = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    const firstStepId = detailBefore.body.steps[0].id as string;

    await apiClient()
      .patch(`/api/interviews/${threadId}/steps/${firstStepId}`)
      .send({ status: "completed" })
      .expect(200);

    const stepRes = await apiClient()
      .post(`/api/interviews/${threadId}/steps`)
      .send({ title: "Technical interview", kind: "technical" })
      .expect(201);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.steps).toHaveLength(2);
    expect(detail.body.steps.some((step: { id: string }) => step.id === stepRes.body.id)).toBe(
      true,
    );
  });

  it("PATCH /api/interviews/:threadId resolves thread and completes open steps", async () => {
    const application = await seedManualApplication({ status: "interviewing" });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [application.id],
        step: { title: "Phone screen", kind: "phone" },
      })
      .expect(201);

    const threadId = createRes.body.id as string;
    const detailBefore = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    const stepId = detailBefore.body.steps[0].id as string;

    await apiClient()
      .patch(`/api/interviews/${threadId}`)
      .send({ status: "resolved", resolution: "declined" })
      .expect(200);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.status).toBe("resolved");
    expect(detail.body.resolution).toBe("declined");
    const closedStep = detail.body.steps.find((step: { id: string }) => step.id === stepId);
    expect(closedStep?.status).toBe("completed");
    expect(closedStep?.completedAt).toBeTruthy();
  });

  it("does not resolve a thread when another linked role is still interviewing", async () => {
    const backend = await seedManualApplication({
      status: "interviewing",
      company: "TikTok",
      title: "Backend Intern",
    });
    const fullstack = await seedManualApplication({
      status: "interviewing",
      company: "TikTok",
      title: "Fullstack Intern",
    });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [backend.id, fullstack.id],
        primaryApplicationId: fullstack.id,
        step: { title: "Recruiter screen", kind: "phone" },
      })
      .expect(201);
    const threadId = createRes.body.id as string;

    await apiClient()
      .patch(`/api/applications/${backend.id}`)
      .send({ status: "declined" })
      .expect(200);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.status).toBe("active");
    expect(detail.body.resolution).toBeNull();
    expect(detail.body.primaryApplicationId).toBe(fullstack.id);
  });

  it("moves primary to the remaining in-process role when the primary is declined", async () => {
    const backend = await seedManualApplication({
      status: "interviewing",
      company: "TikTok",
      title: "Backend Intern",
    });
    const fullstack = await seedManualApplication({
      status: "interviewing",
      company: "TikTok",
      title: "Fullstack Intern",
    });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [backend.id, fullstack.id],
        primaryApplicationId: backend.id,
        step: { title: "Recruiter screen", kind: "phone" },
      })
      .expect(201);
    const threadId = createRes.body.id as string;

    await apiClient()
      .patch(`/api/applications/${backend.id}`)
      .send({ status: "declined" })
      .expect(200);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.status).toBe("active");
    expect(detail.body.primaryApplicationId).toBe(fullstack.id);
  });

  it("resolves a thread when the last in-process linked role is declined", async () => {
    const backend = await seedManualApplication({
      status: "interviewing",
      company: "TikTok",
      title: "Backend Intern",
    });
    const fullstack = await seedManualApplication({
      status: "interviewing",
      company: "TikTok",
      title: "Fullstack Intern",
    });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [backend.id, fullstack.id],
        step: { title: "Recruiter screen", kind: "phone" },
      })
      .expect(201);
    const threadId = createRes.body.id as string;

    await apiClient()
      .patch(`/api/applications/${backend.id}`)
      .send({ status: "declined" })
      .expect(200);
    await apiClient()
      .patch(`/api/applications/${fullstack.id}`)
      .send({ status: "declined" })
      .expect(200);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.status).toBe("resolved");
    expect(detail.body.resolution).toBe("declined");
  });

  it("PATCH /api/interviews/:threadId can reopen a resolved thread", async () => {
    const application = await seedManualApplication({ status: "interviewing" });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [application.id],
        step: { title: "Phone screen", kind: "phone" },
      })
      .expect(201);
    const threadId = createRes.body.id as string;

    await apiClient()
      .patch(`/api/interviews/${threadId}`)
      .send({ status: "resolved", resolution: "declined" })
      .expect(200);

    await apiClient()
      .patch(`/api/interviews/${threadId}`)
      .send({ status: "active" })
      .expect(200);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.status).toBe("active");
    expect(detail.body.resolution).toBeNull();
    expect(detail.body.resolvedAt).toBeNull();
  });

  it("lists awaitingStep when the open step is waiting on the employer", async () => {
    const application = await seedManualApplication({ status: "interviewing" });

    const createRes = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [application.id],
        step: { title: "Codesignal", kind: "assessment" },
      })
      .expect(201);

    const threadId = createRes.body.id as string;
    const detailBefore = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    const stepId = detailBefore.body.steps[0].id as string;

    await apiClient()
      .patch(`/api/interviews/${threadId}/steps/${stepId}`)
      .send({ status: "awaiting_employer" })
      .expect(200);

    const detail = await apiClient().get(`/api/interviews/${threadId}`).expect(200);
    expect(detail.body.nextStep).toBeNull();
    expect(detail.body.awaitingStep).toMatchObject({
      id: stepId,
      title: "Codesignal",
      status: "awaiting_employer",
    });

    const list = await apiClient().get("/api/interviews").expect(200);
    const awaitingRow = list.body.awaiting.find((row: { id: string }) => row.id === threadId);
    expect(awaitingRow?.awaitingStep?.id).toBe(stepId);
    expect(list.body.actionRequired.some((row: { id: string }) => row.id === threadId)).toBe(
      false,
    );
  });
});
