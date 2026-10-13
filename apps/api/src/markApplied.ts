import type { Pool, PoolClient } from "pg";
import { getApplication } from "./applications.js";
import { awardApplicationApplied, awardWeeklyGoalIfNeeded } from "./pointsAwards.js";
import type { PointsEventRow } from "./pointsLedger.js";
import {
  createReflectionLog,
  transferTaskReflectionsToApplication,
  type ProgressLane,
} from "./progress.js";
import { getWeeklyGoalsSnapshot } from "./weeklyGoals.js";

export type MarkAppliedReflection = {
  lane: ProgressLane;
  body: string;
  actualMinutes: number | null;
};

export class MarkAppliedError extends Error {
  constructor(
    message: string,
    readonly status: 404 | 409,
  ) {
    super(message);
  }
}

export type MarkAppliedInput = {
  /**
   * Runs inside the transaction and returns the to-do application to mark applied,
   * creating it first if the caller has none yet (Jobs on a posting never added to Tasks).
   */
  resolveApplication: (client: PoolClient) => Promise<string>;
  /** Defaults to now. */
  appliedAt?: Date | null;
  /** The modal's notes; appended to the application's notes, since the task is being completed. */
  notes?: string | null;
  reflection: MarkAppliedReflection | null;
  tz: string;
};

export type MarkAppliedResult = {
  applicationId: string;
  completedTaskIds: string[];
  /** Null if the application had already earned (R4.10: never twice). */
  points: PointsEventRow | null;
};

/**
 * The single mark-applied operation (R2.13). Tasks and Jobs both call it, so the
 * application, its open task, reflections, points and weekly apps handling can't drift
 * between paths. Everything but the weekly check is one transaction.
 */
export async function markApplied(
  pool: Pool,
  input: MarkAppliedInput,
): Promise<MarkAppliedResult> {
  const client = await pool.connect();
  let result: MarkAppliedResult;
  try {
    await client.query("BEGIN");
    result = await markAppliedInTransaction(client, input);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
  await checkWeeklyAppsGoal(pool, input.tz);
  return result;
}

async function markAppliedInTransaction(
  client: PoolClient,
  input: MarkAppliedInput,
): Promise<MarkAppliedResult> {
  const applicationId = await input.resolveApplication(client);
  const current = await client.query<{ status: string }>(
    `SELECT status FROM applications WHERE id = $1 FOR UPDATE`,
    [applicationId],
  );
  if (!current.rows[0]) throw new MarkAppliedError("Application not found", 404);
  if (current.rows[0].status !== "todo") {
    throw new MarkAppliedError("This application is already marked applied", 409);
  }

  const notes = input.notes?.trim() || null;
  await client.query(
    `UPDATE applications
     SET status = 'applied',
         applied_at = COALESCE($2, now()),
         due_at = NULL,
         notes = CASE
           WHEN $3::text IS NULL THEN notes
           WHEN NULLIF(btrim(notes), '') IS NULL THEN $3
           ELSE btrim(notes) || E'\\n\\n' || $3
         END,
         status_changed_at = now(),
         updated_at = now()
     WHERE id = $1`,
    [applicationId, input.appliedAt ?? null, notes],
  );

  // Until M5-04 moves time onto the application, the modal's minutes are the task's actual time (R2.10).
  const minutes = input.reflection?.actualMinutes ?? null;
  const completed = await client.query<{ id: string }>(
    `UPDATE tasks
     SET status = 'completed',
         completed_at = now(),
         actual_minutes = COALESCE($2, actual_minutes),
         updated_at = now()
     WHERE application_id = $1
       AND status = 'open'
       AND category = 'application'
     RETURNING id`,
    [applicationId, minutes],
  );
  const completedTaskIds = completed.rows.map((row) => row.id);
  for (const taskId of completedTaskIds) {
    await transferTaskReflectionsToApplication(client, taskId, applicationId);
  }

  if (input.reflection) {
    await createReflectionLog(client, {
      lane: input.reflection.lane,
      body: input.reflection.body,
      actualMinutes: minutes,
      applicationId,
      awardPoints: false,
    });
  }

  const app = await getApplication(client, applicationId);
  const label = app?.company
    ? `${app.company}${app.title ? ` · ${app.title}` : ""}`
    : app?.title ?? "Application";
  const { event, created } = await awardApplicationApplied(client, {
    applicationId,
    label,
    withReflection: input.reflection != null,
    reflectionMinutes: minutes,
  });

  return { applicationId, completedTaskIds, points: created ? event : null };
}

async function checkWeeklyAppsGoal(pool: Pool, tz: string): Promise<void> {
  try {
    const snap = await getWeeklyGoalsSnapshot(pool, tz);
    const appsGoal = snap?.goals.find((g) => g.slot === "apps");
    if (snap && appsGoal && appsGoal.total > 0 && appsGoal.done >= appsGoal.total) {
      await awardWeeklyGoalIfNeeded(pool, {
        weekStart: snap.weekStart,
        slot: "apps",
        met: true,
        label: "Weekly apps target met!",
      });
    }
  } catch {
    // The bonus is idempotent and re-checked on the next mark applied, so it never fails this one.
  }
}
