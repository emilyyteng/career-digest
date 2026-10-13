import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { awardApplicationApplied, awardInterviewFinish } from "./pointsAwards.js";
import { runMergeDuplicatePostings } from "./mergeDuplicatePostings.js";
import { apiClient } from "./test/apiClient.js";
import {
  getApplicationByPosting,
  interviewThreadExists,
  seedApplication,
  seedCompany,
  seedInterviewThread,
  seedManualApplication,
  seedPosting,
  seedReflectionLog,
  seedTask,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

let pairCounter = 0;

/** A Simplify duplicate and its Greenhouse posting, which the nightly merge pairs up. */
async function duplicatePair() {
  pairCounter += 1;
  const n = `${7000 + pairCounter}`;
  const company = await seedCompany({ source: "greenhouse", boardToken: `merge${pairCounter}` });
  const canonical = await seedPosting({
    source: "greenhouse",
    externalId: n,
    companyId: company.id,
    url: `https://boards.greenhouse.io/merge${pairCounter}/jobs/${n}`,
  });
  const simplify = await seedPosting({
    source: "simplify",
    externalId: `simp-${n}`,
    companyId: company.id,
    url: `https://boards.greenhouse.io/embed/job_app?token=${n}`,
  });
  return { canonical, simplify };
}

async function setTime(applicationId: string, minutes: number | null) {
  await pool.query(`UPDATE applications SET actual_minutes = $2 WHERE id = $1`, [
    applicationId,
    minutes,
  ]);
}

async function app(id: string) {
  const { rows } = await pool.query<{
    status: string;
    notes: string | null;
    actual_minutes: number | null;
    applied_at: Date | null;
  }>(`SELECT status, notes, actual_minutes, applied_at FROM applications WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

async function balance(): Promise<number> {
  const res = await apiClient().get("/api/points").expect(200);
  return res.body.balance as number;
}

async function applicationEvents(sourceId: string) {
  const { rows } = await pool.query<{ kind: string; amount: number }>(
    `SELECT kind, amount FROM points_events
     WHERE source_type = 'application_applied' AND source_id = $1
     ORDER BY created_at`,
    [sourceId],
  );
  return rows;
}

describe.skipIf(!integrationReady)("application merges (M2-02)", () => {
  it("moves reflections to the survivor, keeping interview step links (R2.17)", async () => {
    const { canonical, simplify } = await duplicatePair();
    const survivor = await seedApplication({ postingId: canonical.id, status: "applied" });
    const removed = await seedApplication({ postingId: simplify.id, status: "interviewing" });
    const { stepId } = await seedInterviewThread({ primaryApplicationId: removed.id });
    const own = await seedReflectionLog({ lane: "application", body: "Mine", applicationId: survivor.id });
    const moved = await seedReflectionLog({ lane: "application", body: "Moved", applicationId: removed.id });
    const stepNote = await seedReflectionLog({
      lane: "technical",
      body: "Step note",
      applicationId: removed.id,
      interviewStepId: stepId,
    });

    await runMergeDuplicatePostings();

    const { rows } = await pool.query<{ id: string; application_id: string; interview_step_id: string | null }>(
      `SELECT id, application_id, interview_step_id FROM reflection_logs`,
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(own.id)?.application_id).toBe(survivor.id);
    expect(byId.get(moved.id)?.application_id).toBe(survivor.id);
    expect(byId.get(stepNote.id)).toMatchObject({ application_id: survivor.id, interview_step_id: stepId });
  });

  it("keeps the survivor's time, or takes the removed one's, and its tasks match", async () => {
    const first = await duplicatePair();
    const blank = await seedApplication({ postingId: first.canonical.id, status: "applied" });
    const timed = await seedApplication({ postingId: first.simplify.id, status: "applied" });
    await setTime(timed.id, 40);
    const task = await seedTask({ category: "application", applicationId: blank.id, status: "completed" });

    const second = await duplicatePair();
    const own = await seedApplication({ postingId: second.canonical.id, status: "applied" });
    const other = await seedApplication({ postingId: second.simplify.id, status: "applied" });
    await setTime(own.id, 20);
    await setTime(other.id, 40);

    await runMergeDuplicatePostings();

    expect((await app(blank.id))?.actual_minutes).toBe(40);
    const t = await apiClient().get(`/api/tasks/${task.id}`).expect(200);
    expect(t.body.actualMinutes).toBe(40);
    expect((await app(own.id))?.actual_minutes).toBe(20);
  });

  it("moves the earn when only the removed application has one; later edits adjust it", async () => {
    const { canonical, simplify } = await duplicatePair();
    const survivor = await seedApplication({ postingId: canonical.id, status: "todo" });
    const removed = await seedApplication({ postingId: simplify.id, status: "applied" });
    await setTime(removed.id, 40);
    await awardApplicationApplied(pool, { applicationId: removed.id, label: "Removed", actualMinutes: 40 });
    expect(await balance()).toBe(45);

    await runMergeDuplicatePostings();

    expect(await balance()).toBe(45);
    expect(await applicationEvents(removed.id)).toEqual([]);
    expect(await applicationEvents(survivor.id)).toEqual([{ kind: "earn", amount: 45 }]);
    const merged = await app(survivor.id);
    expect(merged).toMatchObject({ status: "applied", actual_minutes: 40 });
    expect(merged?.applied_at).not.toBeNull();

    const edited = await apiClient()
      .patch(`/api/applications/${survivor.id}`)
      .send({ actualMinutes: 50 })
      .expect(200);
    expect(edited.body.points.amount).toBe(10);
    expect(await balance()).toBe(55);
    const earns = await pool.query(
      `SELECT 1 FROM points_events WHERE kind = 'earn' AND source_type = 'application_applied'`,
    );
    expect(earns.rows).toHaveLength(1);
  });

  it("keeps both earns when both applications have one; points never change at a merge", async () => {
    const { canonical, simplify } = await duplicatePair();
    const survivor = await seedApplication({ postingId: canonical.id, status: "applied" });
    const removed = await seedApplication({ postingId: simplify.id, status: "applied" });
    await awardApplicationApplied(pool, { applicationId: survivor.id, label: "Kept", actualMinutes: 10 });
    await awardApplicationApplied(pool, { applicationId: removed.id, label: "Removed", actualMinutes: 20 });
    expect(await balance()).toBe(15 + 25);

    await runMergeDuplicatePostings();

    expect(await balance()).toBe(40);
    expect(await applicationEvents(survivor.id)).toEqual([{ kind: "earn", amount: 15 }]);
    expect(await applicationEvents(removed.id)).toEqual([{ kind: "earn", amount: 25 }]);
  });

  it("moves tasks; an open task closes once the merge lands past to-do, and its reflections follow", async () => {
    const { canonical, simplify } = await duplicatePair();
    const survivor = await seedApplication({ postingId: canonical.id, status: "todo" });
    const removed = await seedApplication({ postingId: simplify.id, status: "applied" });
    const open = await seedTask({ category: "application", applicationId: survivor.id, postingId: canonical.id });
    const done = await seedTask({ category: "application", applicationId: removed.id, status: "completed" });
    const onSimplify = await seedTask({ category: "school", postingId: simplify.id });
    const taskNote = await seedReflectionLog({ lane: "application", body: "Draft", taskId: open.id });

    await runMergeDuplicatePostings();

    const { rows } = await pool.query<{ id: string; status: string; application_id: string | null; posting_id: string | null }>(
      `SELECT id, status, application_id, posting_id FROM tasks`,
    );
    const byId = new Map(rows.map((r) => [r.id, r]));
    expect(byId.get(open.id)).toMatchObject({ status: "completed", application_id: survivor.id });
    expect(byId.get(done.id)?.application_id).toBe(survivor.id);
    expect(byId.get(onSimplify.id)?.posting_id).toBe(canonical.id);
    const refl = await pool.query(`SELECT task_id, application_id FROM reflection_logs WHERE id = $1`, [taskNote.id]);
    expect(refl.rows[0]).toEqual({ task_id: null, application_id: survivor.id });
  });

  it("folds the removed application's thread into the survivor's, keeping step ids and earns", async () => {
    const { canonical, simplify } = await duplicatePair();
    const survivor = await seedApplication({ postingId: canonical.id, status: "interviewing" });
    const removed = await seedApplication({ postingId: simplify.id, status: "interviewing" });
    const kept = await seedInterviewThread({ primaryApplicationId: survivor.id, stepTitle: "Phone" });
    const folded = await seedInterviewThread({ primaryApplicationId: removed.id, stepTitle: "Onsite" });
    await pool.query(
      `UPDATE interview_threads SET status = 'resolved', resolution = 'rejected', resolved_at = now()
       WHERE id = ANY($1::uuid[])`,
      [[kept.threadId, folded.threadId]],
    );
    await pool.query(`UPDATE application_steps SET status = 'completed' WHERE id = $1`, [folded.stepId]);
    await awardInterviewFinish(pool, { stepId: folded.stepId, label: "Onsite", kind: "onsite", actualMinutes: 60 });
    const before = await balance();

    await runMergeDuplicatePostings();

    expect(await interviewThreadExists(folded.threadId)).toBe(false);
    const thread = await apiClient().get(`/api/interviews/${kept.threadId}`).expect(200);
    expect(thread.body.status).toBe("resolved");
    expect(thread.body.steps.map((s: { id: string }) => s.id)).toEqual([kept.stepId, folded.stepId]);
    expect(await balance()).toBe(before);
  });

  it("an active removed thread reopens the survivor's resolved one when they fold", async () => {
    const { canonical, simplify } = await duplicatePair();
    const survivor = await seedApplication({ postingId: canonical.id, status: "interviewing" });
    const removed = await seedApplication({ postingId: simplify.id, status: "interviewing" });
    const kept = await seedInterviewThread({ primaryApplicationId: survivor.id });
    await seedInterviewThread({ primaryApplicationId: removed.id });
    await pool.query(
      `UPDATE interview_threads SET status = 'resolved', resolution = 'rejected', resolved_at = now() WHERE id = $1`,
      [kept.threadId],
    );

    await runMergeDuplicatePostings();

    const { rows } = await pool.query(`SELECT status, resolution FROM interview_threads WHERE id = $1`, [
      kept.threadId,
    ]);
    expect(rows[0]).toEqual({ status: "active", resolution: null });
  });

  it("linking a posting from the application page keeps the other application's thread and earn", async () => {
    const company = await seedCompany();
    const posting = await seedPosting({
      source: "greenhouse",
      externalId: "link-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/link-1",
    });
    const other = await seedApplication({ postingId: posting.id, status: "interviewing", notes: "Theirs" });
    await setTime(other.id, 30);
    await awardApplicationApplied(pool, { applicationId: other.id, label: "Other", actualMinutes: 30 });
    const { threadId } = await seedInterviewThread({ primaryApplicationId: other.id });
    const manualId = (await seedManualApplication({ status: "todo", notes: "Mine" })).id;

    await apiClient().patch(`/api/applications/${manualId}`).send({ postingId: posting.id }).expect(200);

    expect(await interviewThreadExists(threadId)).toBe(true);
    const merged = await app(manualId);
    expect(merged).toMatchObject({ status: "interviewing", actual_minutes: 30 });
    expect(merged?.notes).toContain("Mine");
    expect(merged?.notes).toContain("Theirs");
    expect(await applicationEvents(manualId)).toEqual([{ kind: "earn", amount: 35 }]);
    expect((await getApplicationByPosting(posting.id))?.id).toBe(manualId);
  });

  it("linking a posting from an application task merges the same way and closes the task", async () => {
    const company = await seedCompany();
    const posting = await seedPosting({
      source: "greenhouse",
      externalId: "link-2",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/link-2",
    });
    const other = await seedApplication({ postingId: posting.id, status: "applied", notes: "Applied there" });
    await setTime(other.id, 25);
    await awardApplicationApplied(pool, { applicationId: other.id, label: "Other", actualMinutes: 25 });
    const { threadId } = await seedInterviewThread({ primaryApplicationId: other.id });
    const todoApp = await seedManualApplication({ status: "todo" });
    const task = await seedTask({ category: "application", applicationId: todoApp.id, notes: "Task notes" });
    const before = await balance();

    const res = await apiClient().patch(`/api/tasks/${task.id}`).send({ postingId: posting.id }).expect(200);

    expect(res.body.status).toBe("completed");
    expect(res.body.actualMinutes).toBe(25);
    expect(res.body.notes).toContain("Task notes");
    expect(res.body.notes).toContain("Applied there");
    const merged = await app(todoApp.id);
    expect(merged?.notes).toBe(res.body.notes);
    expect(merged?.status).toBe("applied");
    expect(await interviewThreadExists(threadId)).toBe(true);
    expect(await balance()).toBe(before);
    expect(await applicationEvents(todoApp.id)).toEqual([{ kind: "earn", amount: 30 }]);
  });
});
