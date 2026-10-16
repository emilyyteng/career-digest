/**
 * Board departures log writes and day-boundary purge (F08 M6-01 / R6.1–R6.7).
 * Purge runs from ingest / merge jobs only — never on read (R6.7).
 */
import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

const COMPANY_DISPLAY = `COALESCE(
  CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
  c.name
)`;

/**
 * Keep rows whose UTC calendar day is today or yesterday; drop older.
 * Call at the start of ingest and merge-duplicate jobs (not from GET).
 */
export async function purgeExpiredBoardDepartures(db: Queryable): Promise<number> {
  const result = await db.query(
    `DELETE FROM board_departures
     WHERE departed_on < ((now() AT TIME ZONE 'UTC')::date - 1)`,
  );
  return result.rowCount ?? 0;
}

/**
 * Snapshot board-gone deletes before todo cleanup / posting delete.
 * Skips applied+ (any non-todo application). Sets task_removed from open
 * application tasks that clearTodoPipeline will delete.
 */
export async function recordLeftBoardDepartures(
  db: Queryable,
  companyId: string,
  seenExternalIds: string[],
): Promise<number> {
  const result = await db.query(
    `INSERT INTO board_departures (
       posting_id, title, company, location, reason, task_removed
     )
     SELECT
       p.id,
       p.title,
       ${COMPANY_DISPLAY},
       p.location,
       'left_board',
       EXISTS (
         SELECT 1 FROM tasks t
         WHERE t.status = 'open'
           AND t.category = 'application'
           AND (
             t.posting_id = p.id
             OR t.application_id IN (
               SELECT a.id FROM applications a
               WHERE a.posting_id = p.id AND a.status = 'todo'
             )
           )
       )
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.company_id = $1
       AND NOT (p.external_id = ANY($2::text[]))
       AND NOT EXISTS (
         SELECT 1 FROM applications a
         WHERE a.posting_id = p.id AND a.status <> 'todo'
       )`,
    [companyId, seenExternalIds],
  );
  return result.rowCount ?? 0;
}

/**
 * Snapshot a Simplify row about to be deleted as a duplicate.
 * Skips when the Simplify posting already has an applied+ application (R6.6).
 * task_removed is always false: merge only repoints open tasks (R6.6).
 */
export async function recordDuplicateDeparture(
  db: Queryable,
  simplifyPostingId: string,
): Promise<boolean> {
  const result = await db.query(
    `INSERT INTO board_departures (
       posting_id, title, company, location, reason, task_removed
     )
     SELECT
       p.id,
       p.title,
       ${COMPANY_DISPLAY},
       p.location,
       'duplicate',
       false
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.id = $1
       AND NOT EXISTS (
         SELECT 1 FROM applications a
         WHERE a.posting_id = p.id AND a.status <> 'todo'
       )`,
    [simplifyPostingId],
  );
  return (result.rowCount ?? 0) > 0;
}
