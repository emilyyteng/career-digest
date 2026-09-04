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
  it("POST /api/applications applied for a posting completes its open application task", async () => {
    const company = await seedCompany({ name: "Jobs Applied Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "jobs-applied-task",
      companyId: company.id,
      title: "SWE Intern",
      url: "https://boards.greenhouse.io/jobsapplied/jobs/1",
    });

    const taskRes = await apiClient()
      .post("/api/tasks/from-posting")
      .send({ postingId: posting.id })
      .expect(201);
    const taskId = taskRes.body.id as string;

    const openBefore = await apiClient().get("/api/tasks?view=open").expect(200);
    expect(openBefore.body.tasks.some((row: { id: string }) => row.id === taskId)).toBe(true);

    await apiClient()
      .post("/api/applications")
      .send({ postingId: posting.id, status: "applied", notes: "Submitted" })
      .expect(201);

    const openAfter = await apiClient().get("/api/tasks?view=open").expect(200);
    expect(openAfter.body.tasks.some((row: { id: string }) => row.id === taskId)).toBe(false);

    const taskRow = await pool.query<{ status: string }>(
      `SELECT status FROM tasks WHERE id = $1`,
      [taskId],
    );
    expect(taskRow.rows[0]?.status).toBe("completed");

    const app = await pool.query<{ status: string }>(
      `SELECT status FROM applications WHERE posting_id = $1`,
      [posting.id],
    );
    expect(app.rows[0]?.status).toBe("applied");
  });

  it("GET /api/applications lists tracker applications and excludes todo", async () => {
    await seedManualApplication({ status: "todo", company: "Todo Co", title: "PM Intern" });
    await seedManualApplication({ status: "applied", company: "Applied Co", title: "SWE Intern" });

    const res = await apiClient().get("/api/applications").expect(200);

    expect(res.body.count).toBe(1);
    expect(res.body.counts.applied).toBe(1);
    expect(res.body.counts.todo).toBeUndefined();
    expect(res.body.applications).toHaveLength(1);
    expect(res.body.applications[0].status).toBe("applied");
  });

  it("GET /api/applications?status=todo returns 400", async () => {
    await apiClient().get("/api/applications?status=todo").expect(400);
    await apiClient().get("/api/applications?status=starred").expect(400);
  });

  it("POST /api/applications creates a manual application defaulting to applied", async () => {
    const res = await apiClient()
      .post("/api/applications")
      .send({
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
    expect(detail.body.appliedAt).toBeTruthy();
  });

  it("POST /api/applications rejects todo status", async () => {
    await apiClient()
      .post("/api/applications")
      .send({
        status: "todo",
        company: "Todo Co",
        title: "PM Intern",
      })
      .expect(400);
  });

  it("POST /api/applications links a posting as applied", async () => {
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
        status: "applied",
        appliedAt: "2025-08-01",
      })
      .expect(201);

    const detail = await apiClient().get(`/api/applications/${res.body.id}`).expect(200);
    expect(detail.body).toMatchObject({
      postingId: posting.id,
      status: "applied",
      title: "Quant Intern",
    });
    expect(detail.body.appliedAt).toMatch(/^2025-08-01/);
    expect(detail.body.dueAt).toBeNull();
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

  it("DELETE /api/applications/:id removes todo via linked open task", async () => {
    const todo = await seedManualApplication({ status: "todo" });
    const applied = await seedManualApplication({ status: "applied" });

    await pool.query(
      `INSERT INTO tasks (category, status, title, organization, application_id)
       VALUES ('application', 'open', 'Analyst Intern', 'Manual Co', $1)`,
      [todo.id],
    );

    await apiClient().delete(`/api/applications/${todo.id}`).expect(200);
    await apiClient().delete(`/api/applications/${applied.id}`).expect(404);

    const remaining = await pool.query(`SELECT id FROM applications WHERE id = ANY($1::uuid[])`, [
      [todo.id, applied.id],
    ]);
    expect(remaining.rows).toHaveLength(1);
    expect(remaining.rows[0].id).toBe(applied.id);

    const tasks = await pool.query(`SELECT id FROM tasks WHERE application_id = $1`, [todo.id]);
    expect(tasks.rows).toHaveLength(0);
  });

  it("migration creates open tasks for legacy todo applications", async () => {
    const todo = await seedManualApplication({
      status: "todo",
      company: "Legacy Co",
      title: "Legacy Intern",
      notes: "legacy notes",
    });

    const before = await pool.query(
      `SELECT id FROM tasks WHERE application_id = $1 AND status = 'open'`,
      [todo.id],
    );
    expect(before.rows).toHaveLength(0);

    await pool.query(`
      INSERT INTO tasks (
        category, status, title, organization, url, notes, due_at, posting_id, application_id
      )
      SELECT
        'application', 'open',
        COALESCE(a.title, p.title, 'Untitled'),
        COALESCE(a.company_name, c.name),
        COALESCE(a.url, p.url),
        a.notes,
        a.due_at,
        a.posting_id,
        a.id
      FROM applications a
      LEFT JOIN postings p ON p.id = a.posting_id
      LEFT JOIN companies c ON c.id = p.company_id
      WHERE a.status = 'todo'
        AND a.id = $1
        AND NOT EXISTS (
          SELECT 1 FROM tasks t
          WHERE t.application_id = a.id AND t.status = 'open' AND t.category = 'application'
        )
    `, [todo.id]);

    const task = await pool.query<{
      title: string;
      organization: string | null;
      notes: string | null;
    }>(
      `SELECT title, organization, notes FROM tasks
       WHERE application_id = $1 AND status = 'open' AND category = 'application'`,
      [todo.id],
    );
    expect(task.rows[0]).toMatchObject({
      title: "Legacy Intern",
      organization: "Legacy Co",
      notes: "legacy notes",
    });

    const list = await apiClient().get("/api/applications").expect(200);
    expect(list.body.applications.some((row: { id: string }) => row.id === todo.id)).toBe(false);
  });
});
