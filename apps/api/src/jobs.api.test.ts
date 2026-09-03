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

  it("GET /api/jobs filters ranked postings by location fit", async () => {
    const company = await seedCompany({ name: "Loc Co" });
    const bay = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-loc-bay",
      companyId: company.id,
      title: "Bay Role",
      url: "https://boards.greenhouse.io/loc/jobs/1",
      rankScore: 90,
      rankLocationFit: "bay",
    });
    await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-loc-nyc",
      companyId: company.id,
      title: "NYC Role",
      url: "https://boards.greenhouse.io/loc/jobs/2",
      rankScore: 85,
      rankLocationFit: "nyc",
    });

    const bayOnly = await apiClient().get("/api/jobs?loc=bay").expect(200);
    expect(bayOnly.body.count).toBe(1);
    expect(bayOnly.body.jobs).toHaveLength(1);
    expect(bayOnly.body.jobs[0].id).toBe(bay.id);
    expect(bayOnly.body.locationCounts).toMatchObject({ bay: 1, nyc: 1 });
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

  it("POST /api/jobs/:id/feedback dismiss on needs-description appears in mismatches", async () => {
    const company = await seedCompany({ name: "No JD Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-no-jd-dismiss",
      companyId: company.id,
      title: "Mystery Intern",
      url: "https://boards.greenhouse.io/nojd/jobs/1",
      descriptionHtml: "",
      rankScore: null,
      rankedAt: null,
      rankEligible: null,
    });

    await apiClient()
      .post(`/api/jobs/${posting.id}/feedback`)
      .send({ kind: "dismiss", note: "Not SWE" })
      .expect(201);

    const mismatches = await apiClient().get("/api/jobs?view=mismatches").expect(200);
    expect(mismatches.body.count).toBe(1);
    expect(mismatches.body.jobs[0].id).toBe(posting.id);
    expect(mismatches.body.counts.mismatches).toBe(1);

    const needsDescription = await apiClient()
      .get("/api/jobs?view=needs-description")
      .expect(200);
    expect(needsDescription.body.count).toBe(0);
  });

  it("POST /api/jobs/:id/feedback dismiss with teach false hides without teaching signal", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-quiet-dismiss",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/quiet-1",
    });

    const res = await apiClient()
      .post(`/api/jobs/${posting.id}/feedback`)
      .send({ kind: "dismiss", note: "should be dropped", teach: false })
      .expect(201);

    expect(res.body).toMatchObject({ kind: "dismiss", note: null, teach: false });
    const feedback = await getFeedbackByPosting(posting.id);
    expect(feedback).toMatchObject({ kind: "dismiss", note: null, teach: false });
    const row = await getPosting(posting.id);
    expect(row?.rank_eligible).toBe(false);

    const mismatches = await apiClient().get("/api/jobs?view=mismatches").expect(200);
    expect(mismatches.body.jobs.some((job: { id: string }) => job.id === posting.id)).toBe(
      true,
    );
  });

  it("POST /api/jobs/:id/feedback dismiss defaults teach true and keeps note", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "job-teach-dismiss",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/teach-1",
    });

    const res = await apiClient()
      .post(`/api/jobs/${posting.id}/feedback`)
      .send({ kind: "dismiss", note: "Wrong stack" })
      .expect(201);

    expect(res.body).toMatchObject({ kind: "dismiss", note: "Wrong stack", teach: true });
  });

  it("GET /api/jobs/:id/board-siblings lists ranked display-employer siblings", async () => {
    const simplify = await seedCompany({ name: "Simplify", source: "simplify" });
    const greenhouse = await seedCompany({ name: "Google", source: "greenhouse" });
    const keep = await seedRankedPosting({
      source: "simplify",
      externalId: "sib-keep",
      companyId: simplify.id,
      department: "Google",
      title: "SWE Intern — Keep",
      url: "https://simplify.jobs/p/keep",
    });
    const hide = await seedRankedPosting({
      source: "greenhouse",
      externalId: "sib-hide",
      companyId: greenhouse.id,
      title: "SWE Intern — Hide",
      url: "https://boards.greenhouse.io/google/jobs/1",
    });
    await seedRankedPosting({
      source: "simplify",
      externalId: "sib-other",
      companyId: simplify.id,
      department: "Meta",
      title: "Other employer",
      url: "https://simplify.jobs/p/meta",
    });

    const res = await apiClient().get(`/api/jobs/${keep.id}/board-siblings`).expect(200);
    expect(res.body.employer).toBe("Google");
    expect(res.body.jobs).toHaveLength(2);
    expect(res.body.jobs.map((job: { id: string }) => job.id).sort()).toEqual(
      [keep.id, hide.id].sort(),
    );
  });

  it("POST /api/jobs/hide-from-board quietly hides selected ranked roles", async () => {
    const company = await seedCompany({ name: "HideCo" });
    const a = await seedRankedPosting({
      source: "greenhouse",
      externalId: "hide-a",
      companyId: company.id,
      title: "Role A",
      url: "https://boards.greenhouse.io/hideco/jobs/1",
    });
    const b = await seedRankedPosting({
      source: "greenhouse",
      externalId: "hide-b",
      companyId: company.id,
      title: "Role B",
      url: "https://boards.greenhouse.io/hideco/jobs/2",
    });
    const keep = await seedRankedPosting({
      source: "greenhouse",
      externalId: "hide-keep",
      companyId: company.id,
      title: "Role Keep",
      url: "https://boards.greenhouse.io/hideco/jobs/3",
    });

    await apiClient()
      .post("/api/jobs/hide-from-board")
      .send({ postingIds: [a.id, b.id] })
      .expect(200);

    expect(await getFeedbackByPosting(a.id)).toMatchObject({
      kind: "dismiss",
      teach: false,
      note: null,
    });
    expect(await getFeedbackByPosting(b.id)).toMatchObject({ kind: "dismiss", teach: false });
    expect(await getFeedbackByPosting(keep.id)).toBeNull();
    expect((await getPosting(a.id))?.rank_eligible).toBe(false);
    expect((await getPosting(keep.id))?.rank_eligible).toBe(true);
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
