import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { apiClient } from "./test/apiClient.js";
import { seedTask } from "./test/dbHarness.js";
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

  it("POST /api/tasks rejects application category in foundation slice", async () => {
    await apiClient()
      .post("/api/tasks")
      .send({ category: "application", title: "Apply later" })
      .expect(400);
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

  it("DELETE /api/tasks/:id removes the task", async () => {
    const task = await seedTask({ category: "school", title: "Discard me" });

    await apiClient().delete(`/api/tasks/${task.id}`).expect(200);

    const remaining = await pool.query(`SELECT id FROM tasks WHERE id = $1`, [task.id]);
    expect(remaining.rows).toHaveLength(0);
  });
});
