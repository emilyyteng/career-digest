import { afterEach, describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { DEMO_FICTIONAL_COMPANY_NAMES } from "./demoSeed.js";
import { apiClient } from "./test/apiClient.js";
import { seedCompany, seedRankedPosting } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("demo mode API", () => {
  const previous = process.env.DEMO_MODE;

  afterEach(() => {
    if (previous === undefined) delete process.env.DEMO_MODE;
    else process.env.DEMO_MODE = previous;
  });

  it("GET /api/ops reports demo.enabled when DEMO_MODE is on", async () => {
    process.env.DEMO_MODE = "true";
    const res = await apiClient().get("/api/ops").expect(200);
    expect(res.body.demo).toMatchObject({
      enabled: true,
    });
    expect(typeof res.body.demo.resetsDailyAt).toBe("string");
  });

  it("GET /api/ops reports demo.enabled false by default", async () => {
    delete process.env.DEMO_MODE;
    const res = await apiClient().get("/api/ops").expect(200);
    expect(res.body.demo).toMatchObject({ enabled: false });
  });

  it("POST /api/board/refresh is rejected in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    const res = await apiClient().post("/api/board/refresh").expect(403);
    expect(res.body.error).toMatch(/demo/i);
  });

  it("POST /api/jobs/:id/rerank is rejected in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    const company = await seedCompany({ name: "Parcel Grove" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "demo-rerank-gate",
      companyId: company.id,
      url: "https://example.com/jobs/demo-rerank",
      rankEligible: false,
    });
    const res = await apiClient()
      .post(`/api/jobs/${posting.id}/rerank`)
      .send({ note: "should not run" })
      .expect(403);
    expect(res.body.error).toMatch(/demo/i);
  });

  it("POST /api/rank/live-backlog is rejected in demo mode", async () => {
    process.env.DEMO_MODE = "true";
    const res = await apiClient().post("/api/rank/live-backlog").expect(403);
    expect(res.body.error).toMatch(/demo/i);
  });

  it("POST /api/demo/reset is 404 when DEMO_MODE is off", async () => {
    delete process.env.DEMO_MODE;
    await apiClient().post("/api/demo/reset").expect(404);
  });

  it("POST /api/demo/reset seeds fictional sandbox data", async () => {
    process.env.DEMO_MODE = "true";
    const res = await apiClient().post("/api/demo/reset").expect(200);
    expect(res.body.ok).toBe(true);
    expect(res.body.summary).toMatchObject({
      companies: DEMO_FICTIONAL_COMPANY_NAMES.length,
      postings: 60,
      ranked: 50,
      mismatches: 10,
    });
    expect(res.body.summary.applications).toBeGreaterThanOrEqual(8);
    expect(res.body.summary.tasks).toBeGreaterThanOrEqual(8);
    expect(res.body.summary.interviewThreads).toBe(3);

    const companies = await pool.query<{ name: string }>(`SELECT name FROM companies ORDER BY name`);
    expect(companies.rows.map((r) => r.name).sort()).toEqual(
      [...DEMO_FICTIONAL_COMPANY_NAMES].sort(),
    );

    const jobs = await apiClient().get("/api/jobs?view=ranked&limit=5").expect(200);
    expect(jobs.body.jobs.length).toBeGreaterThan(0);
    for (const job of jobs.body.jobs as Array<{ company: string }>) {
      expect(DEMO_FICTIONAL_COMPANY_NAMES).toContain(job.company);
    }
  });

  it("POST /api/demo/reset restores counts after mutation", async () => {
    process.env.DEMO_MODE = "true";
    await apiClient().post("/api/demo/reset").expect(200);

    const before = await pool.query<{ n: string }>(
      `SELECT COUNT(*)::text AS n FROM applications`,
    );
    const appCount = Number(before.rows[0]?.n ?? 0);
    expect(appCount).toBeGreaterThan(0);

    await pool.query(`DELETE FROM applications WHERE status = 'todo'`);
    const mid = await pool.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM applications`);
    expect(Number(mid.rows[0]?.n ?? 0)).toBeLessThan(appCount);

    const res = await apiClient().post("/api/demo/reset").expect(200);
    expect(res.body.summary.applications).toBe(appCount);

    const after = await pool.query<{ n: string }>(`SELECT COUNT(*)::text AS n FROM applications`);
    expect(Number(after.rows[0]?.n ?? 0)).toBe(appCount);
  });
});
