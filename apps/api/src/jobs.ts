import { pool } from "./db.js";
import { parseHttpUrl } from "./parsing.js";
import { DISPLAY_EMPLOYER_SQL } from "./rankContext.js";
import { LOCATION_FITS } from "./rankPrompt.js";

export const JOB_VIEWS = ["ranked", "mismatches", "unranked", "needs-description"] as const;
export type JobView = (typeof JOB_VIEWS)[number];

const JOBS_LIST_BASE = `
  p.removed_from_board_at IS NULL
  AND (a.id IS NULL OR a.status = 'todo')
`;

const HAS_DESCRIPTION = `p.description_html IS NOT NULL AND btrim(p.description_html) <> ''`;
const BLANK_DESCRIPTION = `(p.description_html IS NULL OR btrim(p.description_html) = '')`;

export function parseJobView(raw: string): JobView {
  if (JOB_VIEWS.includes(raw as JobView)) return raw as JobView;
  return "ranked";
}

function parseLocationFitFilter(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed === "unset") return "unset";
  if ((LOCATION_FITS as readonly string[]).includes(trimmed)) return trimmed;
  return null;
}

function jobLocationFitFilter(loc: string | null, params: unknown[]): string {
  if (!loc) return "";
  if (loc === "unset") return "AND p.rank_location_fit IS NULL";
  params.push(loc);
  return `AND p.rank_location_fit = $${params.length}`;
}

function jobViewFilter(view: JobView): string {
  switch (view) {
    case "mismatches":
      return `AND p.rank_eligible IS FALSE`;
    case "unranked":
      return `AND ${HAS_DESCRIPTION} AND p.ranked_at IS NULL AND p.rank_eligible IS NOT FALSE`;
    case "needs-description":
      return `AND ${BLANK_DESCRIPTION} AND p.rank_eligible IS NOT FALSE`;
    default:
      return `AND ${HAS_DESCRIPTION} AND p.ranked_at IS NOT NULL AND p.rank_eligible IS NOT FALSE`;
  }
}

async function jobRankedLocationCounts(q: string): Promise<Record<string, number>> {
  const params: unknown[] = [];
  let search = "";
  if (q) {
    params.push(`%${q}%`);
    search = `AND (
      p.title ILIKE $1
      OR c.name ILIKE $1
      OR COALESCE(p.department, '') ILIKE $1
      OR COALESCE(p.location, '') ILIKE $1
    )`;
  }
  const result = await pool.query<{ fit: string; count: number }>(
    `SELECT
       COALESCE(p.rank_location_fit, 'unset') AS fit,
       COUNT(*)::int AS count
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}
       ${jobViewFilter("ranked")}
       ${search}
     GROUP BY COALESCE(p.rank_location_fit, 'unset')`,
    params,
  );
  const counts: Record<string, number> = {};
  for (const row of result.rows) {
    counts[row.fit] = row.count;
  }
  return counts;
}

async function jobTabCounts(): Promise<Record<JobView, number>> {
  const result = await pool.query<{
    ranked: string;
    mismatches: string;
    unranked: string;
    needs_description: string;
  }>(
    `SELECT
       COUNT(*) FILTER (
         WHERE ${HAS_DESCRIPTION}
           AND p.ranked_at IS NOT NULL
           AND p.rank_eligible IS NOT FALSE
       )::text AS ranked,
       COUNT(*) FILTER (
         WHERE p.rank_eligible IS FALSE
       )::text AS mismatches,
       COUNT(*) FILTER (
         WHERE ${HAS_DESCRIPTION}
           AND p.ranked_at IS NULL
           AND p.rank_eligible IS NOT FALSE
       )::text AS unranked,
       COUNT(*) FILTER (
         WHERE ${BLANK_DESCRIPTION} AND p.rank_eligible IS NOT FALSE
       )::text AS needs_description
     FROM postings p
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}`,
  );
  const row = result.rows[0];
  return {
    ranked: Number(row?.ranked ?? 0) || 0,
    mismatches: Number(row?.mismatches ?? 0) || 0,
    unranked: Number(row?.unranked ?? 0) || 0,
    "needs-description": Number(row?.needs_description ?? 0) || 0,
  };
}

export type ListJobsParams = {
  q?: string;
  view?: string;
  sort?: string;
  pageSize?: unknown;
  page?: unknown;
  loc?: string;
};

export async function listJobs(params: ListJobsParams): Promise<{
  count: number;
  page: number;
  pageSize: number;
  view: JobView;
  counts: Record<JobView, number>;
  locationCounts?: Record<string, number>;
  jobs: Record<string, unknown>[];
}> {
  const q = String(params.q ?? "").trim();
  const view = parseJobView(String(params.view ?? "ranked"));
  const sortKey = String(params.sort ?? "rank");
  const sort =
    sortKey === "published" || sortKey === "updated" ? sortKey : "rank";
  const pageSize = Math.min(100, Math.max(1, Number(params.pageSize) || 25));
  const page = Math.max(1, Number(params.page) || 1);
  const offset = (page - 1) * pageSize;
  const locationFit =
    view === "ranked" ? parseLocationFitFilter(String(params.loc ?? "")) : null;
  const queryParams: unknown[] = [];
  let search = "";
  if (q) {
    queryParams.push(`%${q}%`);
    search = `AND (
      p.title ILIKE $1
      OR c.name ILIKE $1
      OR COALESCE(p.department, '') ILIKE $1
      OR COALESCE(p.location, '') ILIKE $1
    )`;
  }
  const locationFilterSql = jobLocationFitFilter(locationFit, queryParams);
  const effectiveSort = view === "ranked" ? sort : sort === "rank" ? "published" : sort;
  const orderBy =
    effectiveSort === "published"
      ? "p.first_published_at DESC NULLS LAST, p.first_seen_at DESC"
      : effectiveSort === "updated"
        ? "COALESCE(p.source_updated_at, p.first_published_at) DESC NULLS LAST, p.last_seen_at DESC"
        : "p.rank_score DESC NULLS LAST, p.last_seen_at DESC";
  queryParams.push(pageSize, offset);
  const limitPh = `$${queryParams.length - 1}`;
  const offsetPh = `$${queryParams.length}`;

  const result = await pool.query(
    `SELECT
       p.id,
       p.source,
       p.external_id AS "externalId",
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.title,
       p.location,
       p.department,
       p.url,
       p.first_published_at AS "firstPublishedAt",
       p.source_updated_at AS "sourceUpdatedAt",
       p.first_seen_at AS "firstSeenAt",
       p.last_seen_at AS "lastSeenAt",
       p.rank_score AS "rankScore",
       p.rank_eligible AS "rankEligible",
       p.rank_reason AS "rankReason",
       p.rank_location_fit AS "rankLocationFit",
       p.scrape_status AS "scrapeStatus",
       a.id AS "applicationId",
       a.status AS "applicationStatus",
       EXISTS (
         SELECT 1 FROM tasks t
         WHERE t.posting_id = p.id
           AND t.status = 'open'
           AND t.category = 'application'
       ) AS "onTasks",
       f.kind AS "feedbackKind",
       COUNT(*) OVER()::int AS "totalCount"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     LEFT JOIN posting_feedback f ON f.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}
       ${jobViewFilter(view)}
       ${search}
       ${locationFilterSql}
     ORDER BY
       ${orderBy}
     LIMIT ${limitPh} OFFSET ${offsetPh}`,
    queryParams,
  );
  const count = result.rows[0]?.totalCount ?? 0;
  const jobs = result.rows.map(({ totalCount: _total, ...job }) => job);
  const counts = await jobTabCounts();
  const locationCounts = view === "ranked" ? await jobRankedLocationCounts(q) : undefined;
  return { count, page, pageSize, view, counts, locationCounts, jobs };
}

export async function getJobById(id: string): Promise<Record<string, unknown> | null> {
  const result = await pool.query(
    `SELECT
       p.id,
       p.source,
       p.external_id AS "externalId",
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.title,
       p.location,
       p.department,
       p.url,
       p.description_html AS "descriptionHtml",
       p.first_published_at AS "firstPublishedAt",
       p.source_updated_at AS "sourceUpdatedAt",
       p.first_seen_at AS "firstSeenAt",
       p.last_seen_at AS "lastSeenAt",
       p.rank_score AS "rankScore",
       p.rank_eligible AS "rankEligible",
       p.rank_reason AS "rankReason",
       p.rank_location_fit AS "rankLocationFit",
       a.id AS "applicationId",
       a.status AS "applicationStatus",
       EXISTS (
         SELECT 1 FROM tasks t
         WHERE t.posting_id = p.id
           AND t.status = 'open'
           AND t.category = 'application'
       ) AS "onTasks",
       a.notes AS "applicationNotes",
       f.kind AS "feedbackKind",
       f.note AS "feedbackNote"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     LEFT JOIN posting_feedback f ON f.posting_id = p.id
     WHERE p.id = $1`,
    [id],
  );
  return result.rows[0] ?? null;
}

export async function patchJobUrl(
  id: string,
  url: string,
): Promise<{ id: string; url: string } | null> {
  const validated = parseHttpUrl(url);
  if (!validated) throw new Error("Invalid URL — use http:// or https://");
  const updated = await pool.query<{ id: string }>(
    `UPDATE postings SET url = $2 WHERE id = $1 RETURNING id`,
    [id, validated],
  );
  if (!updated.rows[0]) return null;
  return { id: updated.rows[0].id, url: validated };
}

export type JobFeedbackRow = {
  id: string;
  kind: string;
  note: string | null;
  teach: boolean;
};

export async function upsertJobFeedback(
  id: string,
  kind: string,
  note: string | null,
  teach = true,
): Promise<JobFeedbackRow> {
  if (kind !== "like" && kind !== "dismiss") {
    throw new Error("kind must be like or dismiss");
  }
  const posting = await pool.query(`SELECT id FROM postings WHERE id = $1`, [id]);
  if (!posting.rows[0]) {
    throw new Error("Job not found");
  }
  const teaching = kind === "dismiss" ? teach : true;
  const storedNote = teaching ? note : null;
  const inserted = await pool.query<JobFeedbackRow>(
    `INSERT INTO posting_feedback (posting_id, kind, note, teach)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (posting_id) DO UPDATE SET
       kind = EXCLUDED.kind,
       note = EXCLUDED.note,
       teach = EXCLUDED.teach,
       created_at = now()
     RETURNING id, kind, note, teach`,
    [id, kind, storedNote, teaching],
  );
  if (kind === "dismiss") {
    await pool.query(
      `UPDATE postings
       SET rank_eligible = false
       WHERE id = $1`,
      [id],
    );
  }
  return inserted.rows[0]!;
}

export async function deleteJobFeedback(id: string): Promise<boolean> {
  const result = await pool.query(
    `DELETE FROM posting_feedback WHERE posting_id = $1 RETURNING id`,
    [id],
  );
  return Boolean(result.rows[0]);
}

export type BoardSibling = {
  id: string;
  title: string;
  company: string;
  feedbackKind: string | null;
};

const RANKED_ON_BOARD = `
  p.removed_from_board_at IS NULL
  AND ${HAS_DESCRIPTION}
  AND p.ranked_at IS NOT NULL
  AND p.rank_eligible IS NOT FALSE
  AND (a.id IS NULL OR a.status = 'todo')
`;

export async function listRankedBoardSiblings(id: string): Promise<{
  employer: string;
  jobs: BoardSibling[];
}> {
  const anchor = await pool.query<{ employer: string | null }>(
    `SELECT ${DISPLAY_EMPLOYER_SQL} AS employer
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.id = $1`,
    [id],
  );
  const employer = anchor.rows[0]?.employer?.trim() || null;
  if (!employer) {
    throw new Error("Job not found");
  }

  const { rows } = await pool.query<BoardSibling>(
    `SELECT
       p.id,
       p.title,
       ${DISPLAY_EMPLOYER_SQL} AS company,
       f.kind AS "feedbackKind"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     LEFT JOIN posting_feedback f ON f.posting_id = p.id
     WHERE ${RANKED_ON_BOARD}
       AND ${DISPLAY_EMPLOYER_SQL} = $1
     ORDER BY p.rank_score DESC NULLS LAST, p.title ASC`,
    [employer],
  );

  return { employer, jobs: rows };
}

export async function hideFromBoard(postingIds: string[]): Promise<{ hidden: number }> {
  const ids = [...new Set(postingIds.map((id) => id.trim()).filter(Boolean))];
  if (ids.length === 0) {
    throw new Error("postingIds required");
  }

  const { rows } = await pool.query<{
    id: string;
    employer: string | null;
  }>(
    `SELECT
       p.id,
       ${DISPLAY_EMPLOYER_SQL} AS employer
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE p.id = ANY($1::uuid[])
       AND ${RANKED_ON_BOARD}`,
    [ids],
  );

  if (rows.length !== ids.length) {
    throw new Error("One or more jobs are not on the ranked board");
  }
  const employers = new Set(rows.map((row) => row.employer?.trim() || ""));
  if (employers.size !== 1 || [...employers][0] === "") {
    throw new Error("All roles must share the same display employer");
  }

  for (const id of ids) {
    await upsertJobFeedback(id, "dismiss", null, false);
  }
  return { hidden: ids.length };
}

export async function assertJobRerankable(id: string): Promise<void> {
  const posting = await pool.query<{ id: string; rank_eligible: boolean | null }>(
    `SELECT id, rank_eligible FROM postings WHERE id = $1 AND removed_from_board_at IS NULL`,
    [id],
  );
  if (!posting.rows[0]) {
    throw new Error("Job not found");
  }
  if (posting.rows[0].rank_eligible !== false) {
    throw new Error("Only mismatch postings can be reranked");
  }
}
