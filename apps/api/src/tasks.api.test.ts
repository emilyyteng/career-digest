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

async function categoryIdByName(name: string): Promise<string> {
  const res = await apiClient().get("/api/task-categories").expect(200);
  const match = (res.body.categories as Array<{ id: string; name: string }>).find(
    (c) => c.name === name,
  );
  if (!match) throw new Error(`category ${name} not found`);
  return match.id;
}

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
    expect(res.body.categories.length).toBeGreaterThanOrEqual(5);
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

  it("POST /api/tasks creates misc tasks in named categories", async () => {
    const schoolId = await categoryIdByName("School");
    const adminId = await categoryIdByName("Admin");

    const school = await apiClient()
      .post("/api/tasks")
      .send({
        categoryId: schoolId,
        title: "Problem set 4",
        organization: "Stanford",
        url: "https://canvas.stanford.edu/assignments/1",
        notes: "Due before section",
        dueAt: "2025-10-01T17:00:00.000Z",
      })
      .expect(201);

    expect(school.body).toMatchObject({
      category: "misc",
      categoryId: schoolId,
      categoryName: "School",
      status: "open",
      title: "Problem set 4",
      organization: "Stanford",
      url: "https://canvas.stanford.edu/assignments/1",
      notes: "Due before section",
      dueAt: "2025-10-01T17:00:00.000Z",
    });

    const admin = await apiClient()
      .post("/api/tasks")
      .send({ categoryId: adminId, title: "Book flight" })
      .expect(201);

    expect(admin.body).toMatchObject({
      category: "misc",
      categoryId: adminId,
      categoryName: "Admin",
      title: "Book flight",
    });
  });

  it("POST /api/tasks creates manual application tasks", async () => {
    const appsId = await categoryIdByName("Applications");
    const res = await apiClient()
      .post("/api/tasks")
      .send({
        categoryId: appsId,
        organization: "Stripe",
        title: "Backend Intern",
        url: "https://stripe.com/jobs/1",
        notes: "Warm intro",
        dueAt: "2025-10-15T17:00:00.000Z",
      })
      .expect(201);

    expect(res.body).toMatchObject({
      category: "application",
      categoryName: "Applications",
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

  it("PATCH /api/tasks/:id updates fields and can refile misc categories", async () => {
    const created = await seedTask({
      category: "school",
      title: "Reading",
      organization: "History",
    });
    const adminId = await categoryIdByName("Admin");

    await apiClient()
      .patch(`/api/tasks/${created.id}`)
      .send({
        categoryId: adminId,
        title: "Updated reading",
        organization: "Humanities",
        url: "https://example.com/reading",
        notes: "Chapter 2",
        dueAt: "2025-11-01T12:00:00.000Z",
      })
      .expect(200);

    const row = await pool.query(`SELECT * FROM tasks WHERE id = $1`, [created.id]);
    expect(row.rows[0].category).toBe("misc");
    expect(row.rows[0].category_id).toBe(adminId);
    expect(row.rows[0].title).toBe("Updated reading");
    expect(row.rows[0].organization).toBe("Humanities");
    expect(row.rows[0].url).toBe("https://example.com/reading");
    expect(row.rows[0].notes).toBe("Chapter 2");
    expect(new Date(row.rows[0].due_at as Date).toISOString()).toBe("2025-11-01T12:00:00.000Z");
  });

  it("task categories: create, block delete with open tasks, delete when empty", async () => {
    const created = await apiClient()
      .post("/api/task-categories")
      .send({ name: "Club" })
      .expect(201);
    expect(created.body).toMatchObject({ name: "Club", kind: "misc", system: false });

    const task = await apiClient()
      .post("/api/tasks")
      .send({ categoryId: created.body.id, title: "Meeting notes" })
      .expect(201);

    await apiClient().delete(`/api/task-categories/${created.body.id}`).expect(409);

    await apiClient().delete(`/api/tasks/${task.body.id}`).expect(200);
    await apiClient().delete(`/api/task-categories/${created.body.id}`).expect(200);
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

  it("subtasks support checklist, inherit priority, and cascade on parent complete/delete", async () => {
    const schoolId = await categoryIdByName("School");
    const parent = await apiClient()
      .post("/api/tasks")
      .send({
        categoryId: schoolId,
        title: "Exam prep",
        priority: 1,
        estimateMinutes: 120,
      })
      .expect(201);
    expect(parent.body).toMatchObject({
      priority: 1,
      estimateMinutes: 120,
      subtasks: [],
      subtaskProgress: null,
    });

    const a = await apiClient()
      .post(`/api/tasks/${parent.body.id}/subtasks`)
      .send({ title: "Outline" })
      .expect(201);
    expect(a.body).toMatchObject({
      title: "Outline",
      priorityOverride: null,
      priority: 1,
    });

    const b = await apiClient()
      .post(`/api/tasks/${parent.body.id}/subtasks`)
      .send({ title: "Flashcards", priorityOverride: 0, estimateMinutes: 30 })
      .expect(201);
    expect(b.body).toMatchObject({ priorityOverride: 0, priority: 0, estimateMinutes: 30 });

    await apiClient()
      .post(`/api/tasks/${parent.body.id}/subtasks/${a.body.id}/complete`)
      .expect(200);

    const listed = await apiClient().get("/api/tasks?view=open").expect(200);
    const row = listed.body.tasks.find((t: { id: string }) => t.id === parent.body.id);
    expect(row.subtaskProgress).toEqual({ completed: 1, total: 2 });
    expect(row.subtasks.map((s: { title: string }) => s.title)).toEqual([
      "Flashcards",
      "Outline",
    ]);

    await apiClient().post(`/api/tasks/${parent.body.id}/complete`).expect(200);
    const after = await pool.query<{ status: string }>(
      `SELECT status FROM task_subtasks WHERE task_id = $1`,
      [parent.body.id],
    );
    expect(after.rows.every((r) => r.status === "completed")).toBe(true);

    await apiClient().delete(`/api/tasks/${parent.body.id}`).expect(200);
    const orphans = await pool.query(`SELECT id FROM task_subtasks WHERE task_id = $1`, [
      parent.body.id,
    ]);
    expect(orphans.rows).toHaveLength(0);
  });

  it("POST /api/tasks/:id/duplicate copies misc task fields and subtasks", async () => {
    const schoolId = await categoryIdByName("School");
    const parent = await apiClient()
      .post("/api/tasks")
      .send({
        categoryId: schoolId,
        title: "Exam template",
        notes: "Shared outline",
        priority: 1,
        estimateMinutes: 90,
      })
      .expect(201);

    const outline = await apiClient()
      .post(`/api/tasks/${parent.body.id}/subtasks`)
      .send({ title: "Outline", estimateMinutes: 20 })
      .expect(201);
    await apiClient()
      .post(`/api/tasks/${parent.body.id}/subtasks`)
      .send({ title: "Practice", priorityOverride: 0 })
      .expect(201);
    await apiClient()
      .post(`/api/tasks/${parent.body.id}/subtasks/${outline.body.id}/complete`)
      .expect(200);

    const copied = await apiClient()
      .post(`/api/tasks/${parent.body.id}/duplicate`)
      .expect(201);

    expect(copied.body.id).not.toBe(parent.body.id);
    expect(copied.body).toMatchObject({
      title: "Exam template (copy)",
      notes: "Shared outline",
      priority: 1,
      estimateMinutes: 90,
      categoryId: schoolId,
      status: "open",
      subtaskProgress: { completed: 1, total: 2 },
    });
    expect(copied.body.subtasks).toHaveLength(2);
    expect(copied.body.subtasks.map((s: { title: string; status: string }) => [s.title, s.status])).toEqual(
      [
        ["Practice", "open"],
        ["Outline", "completed"],
      ],
    );
    expect(copied.body.subtasks.every((s: { id: string }) => s.id !== outline.body.id)).toBe(true);
  });
});
