import { pool } from "./db.js";
import { getBoardRefresh } from "./boardRefresh.js";
import {
  getUpcomingThisWeek,
  type HomeUpcomingThisWeek,
} from "./homeUpcoming.js";
import { getWeeklyGoalsSnapshot, type WeeklyGoalsSnapshot } from "./weeklyGoals.js";

const JOBS_LIST_BASE = `
  p.removed_from_board_at IS NULL
  AND (a.id IS NULL OR a.status = 'todo')
`;
const HAS_DESCRIPTION = `p.description_html IS NOT NULL AND btrim(p.description_html) <> ''`;

export type HomeJobPick = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  rankScore: number | null;
  rankReason: string | null;
  rankedAt: string | null;
  firstSeenAt: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
  pickKind: "top" | "newly_ranked" | "new_to_digest";
};

export type HomeDashboard = {
  greetingName: string;
  lastDigest: {
    status: string;
    finishedAt: string | null;
    lastOkAt: string | null;
    error: string | null;
  };
  newAndTopPicks: {
    topRanked: HomeJobPick[];
    newlyRanked: HomeJobPick[];
    newToDigest: HomeJobPick[];
  };
  upcomingThisWeek: HomeUpcomingThisWeek;
  weeklyGoals: WeeklyGoalsSnapshot | null;
};

type JobRow = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  rankScore: number | null;
  rankReason: string | null;
  rankedAt: string | null;
  firstSeenAt: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
};

function mapPick(row: JobRow, pickKind: HomeJobPick["pickKind"]): HomeJobPick {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    location: row.location,
    rankScore: row.rankScore,
    rankReason: row.rankReason,
    rankedAt: row.rankedAt,
    firstSeenAt: row.firstSeenAt,
    applicationId: row.applicationId,
    applicationStatus: row.applicationStatus,
    pickKind,
  };
}

const HOME_PICKS_LIMIT = 4;

async function loadJobRows(
  whereExtra: string,
  orderBy: string,
  limit = HOME_PICKS_LIMIT,
  excludeIds: string[] = [],
): Promise<JobRow[]> {
  const params: unknown[] = [];
  let excludeClause = "";
  if (excludeIds.length > 0) {
    params.push(excludeIds);
    excludeClause = `AND p.id <> ALL($${params.length}::uuid[])`;
  }
  params.push(limit);
  const limitParam = `$${params.length}`;
  const result = await pool.query<JobRow>(
    `SELECT
       p.id,
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.title,
       p.location,
       p.rank_score AS "rankScore",
       p.rank_reason AS "rankReason",
       p.ranked_at AS "rankedAt",
       p.first_seen_at AS "firstSeenAt",
       a.id AS "applicationId",
       a.status AS "applicationStatus"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}
       AND ${HAS_DESCRIPTION}
       AND p.rank_eligible IS NOT FALSE
       ${whereExtra}
       ${excludeClause}
     ORDER BY ${orderBy}
     LIMIT ${limitParam}`,
    params,
  );
  return result.rows;
}

export async function getHomeDashboard(tz: string): Promise<HomeDashboard> {
  const board = await getBoardRefresh();

  const topRankedRows = await loadJobRows(
    `AND p.ranked_at IS NOT NULL`,
    `p.rank_score DESC NULLS LAST, p.ranked_at DESC`,
    HOME_PICKS_LIMIT,
  );
  const topIds = topRankedRows.map((r) => r.id);

  const newlyRankedRows = await loadJobRows(
    `AND p.ranked_at IS NOT NULL AND p.ranked_at > now() - interval '7 days'`,
    `p.ranked_at DESC`,
    HOME_PICKS_LIMIT,
    topIds,
  );
  const excludeNew = [...topIds, ...newlyRankedRows.map((r) => r.id)];

  const newToDigestRows = await loadJobRows(
    `AND p.first_seen_at > now() - interval '14 days'`,
    `p.first_seen_at DESC`,
    HOME_PICKS_LIMIT,
    excludeNew,
  );

  const upcomingThisWeek = await getUpcomingThisWeek(pool, tz);
  const weeklyGoals = await getWeeklyGoalsSnapshot(pool, tz);

  const greetingName = process.env.DIGEST_GREETING_NAME?.trim() ?? "";

  return {
    greetingName,
    lastDigest: {
      status: board.status,
      finishedAt: board.finishedAt,
      lastOkAt: board.lastOkAt,
      error: board.error,
    },
    newAndTopPicks: {
      topRanked: topRankedRows.map((r) => mapPick(r, "top")),
      newlyRanked: newlyRankedRows.map((r) => mapPick(r, "newly_ranked")),
      newToDigest: newToDigestRows.map((r) => mapPick(r, "new_to_digest")),
    },
    upcomingThisWeek,
    weeklyGoals,
  };
}
