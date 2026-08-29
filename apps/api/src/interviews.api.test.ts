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
});
