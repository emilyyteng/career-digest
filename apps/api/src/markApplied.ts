import type { Pool, PoolClient } from "pg";
import { getApplication, setApplicationActualMinutes } from "./applications.js";
import { awardApplicationApplied } from "./pointsAwards.js";
import type { PointsEventRow } from "./pointsLedger.js";
import {
  createReflectionLog,
  transferTaskReflectionsToApplication,
  type ProgressLane,
} from "./progress.js";
import { closeDueWeeks } from "./weeklyGoals.js";

export type MarkAppliedReflection = {
  lane: ProgressLane;
  body: string;
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
  /** The modal's time; blank keeps an open task's existing actual time. */
  actualMinutes?: number | null;
  reflection: MarkAppliedReflection | null;
  /** The browser's time zone. Without it, ended weeks are left for a request that has one (B2). */
  tz: string | null;
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
 * between paths. Ended weeks close first (R5.23), so this completion counts toward the
 * current week; the rest is one transaction. Weekly points come only from week close (R5.9).
 */
export async function markApplied(
  pool: Pool,
  input: MarkAppliedInput,
): Promise<MarkAppliedResult> {
  if (input.tz) await closeDueWeeks(pool, input.tz);
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

  const completed = await client.query<{ id: string; actual_minutes: number | null }>(
    `UPDATE tasks
     SET status = 'completed',
         completed_at = now(),
         updated_at = now()
     WHERE application_id = $1
       AND status = 'open'
       AND category = 'application'
     RETURNING id, actual_minutes`,
    [applicationId],
  );
  const completedTaskIds = completed.rows.map((row) => row.id);
  const minutes =
    input.actualMinutes ??
    completed.rows.find((row) => row.actual_minutes != null)?.actual_minutes ??
    null;
  await setApplicationActualMinutes(client, applicationId, minutes);
  for (const taskId of completedTaskIds) {
    await transferTaskReflectionsToApplication(client, taskId, applicationId);
  }

  if (input.reflection) {
    await createReflectionLog(client, {
      lane: input.reflection.lane,
      body: input.reflection.body,
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
    actualMinutes: minutes,
  });

  if (input.tz) {
    const { localDateInTimezone } = await import("./progress.js");
    const { syncStreakForDay } = await import("./streaks.js");
    const appliedAt = input.appliedAt ?? new Date();
    const localDate = localDateInTimezone(appliedAt, input.tz);
    // `now` is wall-clock today so a backdated applied_at doesn't award streak points.
    await syncStreakForDay(client, "apps", input.tz, localDate, true, new Date());
  }

  return { applicationId, completedTaskIds, points: created ? event : null };
}