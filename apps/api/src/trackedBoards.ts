import type { Pool, PoolClient } from "pg";
import { pool } from "./db.js";
import type { CompanyConfig, Source } from "./types.js";

type Queryable = Pool | PoolClient;

const ATS_SOURCES: Source[] = [
  "greenhouse",
  "lever",
  "ashby",
  "oracle",
  "smartrecruiters",
];

export type TrackedBoardRow = CompanyConfig & {
  id: string;
  active: boolean;
  discoveryMethod: string | null;
};

function mapRow(row: {
  id: string;
  name: string;
  source: string;
  board_token: string;
  active: boolean;
  discovery_method: string | null;
}): TrackedBoardRow {
  return {
    id: row.id,
    name: row.name,
    source: row.source as Source,
    boardToken: row.board_token,
    active: row.active,
    discoveryMethod: row.discovery_method,
  };
}

/** Active ATS boards to ingest (excludes simplify). */
export async function listActiveTrackedBoards(
  db: Queryable = pool,
): Promise<CompanyConfig[]> {
  const { rows } = await db.query<{
    id: string;
    name: string;
    source: string;
    board_token: string;
    active: boolean;
    discovery_method: string | null;
  }>(
    `SELECT id, name, source, board_token, active, discovery_method
     FROM tracked_boards
     WHERE active = true
       AND source = ANY($1::text[])
     ORDER BY name ASC, source ASC, board_token ASC`,
    [ATS_SOURCES],
  );
  return rows.map((row) => {
    const mapped = mapRow(row);
    return {
      name: mapped.name,
      source: mapped.source,
      boardToken: mapped.boardToken,
    };
  });
}

/** Keys like greenhouse:token for Simplify hybrid coverage checks. */
export async function loadConfiguredBoardKeys(
  db: Queryable = pool,
): Promise<Set<string>> {
  const boards = await listActiveTrackedBoards(db);
  return new Set(
    boards.map((b) => `${b.source}:${b.boardToken.toLowerCase()}`),
  );
}

export async function insertTrackedBoards(
  boards: Array<CompanyConfig & { discoveryMethod?: string | null }>,
  db: Queryable = pool,
): Promise<number> {
  let inserted = 0;
  for (const board of boards) {
    if (!ATS_SOURCES.includes(board.source)) continue;
    const result = await db.query(
      `INSERT INTO tracked_boards (name, source, board_token, discovery_method)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (source, board_token) DO NOTHING`,
      [board.name, board.source, board.boardToken, board.discoveryMethod ?? null],
    );
    inserted += result.rowCount ?? 0;
  }
  return inserted;
}
