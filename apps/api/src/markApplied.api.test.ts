import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { apiClient } from "./test/apiClient.js";
import {
  seedCompany,
  seedManualApplication,
  seedPosting,
  seedReflectionLog,
  seedTask,
  truncateAll,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";
const MODAL_REFLECTION = {
  lane: "application",
  body: "Tailored the resume to the team",
};
const MODAL_MINUTES = 45;

const MODAL_NOTES = "Submitted via the portal";

type Path = "tasks" | "jobs";

/** A posting added to Tasks, tagged for the weekly apps goal, with a reflection on its task. */
async function seedTaggedApplicationTask(): Promise<{ postingId: string; taskId: string }> {
  const company = await seedCompany({ name: "Parity Co" });
  const posting = await seedPosting({
    source: "greenhouse",
    externalId: "parity-1",
    companyId: company.id,
    title: "SWE Intern",
    url: "https://boards.greenhouse.io/parity/jobs/1",
  });
  const task = await apiClient()
    .post("/api/tasks/from-posting")
    .send({ postingId: posting.id })
    .expect(201);
  const taskId = task.body.id as string;
  await apiClient()
    .put(`/api/weekly-goals/apps/members/${taskId}?tz=${TZ}`)
    .send({ member: true })
    .expect(200);
  await seedReflectionLog({ lane: "application", body: "Researched the team", taskId });
  return { postingId: posting.id, taskId };
}

async function markAppliedVia(path: Path, ids: { postingId: string; taskId: string }) {
  if (path === "tasks") {
    return apiClient()
      .post(`/api/tasks/${ids.taskId}/complete?tz=${TZ}`)
      .send({ actualMinutes: MODAL_MINUTES, notes: MODAL_NOTES, reflection: MODAL_REFLECTION });
  }
  return apiClient()
    .post(`/api/applications?tz=${TZ}`)
    .send({
      postingId: ids.postingId,
      status: "applied",
      notes: MODAL_NOTES,
      actualMinutes: MODAL_MINUTES,
      reflection: MODAL_REFLECTION,
    });
}

/** Everything R2.13 says must match, with ids and timestamps reduced to comparable facts. */
async function outcome(ids: { postingId: string; taskId: string }) {
  const app = await pool.query<{
    id: string;
    status: string;
    applied: boolean;
    due_at: Date | null;
    notes: string | null;
    actual_minutes: number | null;
  }>(
    `SELECT id, status, applied_at IS NOT NULL AS applied, due_at, notes, actual_minutes
     FROM applications WHERE posting_id = $1`,
    [ids.postingId],
  );
  const applicationId = app.rows[0]!.id;
  const task = await pool.query<{
    status: string;
    actual_minutes: number | null;
    notes: string | null;
  }>(
    `SELECT status, actual_minutes, notes FROM tasks WHERE id = $1`,
    [ids.taskId],
  );
  const reflections = await pool.query<{
    body: string;
    on_application: boolean;
    on_task: boolean;
    actual_minutes: number | null;
  }>(
    `SELECT body,
            application_id = $1 AS on_application,
            task_id IS NOT NULL AS on_task,
            actual_minutes
     FROM reflection_logs ORDER BY body`,
    [applicationId],
  );
  const events = await pool.query<{
    kind: string;
    category: string;
    amount: number;
    source_type: string;
  }>(
    `SELECT kind, category, amount, source_type FROM points_events ORDER BY source_type`,
  );
  return {
    application: {
      status: app.rows[0]!.status,
      applied: app.rows[0]!.applied,
      dueAt: app.rows[0]!.due_at,
      notes: app.rows[0]!.notes,
      actualMinutes: app.rows[0]!.actual_minutes,
    },
    task: task.rows[0],
    reflections: reflections.rows,
    events: events.rows,
  };
}

describe.skipIf(!integrationReady)("mark applied (M4-01)", () => {
  it("Jobs and Tasks give identical outcomes for a tagged task with a linked reflection", async () => {
    const results: Record<Path, Awaited<ReturnType<typeof outcome>>> = {} as never;
    for (const path of ["tasks", "jobs"] as const) {
      await truncateAll();
      const ids = await seedTaggedApplicationTask();
      const res = await markAppliedVia(path, ids);
      expect(res.status, `${path}: ${JSON.stringify(res.body)}`).toBeLessThan(300);
      expect(res.body.points?.amount).toBe(5 + MODAL_MINUTES + 20);
      results[path] = await outcome(ids);
    }

    expect(results.jobs).toEqual(results.tasks);
    expect(results.tasks).toEqual({
      application: {
        status: "applied",
        applied: true,
        dueAt: null,
        notes: MODAL_NOTES,
        actualMinutes: MODAL_MINUTES,
      },
      task: { status: "completed", actual_minutes: MODAL_MINUTES, notes: null },
      reflections: [
        { body: "Researched the team", on_application: true, on_task: false, actual_minutes: null },
        { body: "Tailored the resume to the team", on_application: true, on_task: false, actual_minutes: null },
      ],
      events: [
        { kind: "earn", category: "application", amount: 70, source_type: "application_applied" },
        { kind: "earn", category: "weekly_goal", amount: expect.any(Number), source_type: "weekly_goal" },
      ],
    });
  });

  it("a second mark applied from the other path is rejected and earns nothing", async () => {
    for (const [first, second] of [
      ["tasks", "jobs"],
      ["jobs", "tasks"],
    ] as const) {
      await truncateAll();
      const ids = await seedTaggedApplicationTask();
      const firstRes = await markAppliedVia(first, ids);
      expect(firstRes.status).toBeLessThan(300);
      const again = await markAppliedVia(second, ids);
      expect(again.status, `${first} then ${second}`).toBeGreaterThanOrEqual(400);

      const earns = await pool.query(
        `SELECT 1 FROM points_events WHERE source_type = 'application_applied'`,
      );
      expect(earns.rows).toHaveLength(1);
      const reflections = await pool.query(`SELECT 1 FROM reflection_logs`);
      expect(reflections.rows).toHaveLength(2);
    }
  });

  it("appends the modal's notes to existing application notes on both paths", async () => {
    for (const path of ["tasks", "jobs"] as const) {
      await truncateAll();
      const ids = await seedTaggedApplicationTask();
      await pool.query(`UPDATE applications SET notes = 'Referral from Sam' WHERE posting_id = $1`, [
        ids.postingId,
      ]);
      const res = await markAppliedVia(path, ids);
      expect(res.status).toBeLessThan(300);
      const after = await outcome(ids);
      expect(after.application.notes, path).toBe(`Referral from Sam\n\n${MODAL_NOTES}`);
      expect(after.task?.notes, path).toBeNull();
    }
  });

  it("a posting with no task, marked applied from Jobs, creates the application and earns +5", async () => {
    const company = await seedCompany();
    const posting = await seedPosting({
      source: "greenhouse",
      externalId: "no-task-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/notask/jobs/1",
    });

    const res = await apiClient()
      .post(`/api/applications?tz=${TZ}`)
      .send({ postingId: posting.id, status: "applied", notes: "Submitted" })
      .expect(201);
    expect(res.body.points.amount).toBe(5);

    const detail = await apiClient().get(`/api/applications/${res.body.id}`).expect(200);
    expect(detail.body).toMatchObject({ status: "applied", notes: "Submitted", openTaskId: null });
    expect(detail.body.appliedAt).toBeTruthy();
  });

  it("rejects a status change on a to-do-backed application and changes nothing", async () => {
    const ids = await seedTaggedApplicationTask();
    const app = await pool.query<{ id: string }>(
      `SELECT id FROM applications WHERE posting_id = $1`,
      [ids.postingId],
    );
    const applicationId = app.rows[0]!.id;

    const res = await apiClient()
      .patch(`/api/applications/${applicationId}`)
      .send({ status: "applied" })
      .expect(409);
    expect(res.body.error).toMatch(/Mark applied/);
    const viaCreate = await apiClient()
      .post("/api/applications")
      .send({ postingId: ids.postingId, status: "interviewing" })
      .expect(409);
    expect(viaCreate.body.error).toMatch(/Mark applied/);

    const after = await outcome(ids);
    expect(after.application.status).toBe("todo");
    expect(after.task?.status).toBe("open");
    expect(after.events).toEqual([]);
    expect(after.reflections.map((r) => r.on_task)).toEqual([true]);
  });

  it("GET /applications/:id names the open task of a to-do row, for the page redirect", async () => {
    const ids = await seedTaggedApplicationTask();
    const app = await pool.query<{ id: string }>(
      `SELECT id FROM applications WHERE posting_id = $1`,
      [ids.postingId],
    );
    const detail = await apiClient().get(`/api/applications/${app.rows[0]!.id}`).expect(200);
    expect(detail.body).toMatchObject({ status: "todo", openTaskId: ids.taskId });
  });

  it("applications at applied or later still change status on their own page, earning nothing again", async () => {
    const ids = await seedTaggedApplicationTask();
    const marked = await markAppliedVia("tasks", ids);
    const applicationId = (
      await pool.query<{ id: string }>(`SELECT id FROM applications WHERE posting_id = $1`, [
        ids.postingId,
      ])
    ).rows[0]!.id;
    expect(marked.status).toBe(200);

    for (const status of ["interviewing", "applied"]) {
      const res = await apiClient()
        .patch(`/api/applications/${applicationId}`)
        .send({ status })
        .expect(200);
      expect(res.body.points).toBeNull();
    }
    const earns = await pool.query(
      `SELECT 1 FROM points_events WHERE source_type = 'application_applied'`,
    );
    expect(earns.rows).toHaveLength(1);
  });

  it("a manual applied application still earns +5 and has no task", async () => {
    const res = await apiClient()
      .post(`/api/applications?tz=${TZ}`)
      .send({ company: "Manual Co", title: "Analyst Intern", appliedAt: "2025-08-01" })
      .expect(201);
    expect(res.body.points.amount).toBe(5);
    const detail = await apiClient().get(`/api/applications/${res.body.id}`).expect(200);
    expect(detail.body.appliedAt).toMatch(/^2025-08-01/);
  });

  it("a blank modal time keeps the application task's existing actual time, which then scores", async () => {
    const app = await seedManualApplication({ status: "todo" });
    const task = await seedTask({ category: "application", applicationId: app.id });
    await pool.query(`UPDATE tasks SET actual_minutes = 20 WHERE id = $1`, [task.id]);

    const res = await apiClient()
      .post(`/api/tasks/${task.id}/complete?tz=${TZ}`)
      .send({ actualMinutes: null })
      .expect(200);
    expect(res.body).toMatchObject({ status: "completed", actualMinutes: 20 });
    expect(res.body.points.amount).toBe(5 + 20);
    const detail = await apiClient().get(`/api/applications/${app.id}`).expect(200);
    expect(detail.body.actualMinutes).toBe(20);
  });
});
