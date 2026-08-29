import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { apiClient } from "./test/apiClient.js";
import {
  seedApplication,
  seedCompany,
  seedManualApplication,
  seedRankedPosting,
  seedTask,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("tasks API", () => {
  it("GET /api/tasks?view=open lists open school and personal tasks with counts", async () => {
    await seedTask({ category: "school", title: "Homework", organization: "CS 229" });
    await seedTask({ category: "personal", title: "Schedule interview" });
    await seedTask({
      category: "school",
      status: "completed",
      title: "Old reading",
      completedAt: new Date("2025-07-01T12:00:00Z"),
    });

    const res = await apiClient().get("/api/tasks?view=open").expect(200);

    expect(res.body.counts).toMatchObject({ open: 2, completed: 1 });
    expect(res.body.tasks).toHaveLength(2);
    expect(res.body.tasks.map((task: { title: string }) => task.title)).toEqual(
      expect.arrayContaining(["Homework", "Schedule interview"]),
    );
  });

  it("GET /api/tasks?view=completed lists only school and personal completed tasks", async () => {
    await seedTask({
      category: "school",
      status: "completed",
      title: "Finished essay",
      completedAt: new Date("2025-08-01T12:00:00Z"),
    });
    await seedTask({
      category: "application",
      status: "completed",
      title: "Applied role",
      completedAt: new Date("2025-08-02T12:00:00Z"),
    });
    await seedTask({ category: "personal", title: "Still open" });

    const res = await apiClient().get("/api/tasks?view=completed").expect(200);

    expect(res.body.counts.completed).toBe(1);
    expect(res.body.tasks).toHaveLength(1);
    expect(res.body.tasks[0].title).toBe("Finished essay");
  });

  it("GET /api/tasks open sort uses due_at ASC NULLS LAST then created_at DESC for undated", async () => {
    await seedTask({
      category: "school",
      title: "Undated older",
      createdAt: new Date("2025-06-01T12:00:00Z"),
    });
    await seedTask({
      category: "school",
      title: "Undated newer",
      createdAt: new Date("2025-06-02T12:00:00Z"),
    });
    await seedTask({
      category: "school",
      title: "Due soon",
      dueAt: new Date("2025-09-01T17:00:00Z"),
    });
    await seedTask({
      category: "school",
      title: "Due later",
      dueAt: new Date("2025-09-15T17:00:00Z"),
    });

    const res = await apiClient().get("/api/tasks?view=open").expect(200);
    const titles = res.body.tasks.map((task: { title: string }) => task.title);

    expect(titles).toEqual(["Due soon", "Due later", "Undated newer", "Undated older"]);
  });

  it("POST /api/tasks creates school and personal tasks", async () => {
    const school = await apiClient()
      .post("/api/tasks")
      .send({
        category: "school",
        title: "Problem set 4",
        organization: "Stanford",
        url: "https://canvas.stanford.edu/assignments/1",
        notes: "Due before section",
        dueAt: "2025-10-01T17:00:00.000Z",
      })
      .expect(201);

    expect(school.body).toMatchObject({
      category: "school",
      status: "open",
      title: "Problem set 4",
      organization: "Stanford",
      url: "https://canvas.stanford.edu/assignments/1",
      notes: "Due before section",
      dueAt: "2025-10-01T17:00:00.000Z",
    });

    const personal = await apiClient()
      .post("/api/tasks")
      .send({ category: "personal", title: "Book flight" })
      .expect(201);

    expect(personal.body.category).toBe("personal");
    expect(personal.body.title).toBe("Book flight");
  });

  it("POST /api/tasks creates manual application tasks", async () => {
    const res = await apiClient()
      .post("/api/tasks")
      .send({
        category: "application",
        organization: "Stripe",
        title: "Backend Intern",
        url: "https://stripe.com/jobs/1",
        notes: "Warm intro",
        dueAt: "2025-10-15T17:00:00.000Z",
      })
      .expect(201);

    expect(res.body).toMatchObject({
      category: "application",
      status: "open",
      organization: "Stripe",
      title: "Backend Intern",
      url: "https://stripe.com/jobs/1",
      notes: "Warm intro",
      applicationId: expect.any(String),
    });

    const app = await pool.query(`SELECT status, due_at FROM applications WHERE id = $1`, [
      res.body.applicationId,
    ]);
    expect(app.rows[0].status).toBe("todo");
  });

  it("POST /api/tasks/from-posting creates linked application task without due date", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "task-posting-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/20",
      title: "ML Intern",
      location: "Remote",
    });

    const res = await apiClient()
      .post("/api/tasks/from-posting")
      .send({ postingId: posting.id })
      .expect(201);

    expect(res.body).toMatchObject({
      category: "application",
      status: "open",
      postingId: posting.id,
      title: "ML Intern",
      location: "Remote",
      dueAt: null,
    });

    const jobs = await apiClient().get("/api/jobs").expect(200);
    const job = jobs.body.jobs.find((row: { id: string }) => row.id === posting.id);
    expect(job?.onTasks).toBe(true);
    expect(job?.applicationStatus).toBe("todo");
  });

  it("DELETE /api/tasks/from-posting/:postingId removes task and todo application", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "task-posting-2",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/21",
    });
    await apiClient().post("/api/tasks/from-posting").send({ postingId: posting.id }).expect(201);

    await apiClient().delete(`/api/tasks/from-posting/${posting.id}`).expect(200);

    const apps = await pool.query(`SELECT id FROM applications WHERE posting_id = $1`, [posting.id]);
    expect(apps.rows).toHaveLength(0);
    const tasks = await pool.query(`SELECT id FROM tasks WHERE posting_id = $1`, [posting.id]);
    expect(tasks.rows).toHaveLength(0);
  });

  it("POST /api/tasks/:id/complete on application task marks application applied", async () => {
    const manual = await seedManualApplication({ status: "todo", company: "Figma", title: "PM Intern" });
    const task = await seedTask({
      category: "application",
      title: "PM Intern",
      organization: "Figma",
      applicationId: manual.id,
    });

    await apiClient().post(`/api/tasks/${task.id}/complete`).expect(200);

    const open = await apiClient().get("/api/tasks?view=open").expect(200);
    expect(open.body.tasks.some((row: { id: string }) => row.id === task.id)).toBe(false);

    const completed = await apiClient().get("/api/tasks?view=completed").expect(200);
    expect(completed.body.tasks.some((row: { id: string }) => row.id === task.id)).toBe(false);

    const app = await pool.query(`SELECT status, applied_at FROM applications WHERE id = $1`, [manual.id]);
    expect(app.rows[0].status).toBe("applied");
    expect(app.rows[0].applied_at).toBeTruthy();
  });

  it("PATCH /api/tasks/:id updates editable fields but not category", async () => {
    const created = await seedTask({
      category: "school",
      title: "Reading",
      organization: "History",
    });

    await apiClient()
      .patch(`/api/tasks/${created.id}`)
      .send({
        category: "personal",
        title: "Updated reading",
        organization: "Humanities",
        url: "https://example.com/reading",
        notes: "Chapter 2",
        dueAt: "2025-11-01T12:00:00.000Z",
      })
      .expect(200);

    const row = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [created.id]);
    expect(row.rows[0].category).toBe("school");
    expect(row.rows[0].title).toBe("Updated reading");
    expect(row.rows[0].organization).toBe("Humanities");
    expect(row.rows[0].url).toBe("https://example.com/reading");
    expect(row.rows[0].notes).toBe("Chapter 2");
    expect(new Date(row.rows[0].due_at as Date).toISOString()).toBe("2025-11-01T12:00:00.000Z");
  });

  it("POST /api/tasks/:id/complete marks school/personal tasks completed", async () => {
    const task = await seedTask({ category: "personal", title: "Call dentist" });

    await apiClient().post(`/api/tasks/${task.id}/complete`).expect(200);

    const open = await apiClient().get("/api/tasks?view=open").expect(200);
    expect(open.body.tasks).toHaveLength(0);

    const completed = await apiClient().get("/api/tasks?view=completed").expect(200);
    expect(completed.body.tasks).toHaveLength(1);
    expect(completed.body.tasks[0]).toMatchObject({
      id: task.id,
      status: "completed",
      title: "Call dentist",
    });
    expect(completed.body.tasks[0].completedAt).toBeTruthy();
  });

  it("POST /api/tasks/:id/reopen moves school/personal tasks back to open", async () => {
    const task = await seedTask({ category: "school", title: "Reopen me" });

    await apiClient().post(`/api/tasks/${task.id}/complete`).expect(200);

    const reopened = await apiClient().post(`/api/tasks/${task.id}/reopen`).expect(200);
    expect(reopened.body).toMatchObject({
      id: task.id,
      status: "open",
      title: "Reopen me",
      completedAt: null,
    });

    const open = await apiClient().get("/api/tasks?view=open").expect(200);
    expect(open.body.tasks).toHaveLength(1);
    expect(open.body.tasks[0].id).toBe(task.id);

    const completed = await apiClient().get("/api/tasks?view=completed").expect(200);
    expect(completed.body.tasks).toHaveLength(0);
  });

  it("DELETE /api/tasks/:id removes the task", async () => {
    const task = await seedTask({ category: "school", title: "Discard me" });

    await apiClient().delete(`/api/tasks/${task.id}`).expect(200);

    const remaining = await pool.query(`SELECT id FROM tasks WHERE id = $1`, [task.id]);
    expect(remaining.rows).toHaveLength(0);
  });
});
