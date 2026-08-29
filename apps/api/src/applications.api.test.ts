import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { apiClient } from "./test/apiClient.js";
import {
  seedApplication,
  seedCompany,
  seedManualApplication,
  seedRankedPosting,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("applications API", () => {
  it("GET /api/applications lists applications with counts", async () => {
    await seedManualApplication({ status: "todo", company: "Todo Co", title: "PM Intern" });
    await seedManualApplication({ status: "applied", company: "Applied Co", title: "SWE Intern" });

    const res = await apiClient().get("/api/applications").expect(200);

    expect(res.body.count).toBe(2);
    expect(res.body.counts.todo).toBe(1);
    expect(res.body.counts.applied).toBe(1);
    expect(res.body.applications).toHaveLength(2);
  });

  it("POST /api/applications creates a manual application", async () => {
    const res = await apiClient()
      .post("/api/applications")
      .send({
        status: "applied",
        company: "Stripe",
        title: "Data Intern",
        location: "San Francisco, CA",
        url: "https://stripe.com/jobs/1",
        notes: "Referral",
      })
      .expect(201);

    const detail = await apiClient().get(`/api/applications/${res.body.id}`).expect(200);
    expect(detail.body).toMatchObject({
      id: res.body.id,
      status: "applied",
      company: "Stripe",
      title: "Data Intern",
      location: "San Francisco, CA",
      url: "https://stripe.com/jobs/1",
      notes: "Referral",
    });
  });

  it("POST /api/applications links a posting as todo with due date", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "app-link-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/10",
      title: "Quant Intern",
    });

    const res = await apiClient()
      .post("/api/applications")
      .send({
        postingId: posting.id,
        status: "todo",
        dueAt: "2025-09-15T17:00:00.000Z",
      })
      .expect(201);

    const detail = await apiClient().get(`/api/applications/${res.body.id}`).expect(200);
    expect(detail.body).toMatchObject({
      postingId: posting.id,
      status: "todo",
      title: "Quant Intern",
      dueAt: "2025-09-15T17:00:00.000Z",
    });
    expect(detail.body.appliedAt).toBeNull();
  });

  it("PATCH /api/applications/:id updates status and appliedAt", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "app-patch-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/11",
    });
    const application = await seedApplication({ postingId: posting.id, status: "todo" });

    await apiClient()
      .patch(`/api/applications/${application.id}`)
      .send({ status: "applied", appliedAt: "2025-08-01" })
      .expect(200);

    const detail = await apiClient().get(`/api/applications/${application.id}`).expect(200);
    expect(detail.body.status).toBe("applied");
    expect(detail.body.appliedAt).toMatch(/^2025-08-01/);
    expect(detail.body.dueAt).toBeNull();
  });

  it("DELETE /api/applications/:id only removes todo applications", async () => {
    const todo = await seedManualApplication({ status: "todo" });
    const applied = await seedManualApplication({ status: "applied" });

    await apiClient().delete(`/api/applications/${todo.id}`).expect(200);
    await apiClient().delete(`/api/applications/${applied.id}`).expect(404);

    const remaining = await pool.query(`SELECT id FROM applications WHERE id = ANY($1::uuid[])`, [
      [todo.id, applied.id],
    ]);
    expect(remaining.rows).toHaveLength(1);
    expect(remaining.rows[0].id).toBe(applied.id);
  });
});
