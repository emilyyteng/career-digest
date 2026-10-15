import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { recordEarn } from "./pointsLedger.js";
import { apiClient } from "./test/apiClient.js";
import {
  seedInterviewThread,
  seedManualApplication,
  seedReflectionLog,
  seedTask,
  truncateAll,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "UTC";
const REFLECTION = { lane: "application", body: "Tailored the resume" };

async function balance(): Promise<number> {
  const res = await apiClient().get("/api/points").expect(200);
  return res.body.balance as number;
}

async function earn(sourceType: string, sourceId: string) {
  const { rows } = await pool.query<{ amount: number; meta: Record<string, unknown> }>(
    `SELECT amount, meta FROM points_events
     WHERE kind = 'earn' AND source_type = $1 AND source_id = $2`,
    [sourceType, sourceId],
  );
  return rows[0] ?? null;
}

async function adjusts(sourceType: string, sourceId: string): Promise<number[]> {
  const { rows } = await pool.query<{ amount: number }>(
    `SELECT amount FROM points_events
     WHERE kind = 'adjust' AND source_type = $1 AND source_id = $2
     ORDER BY created_at`,
    [sourceType, sourceId],
  );
  return rows.map((r) => r.amount);
}

async function manualApplied(body: Record<string, unknown>) {
  return apiClient()
    .post(`/api/applications?tz=${TZ}`)
    .send({
      company: "Time Co",
      title: "SWE Intern",
      // Past date so M5-10 apps streak points don't land in these work-time totals.
      appliedAt: "2025-01-15",
      ...body,
    })
    .expect(201);
}

async function technicalStep() {
  const app = await seedManualApplication({ status: "interviewing", company: "Loop Co" });
  const { threadId, stepId } = await seedInterviewThread({
    primaryApplicationId: app.id,
    stepTitle: "Technical",
  });
  await pool.query(`UPDATE application_steps SET kind = 'technical' WHERE id = $1`, [stepId]);
  const patch = (body: Record<string, unknown>) =>
    apiClient().patch(`/api/interviews/${threadId}/steps/${stepId}`).send(body);
  return { app, threadId, stepId, patch };
}

describe.skipIf(!integrationReady)("work time (M5-04)", () => {
  it("mark applied scores +10 + minutes, +20 with a reflection", async () => {
    expect((await manualApplied({ actualMinutes: 60, reflection: REFLECTION })).body.points.amount).toBe(90);
    expect((await manualApplied({ actualMinutes: 60 })).body.points.amount).toBe(70);
    const blank = await manualApplied({});
    expect(blank.body.points.amount).toBe(10);

    const detail = await apiClient().get(`/api/applications/${blank.body.id}`).expect(200);
    expect(detail.body.actualMinutes).toBeNull();
  });

  it("the time is stored on the application and its task, not on the modal's reflection", async () => {
    const app = await seedManualApplication({ status: "todo" });
    const task = await seedTask({ category: "application", applicationId: app.id });
    const res = await apiClient()
      .post(`/api/tasks/${task.id}/complete`)
      .send({ actualMinutes: 40, reflection: REFLECTION })
      .expect(200);
    expect(res.body.points.amount).toBe(10 + 40 + 20);
    expect(res.body.actualMinutes).toBe(40);

    const detail = await apiClient().get(`/api/applications/${app.id}`).expect(200);
    expect(detail.body.actualMinutes).toBe(40);
    const { rows } = await pool.query(`SELECT actual_minutes FROM reflection_logs`);
    expect(rows).toEqual([{ actual_minutes: null }]);
  });

  it("interview finish scores kind + minutes, +20 with a reflection", async () => {
    const plain = await technicalStep();
    const a = await plain.patch({ status: "completed", actualMinutes: 30 }).expect(200);
    expect(a.body.points.amount).toBe(110);

    const reflected = await technicalStep();
    const b = await reflected
      .patch({ status: "completed", actualMinutes: 30, reflection: REFLECTION })
      .expect(200);
    expect(b.body.points.amount).toBe(130);

    const thread = await apiClient().get(`/api/interviews/${reflected.threadId}`).expect(200);
    expect(thread.body.steps[0].actualMinutes).toBe(30);
  });

  it("editing an application's time adjusts its earn and never reverses it", async () => {
    const created = await manualApplied({ actualMinutes: 60 });
    const id = created.body.id as string;
    expect(await balance()).toBe(70);

    const up = await apiClient().patch(`/api/applications/${id}`).send({ actualMinutes: 90 }).expect(200);
    expect(up.body.actualMinutes).toBe(90);
    expect(up.body.points).toMatchObject({ amount: 30, balanceAfter: 100 });
    expect(up.body.points.message).toContain("+30 points");

    const cleared = await apiClient()
      .patch(`/api/applications/${id}`)
      .send({ actualMinutes: null })
      .expect(200);
    expect(cleared.body.points).toMatchObject({ amount: -90, balanceAfter: 10 });
    expect(await adjusts("application_applied", id)).toEqual([30, -90]);

    const row = await earn("application_applied", id);
    expect(row?.meta.superseded).not.toBe(true);
    expect(cleared.body.status).toBe("applied");

    const same = await apiClient().patch(`/api/applications/${id}`).send({ actualMinutes: null }).expect(200);
    expect(same.body.points).toBeNull();
  });

  it("an application task's time edit goes to the application, so the two never disagree", async () => {
    const app = await seedManualApplication({ status: "todo" });
    const task = await seedTask({ category: "application", applicationId: app.id });
    await apiClient()
      .post(`/api/tasks/${task.id}/complete`)
      .send({ actualMinutes: 20 })
      .expect(200);

    const viaTask = await apiClient().patch(`/api/tasks/${task.id}`).send({ actualMinutes: 50 }).expect(200);
    expect(viaTask.body.actualMinutes).toBe(50);
    expect(viaTask.body.points.amount).toBe(30);
    expect((await apiClient().get(`/api/applications/${app.id}`)).body.actualMinutes).toBe(50);

    await apiClient().patch(`/api/applications/${app.id}`).send({ actualMinutes: 35 }).expect(200);
    expect((await apiClient().get(`/api/tasks/${task.id}`)).body.actualMinutes).toBe(35);
    expect(await balance()).toBe(10 + 35);
  });

  it("a to-do application's time can't be set; it comes from mark applied", async () => {
    const app = await seedManualApplication({ status: "todo" });
    await apiClient().patch(`/api/applications/${app.id}`).send({ actualMinutes: 30 }).expect(409);
  });

  it("editing a finished step's time adjusts its earn; re-finishing earns nothing again", async () => {
    const step = await technicalStep();
    await step.patch({ status: "completed", actualMinutes: 30 }).expect(200);

    const edited = await step.patch({ actualMinutes: 45 }).expect(200);
    expect(edited.body.points).toMatchObject({ amount: 15 });
    expect(await balance()).toBe(80 + 45);

    await step.patch({ status: "pending" }).expect(200);
    const refinished = await step
      .patch({ status: "completed", actualMinutes: null })
      .expect(200);
    expect(refinished.body.points).toBeNull();
    expect(await balance()).toBe(80 + 45);
    const thread = await apiClient().get(`/api/interviews/${step.threadId}`).expect(200);
    expect(thread.body.steps[0].actualMinutes).toBe(45);

    await step.patch({ status: "pending" }).expect(200);
    const longer = await step.patch({ status: "completed", actualMinutes: 60 }).expect(200);
    expect(longer.body.points).toMatchObject({ amount: 15 });

    const { rows } = await pool.query(
      `SELECT 1 FROM points_events WHERE kind = 'earn' AND source_type = 'interview_finish'`,
    );
    expect(rows).toHaveLength(1);
    expect(await balance()).toBe(80 + 60);
  });

  it("an unfinished step takes planned time without earning; finishing blank keeps it", async () => {
    const step = await technicalStep();
    const planned = await step.patch({ actualMinutes: 60 }).expect(200);
    expect(planned.body.points).toBeNull();
    expect(await earn("interview_finish", step.stepId)).toBeNull();
    expect(await balance()).toBe(0);

    const finished = await step.patch({ status: "completed", actualMinutes: null }).expect(200);
    expect(finished.body.points.amount).toBe(80 + 60);
  });

  it("a new step can be created with planned time", async () => {
    const step = await technicalStep();
    await step.patch({ status: "skipped" }).expect(200);
    await apiClient()
      .post(`/api/interviews/${step.threadId}/steps`)
      .send({ kind: "phone", title: "HM chat", actualMinutes: 30 })
      .expect(201);
    const thread = await apiClient().get(`/api/interviews/${step.threadId}`).expect(200);
    const added = thread.body.steps.find((s: { title: string }) => s.title === "HM chat");
    expect(added.actualMinutes).toBe(30);

    const app = await seedManualApplication({ status: "applied", company: "New Co" });
    const created = await apiClient()
      .post("/api/interviews")
      .send({
        applicationIds: [app.id],
        step: { kind: "assessment", title: "HackerRank", actualMinutes: 90 },
      })
      .expect(201);
    const fresh = await apiClient().get(`/api/interviews/${created.body.id}`).expect(200);
    expect(fresh.body.steps[0].actualMinutes).toBe(90);
  });

  it("a reopened step's time edit re-scores the earn it kept, with a banner", async () => {
    const step = await technicalStep();
    await step.patch({ status: "completed", actualMinutes: 30 }).expect(200);
    await step.patch({ status: "pending" }).expect(200);

    const edited = await step.patch({ actualMinutes: 50 }).expect(200);
    expect(edited.body.points).toMatchObject({ amount: 20 });
    expect(await balance()).toBe(80 + 50);
    const { rows } = await pool.query(
      `SELECT 1 FROM points_events WHERE kind = 'earn' AND source_type = 'interview_finish'`,
    );
    expect(rows).toHaveLength(1);
  });

  it("misc scores +10 base + minutes, +20 with a reflection", async () => {
    const cases: Array<[Record<string, unknown>, number]> = [
      [{ actualMinutes: 30 }, 40],
      [{ actualMinutes: 30, reflection: { lane: "other", body: "Done" } }, 60],
      [{}, 10],
      [{ reflection: { lane: "other", body: "Done" } }, 30],
    ];
    for (const [body, expected] of cases) {
      const task = await seedTask({ category: "school" });
      const res = await apiClient().post(`/api/tasks/${task.id}/complete`).send(body).expect(200);
      expect(res.body.points.amount, JSON.stringify(body)).toBe(expected);
    }
  });

  it("a misc task's time can be edited to 0, like every other work time", async () => {
    const task = await seedTask({ category: "school" });
    await apiClient().post(`/api/tasks/${task.id}/complete`).send({ actualMinutes: 30 }).expect(200);
    const zero = await apiClient().patch(`/api/tasks/${task.id}`).send({ actualMinutes: 0 }).expect(200);
    expect(zero.body.actualMinutes).toBe(0);
    expect(zero.body.points.amount).toBe(-30);
    await apiClient().patch(`/api/tasks/${task.id}`).send({ actualMinutes: -1 }).expect(400);
  });

  it("an old blank-time misc earn of 15 is re-scored on its first edit, or on re-complete", async () => {
    const legacy = async (title: string) => {
      const task = await seedTask({ category: "school", title, status: "completed", completedAt: new Date() });
      await recordEarn(pool, {
        category: "task",
        amount: 15,
        message: `${title} complete! +15 points`,
        sourceType: "task_complete",
        sourceId: task.id,
        breakdown: [{ category: "task", amount: 15, label: "task" }],
        meta: { actual_minutes: null, with_reflection: false },
      });
      return task;
    };

    const edited = await legacy("Edited");
    const res = await apiClient().patch(`/api/tasks/${edited.id}`).send({ actualMinutes: 10 }).expect(200);
    expect(res.body.points.amount).toBe(5);
    expect(res.body.pointsEarned).toBe(20);

    await truncateAll();
    const recompleted = await legacy("Recompleted");
    await apiClient().post(`/api/tasks/${recompleted.id}/reopen`).expect(200);
    await apiClient().post(`/api/tasks/${recompleted.id}/complete`).send({}).expect(200);
    expect(await balance()).toBe(10);
  });

  it("reflections have no minutes and earn a flat +20 from any form", async () => {
    const res = await apiClient()
      .post("/api/progress/reflections")
      .send({ lane: "technical", body: "Graphs", actualMinutes: 90 })
      .expect(201);
    expect(res.body).not.toHaveProperty("actualMinutes");
    expect(await balance()).toBe(20);
    const { rows } = await pool.query(`SELECT actual_minutes FROM reflection_logs`);
    expect(rows).toEqual([{ actual_minutes: null }]);
  });

  it("an application from before this ticket keeps its earn until its time is edited", async () => {
    const app = await seedManualApplication({ status: "applied" });
    // Old formula: +5, plus the reflection's 30 minutes.
    await recordEarn(pool, {
      category: "application",
      amount: 35,
      message: "old",
      sourceType: "application_applied",
      sourceId: app.id,
      breakdown: [],
      meta: { with_reflection: true, reflection_minutes: 30 },
    });
    await seedReflectionLog({ lane: "application", body: "Modal reflection", applicationId: app.id });
    await pool.query(`UPDATE reflection_logs SET actual_minutes = 30`);
    await runMigration();

    const detail = await apiClient().get(`/api/applications/${app.id}`).expect(200);
    expect(detail.body.actualMinutes).toBe(30);
    expect((await earn("application_applied", app.id))?.amount).toBe(35);

    const res = await apiClient().patch(`/api/applications/${app.id}`).send({ actualMinutes: 40 }).expect(200);
    expect(res.body.points.amount).toBe(10 + 40 + 20 - 35);
    expect(await balance()).toBe(70);
  });
});

async function runMigration(): Promise<void> {
  const sql = await readFile(new URL("./sql/028_work_actual_minutes.sql", import.meta.url), "utf8");
  await pool.query(sql);
}

describe.skipIf(!integrationReady)("migration 028 copies modal minutes onto the work", () => {
  it("copies task time first, else modal-reflection minutes; skips standalone reflections", async () => {
    const withTask = await seedManualApplication({ status: "applied", company: "Task Co" });
    const task = await seedTask({
      category: "application",
      applicationId: withTask.id,
      status: "completed",
      completedAt: new Date(),
    });
    await pool.query(`UPDATE tasks SET actual_minutes = 25 WHERE id = $1`, [task.id]);
    await seedReflectionLog({ lane: "application", body: "With task", applicationId: withTask.id });

    const noTask = await seedManualApplication({ status: "applied", company: "Jobs Co" });
    const noTaskTask = await seedTask({
      category: "application",
      applicationId: noTask.id,
      status: "completed",
      completedAt: new Date(),
    });
    await seedReflectionLog({ lane: "application", body: "Jobs modal", applicationId: noTask.id });

    const standalone = await seedManualApplication({ status: "applied", company: "Solo Co" });
    const solo = await seedReflectionLog({
      lane: "application",
      body: "Progress compose",
      applicationId: standalone.id,
    });
    await recordEarn(pool, {
      category: "reflection",
      amount: 15,
      message: "standalone",
      sourceType: "reflection_create",
      sourceId: solo.id,
      breakdown: [],
      meta: {},
    });

    const step = await technicalStep();
    await seedReflectionLog({
      lane: "technical",
      body: "Step modal",
      applicationId: step.app.id,
      interviewStepId: step.stepId,
    });

    await pool.query(`UPDATE reflection_logs SET actual_minutes = 15`);
    await runMigration();
    await runMigration();

    const minutes = async (id: string) =>
      (await apiClient().get(`/api/applications/${id}`)).body.actualMinutes;
    expect(await minutes(withTask.id)).toBe(25);
    expect(await minutes(noTask.id)).toBe(15);
    expect((await apiClient().get(`/api/tasks/${noTaskTask.id}`)).body.actualMinutes).toBe(15);
    expect(await minutes(standalone.id)).toBeNull();
    // The interview step's reflection goes to the step, not the application.
    expect(await minutes(step.app.id)).toBeNull();
    const thread = await apiClient().get(`/api/interviews/${step.threadId}`).expect(200);
    expect(thread.body.steps[0].actualMinutes).toBe(15);
  });
});
