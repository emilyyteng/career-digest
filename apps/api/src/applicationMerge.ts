import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

const STATUS_RANK: Record<string, number> = {
  todo: 0,
  applied: 1,
  interviewing: 2,
  accepted: 3,
  declined: 1,
};

export function mergeNotes(a: string | null, b: string | null): string | null {
  const left = a?.trim() ?? "";
  const right = b?.trim() ?? "";
  if (!left) return right || null;
  if (!right) return left;
  if (left.includes(right)) return left;
  if (right.includes(left)) return right;
  return `${left}\n\n${right}`;
}

/** The further-along status wins; ties keep the first. */
export function pickMergedApplicationStatus(left: string, right: string): string {
  const leftRank = STATUS_RANK[left] ?? 0;
  const rightRank = STATUS_RANK[right] ?? 0;
  return rightRank > leftRank ? right : left;
}

type MergeRow = {
  id: string;
  status: string;
  notes: string | null;
  applied_at: Date | null;
  due_at: Date | null;
  description_html: string | null;
  actual_minutes: number | null;
};

/** The survivor's merged fields, for callers that write the row again afterwards. */
export type MergedApplicationFields = {
  status: string;
  notes: string | null;
  appliedAt: Date | null;
  dueAt: Date | null;
  descriptionHtml: string | null;
};

async function mergeInterviewThreads(
  db: Queryable,
  survivorId: string,
  removedId: string,
): Promise<void> {
  const membership = async (applicationId: string) => {
    const { rows } = await db.query<{ thread_id: string }>(
      `SELECT thread_id FROM application_thread_members WHERE application_id = $1`,
      [applicationId],
    );
    return rows[0]?.thread_id ?? null;
  };
  const removedThread = await membership(removedId);
  const survivorThread = await membership(survivorId);

  if (removedThread && survivorThread && removedThread !== survivorThread) {
    // An application belongs to one thread, so the removed one's thread folds into the
    // survivor's: steps keep their ids (and their earns), appended after the survivor's.
    await db.query(
      `UPDATE application_steps SET
         thread_id = $1,
         sort_order = sort_order + (
           SELECT COALESCE(MAX(sort_order), -1) + 1 FROM application_steps WHERE thread_id = $1
         ),
         updated_at = now()
       WHERE thread_id = $2`,
      [survivorThread, removedThread],
    );
    await db.query(
      `UPDATE application_thread_members SET thread_id = $1
       WHERE thread_id = $2 AND application_id <> $3`,
      [survivorThread, removedThread, removedId],
    );
    await db.query(
      `UPDATE interview_threads s SET
         label = COALESCE(s.label, r.label),
         status = CASE WHEN r.status = 'active' THEN 'active' ELSE s.status END,
         resolution = CASE WHEN r.status = 'active' THEN NULL ELSE s.resolution END,
         resolved_at = CASE WHEN r.status = 'active' THEN NULL ELSE s.resolved_at END,
         updated_at = now()
       FROM interview_threads r
       WHERE s.id = $1 AND r.id = $2`,
      [survivorThread, removedThread],
    );
    await db.query(`DELETE FROM interview_threads WHERE id = $1`, [removedThread]);
  } else if (removedThread && !survivorThread) {
    await db.query(
      `UPDATE application_thread_members SET application_id = $1 WHERE application_id = $2`,
      [survivorId, removedId],
    );
  } else if (removedThread) {
    await db.query(`DELETE FROM application_thread_members WHERE application_id = $1`, [
      removedId,
    ]);
  }
  await db.query(
    `UPDATE interview_threads SET primary_application_id = $1, updated_at = now()
     WHERE primary_application_id = $2`,
    [survivorId, removedId],
  );
}

/**
 * Folds `removedId` into `survivorId` and deletes it (R2.17, R2.22). Every merge path uses
 * this: the nightly duplicate-posting merge, and linking a posting that already has an
 * application, from the application page or from an application task. Run it inside the
 * caller's transaction. Points never change here: the removed application's earn moves
 * to the survivor only if the survivor has none.
 */
export async function mergeApplicationInto(
  db: Queryable,
  input: { survivorId: string; removedId: string },
): Promise<MergedApplicationFields> {
  const { survivorId, removedId } = input;
  const { rows } = await db.query<MergeRow>(
    `SELECT id, status, notes, applied_at, due_at, description_html, actual_minutes
     FROM applications WHERE id = ANY($1::uuid[])`,
    [[survivorId, removedId]],
  );
  const survivor = rows.find((r) => r.id === survivorId);
  const removed = rows.find((r) => r.id === removedId);
  if (!survivor || !removed) throw new Error("Application not found");

  const status = pickMergedApplicationStatus(survivor.status, removed.status);
  const notes = mergeNotes(survivor.notes, removed.notes);
  const appliedAt = status === "todo" ? null : survivor.applied_at ?? removed.applied_at;
  const actualMinutes = survivor.actual_minutes ?? removed.actual_minutes;
  const dueAt = status === "todo" ? survivor.due_at ?? removed.due_at : null;
  const descriptionHtml = survivor.description_html ?? removed.description_html;

  await db.query(
    `UPDATE application_documents SET application_id = $1 WHERE application_id = $2`,
    [survivorId, removedId],
  );
  await mergeInterviewThreads(db, survivorId, removedId);
  await db.query(
    `UPDATE reflection_logs SET application_id = $1 WHERE application_id = $2`,
    [survivorId, removedId],
  );
  await db.query(
    `UPDATE tasks SET application_id = $1, updated_at = now() WHERE application_id = $2`,
    [survivorId, removedId],
  );
  // Adjusts and reversals share the earn's source, so they move with it.
  await db.query(
    `UPDATE points_events SET source_id = $1
     WHERE source_type = 'application_applied' AND source_id = $2
       AND NOT EXISTS (
         SELECT 1 FROM points_events
         WHERE kind = 'earn' AND source_type = 'application_applied' AND source_id = $1
       )`,
    [survivorId, removedId],
  );

  await db.query(
    `UPDATE applications s SET
       status = $2,
       notes = $3,
       applied_at = $4,
       actual_minutes = $5,
       due_at = CASE WHEN $2 = 'todo' THEN COALESCE(s.due_at, r.due_at) ELSE NULL END,
       description_html = COALESCE(s.description_html, r.description_html),
       url = COALESCE(s.url, r.url),
       company_name = COALESCE(s.company_name, r.company_name),
       title = COALESCE(s.title, r.title),
       location = COALESCE(s.location, r.location),
       status_changed_at = CASE WHEN s.status <> $2 THEN now() ELSE s.status_changed_at END,
       updated_at = now()
     FROM applications r
     WHERE s.id = $1 AND r.id = $6`,
    [survivorId, status, notes, appliedAt, actualMinutes, removedId],
  );

  if (status !== "todo") {
    // Past to-do, open application tasks close the way mark applied closes them, and
    // their reflections move to the application (R2.1b).
    await db.query(
      `WITH closed AS (
         UPDATE tasks SET
           status = 'completed',
           completed_at = COALESCE(completed_at, now()),
           updated_at = now()
         WHERE application_id = $1 AND status = 'open' AND category = 'application'
         RETURNING id
       )
       UPDATE reflection_logs SET application_id = $1, task_id = NULL
       WHERE task_id IN (SELECT id FROM closed)`,
      [survivorId],
    );
  }
  if (actualMinutes != null) {
    await db.query(
      `UPDATE tasks SET actual_minutes = $2, updated_at = now()
       WHERE application_id = $1 AND category = 'application' AND status = 'completed'`,
      [survivorId, actualMinutes],
    );
  }

  await db.query(`DELETE FROM applications WHERE id = $1`, [removedId]);
  return { status, notes, appliedAt, dueAt, descriptionHtml };
}
