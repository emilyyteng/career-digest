import { describe, expect, it } from "vitest";
import { apiClient } from "./test/apiClient.js";
import {
  getFeedbackByPosting,
  getPosting,
  seedCompany,
  seedRankedPosting,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("jobs API", () => {
  it("GET /api/jobs returns ranked postings", async () => {
    const company = await seedCompany({ name: "Acme Corp" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-ranked-1",
      companyId: company.id,
      title: "Backend Intern",
      url: "https://boards.greenhouse.io/acme/jobs/1",
      rankScore: 88,
    });

    const res = await apiClient().get("/api/jobs").expect(200);

    expect(res.body.count).toBe(1);
    expect(res.body.jobs).toHaveLength(1);
    expect(res.body.jobs[0]).toMatchObject({
      id: posting.id,
      title: "Backend Intern",
      company: "Acme Corp",
      rankScore: 88,
    });
  });

  it("GET /api/jobs/:id returns posting detail", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-detail-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/2",
      location: "Remote",
    });

    const res = await apiClient().get(`/api/jobs/${posting.id}`).expect(200);

    expect(res.body).toMatchObject({
      id: posting.id,
      location: "Remote",
      descriptionHtml: "<p>Job description</p>",
    });
  });

  it("GET /api/jobs/:id returns 404 for unknown id", async () => {
    const res = await apiClient()
      .get("/api/jobs/00000000-0000-4000-8000-000000000001")
      .expect(404);
    expect(res.body.error).toBe("Job not found");
  });

  it("PATCH /api/jobs/:id updates apply URL", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-patch-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/3",
    });

    const res = await apiClient()
      .patch(`/api/jobs/${posting.id}`)
      .send({ url: "https://example.com/apply/3" })
      .expect(200);

    expect(res.body).toEqual({
      id: posting.id,
      url: "https://example.com/apply/3",
    });
  });

  it("PATCH /api/jobs/:id rejects invalid URLs", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-patch-bad",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/4",
    });

    const res = await apiClient()
      .patch(`/api/jobs/${posting.id}`)
      .send({ url: "not-a-url" })
      .expect(400);

    expect(res.body.error).toMatch(/Invalid URL/);
  });

  it("POST /api/jobs/:id/feedback upserts like feedback", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-feedback-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/5",
    });

    const res = await apiClient()
      .post(`/api/jobs/${posting.id}/feedback`)
      .send({ kind: "like", note: "Looks great" })
      .expect(201);

    expect(res.body).toMatchObject({ kind: "like", note: "Looks great" });
    const feedback = await getFeedbackByPosting(posting.id);
    expect(feedback?.kind).toBe("like");
  });

  it("POST /api/jobs/:id/feedback dismiss marks posting ineligible", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-dismiss-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/6",
    });

    await apiClient()
      .post(`/api/jobs/${posting.id}/feedback`)
      .send({ kind: "dismiss", note: "Not interested" })
      .expect(201);

    const row = await getPosting(posting.id);
    expect(row?.rank_eligible).toBe(false);
  });

  it("DELETE /api/jobs/:id/feedback removes feedback", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-feedback-del",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/7",
    });

    await apiClient()
      .post(`/api/jobs/${posting.id}/feedback`)
      .send({ kind: "like" })
      .expect(201);

    await apiClient().delete(`/api/jobs/${posting.id}/feedback`).expect(200);
    expect(await getFeedbackByPosting(posting.id)).toBeNull();
  });
});
