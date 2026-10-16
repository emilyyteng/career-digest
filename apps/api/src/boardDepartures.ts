/**
 * Board departures log writes, day-boundary purge, and read model
 * (F08 M6-01 / M6-02 / R6.1–R6.7). Purge runs from ingest / merge only — never on read.
 */
import type { Pool, PoolClient } from "pg";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";

type Queryable = Pool | PoolClient;

export type BoardDepartureReason = "left_board" | "duplicate";

export const BOARD_DEPARTURE_REASON_LABEL: Record<BoardDepartureReason, string> = {
  left_board: "Left board",
  duplicate: "Duplicate",
};

export type BoardDepartureRow = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  reason: BoardDepartureReason;
  reasonLabel: string;
  taskRemoved: boolean;
  departedAt: string;
};

export type BoardDepartureDay = {
  date: string;
  taskRemovedCount: number;
  rows: BoardDepartureRow[];
};

export type BoardDeparturesSnapshot = {
  tz: string;
  localDate: string;
  days: BoardDepartureDay[];
};

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

/**
 * Read model for Status (M6-02). Groups by browser-local day; keeps today +
 * yesterday in that TZ. Does not purge.
 */
export async function getBoardDeparturesSnapshot(
  db: Queryable,
  tz: string,
): Promise<BoardDeparturesSnapshot> {
  const localDate = localDateInTimezone(new Date(), tz);
  const keepFrom = addCivilDays(localDate, -1);

  const { rows } = await db.query<{
    id: string;
    title: string;
    company: string;
    location: string | null;
    reason: BoardDepartureReason;
    task_removed: boolean;
    departed_at: Date;
    local_day: string;
  }>(
    `SELECT
       id,
       title,
       company,
       location,
       reason,
       task_removed,
       departed_at,
       ((departed_at AT TIME ZONE $1)::date)::text AS local_day
     FROM board_departures
     WHERE ((departed_at AT TIME ZONE $1)::date) >= $2::date
     ORDER BY local_day DESC, departed_at DESC, id DESC`,
    [tz, keepFrom],
  );

  const byDay = new Map<string, BoardDepartureRow[]>();
  for (const row of rows) {
    const list = byDay.get(row.local_day) ?? [];
    list.push({
      id: row.id,
      title: row.title,
      company: row.company,
      location: row.location,
      reason: row.reason,
      reasonLabel: BOARD_DEPARTURE_REASON_LABEL[row.reason],
      taskRemoved: row.task_removed,
      departedAt: row.departed_at.toISOString(),
    });
    byDay.set(row.local_day, list);
  }

  const days: BoardDepartureDay[] = [...byDay.entries()].map(([date, dayRows]) => ({
    date,
    taskRemovedCount: dayRows.filter((r) => r.taskRemoved).length,
    rows: dayRows,
  }));

  return { tz, localDate, days };
}
