import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { getBoardRefresh, startBoardRefresh } from "./boardRefresh.js";
import { getBackupJob, startBackupJob } from "./backupJob.js";
import { getLiveRankBacklogJob, startLiveRankBacklogJob } from "./liveRankBacklogJob.js";
import { pool } from "./db.js";
import { normalizeDescriptionHtml } from "./descriptionFromHtml.js";
import { getHomeDashboard } from "./home.js";
import { getOpsStatus } from "./opsStatus.js";
import { getRankBatchStatus } from "./rankBatchStatus.js";
import { LOCATION_FITS } from "./rankPrompt.js";
import { getRerankQueueSnapshot, queueRerank } from "./rankRerankQueue.js";
import {
  APPLICATION_STATUSES,
  isApplicationStatus,
  isLegacyApplicationBacklogStatus,
  normalizeApplicationStatus,
} from "./statuses.js";
import {
  addInterviewStep,
  applicationResolutionFromStatus,
  addThreadMembers,
  createInterviewThread,
  getInterviewThread,
  listInterviewThreads,
  listPickerApplications,
  patchInterviewStep,
  patchInterviewThread,
  resolveThreadsForApplication,
} from "./interviews.js";
import {
  completeTask,
  createTask,
  createTaskFromPosting,
  deleteTask,
  deleteTaskByPostingId,
  isTaskView,
  listTasks,
  parseCreateTaskBody,
  parsePatchTaskBody,
  patchTask,
  reopenTask,
} from "./tasks.js";
import {
  createReflectionLog,
  getProgressDay,
  getProgressHeatmap,
  getProgressOutcome,
  getProgressToday,
  isProgressLane,
  isProgressPeriod,
  parseAnchorDate,
  parseLocalDate,
  resolveTimezone,
  setLeetcodeDaily,
  updateReflectionLog,
} from "./progress.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const uploadDir = path.join(root, "data/uploads");

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, _file, cb) => cb(null, randomUUID()),
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
});

const applicationSelect = `
  SELECT
    a.id,
    a.posting_id AS "postingId",
    a.status,
    a.notes,
    a.applied_at AS "appliedAt",
    a.due_at AS "dueAt",
    a.status_changed_at AS "statusChangedAt",
    a.created_at AS "createdAt",
    a.updated_at AS "updatedAt",
    COALESCE(
      a.company_name,
      CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
      c.name
    ) AS company,
    COALESCE(a.title, p.title) AS title,
    COALESCE(a.location, p.location) AS location,
    COALESCE(a.url, p.url) AS url,
    p.source,
    p.first_published_at AS "firstPublishedAt",
    p.source_updated_at AS "sourceUpdatedAt",
    COALESCE(a.description_html, p.description_html) AS "descriptionHtml"
  FROM applications a
  LEFT JOIN postings p ON p.id = a.posting_id
  LEFT JOIN companies c ON c.id = p.company_id
`;

/** Parse YYYY-MM-DD as local noon, or accept full ISO. */
function parseAppliedAt(value: unknown): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value.trim());
  if (day) {
    return new Date(
      Number(day[1]),
      Number(day[2]) - 1,
      Number(day[3]),
      12,
      0,
      0,
    );
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseDueAt(value: unknown): Date | null {
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function parseHttpUrl(value: unknown, opts?: { allowEmpty?: boolean }): string | null {
  if (value === null || value === "") {
    return opts?.allowEmpty ? null : null;
  }
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return opts?.allowEmpty ? null : null;
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return trimmed;
  } catch {
    return null;
  }
}

function resolveAppliedAt(opts: {
  status: string;
  previousAppliedAt?: Date | string | null;
  explicit?: unknown;
  explicitProvided: boolean;
}): Date | null {
  if (opts.status === "todo") return null;
  if (opts.explicitProvided) return parseAppliedAt(opts.explicit);
  if (opts.previousAppliedAt) {
    return opts.previousAppliedAt instanceof Date
      ? opts.previousAppliedAt
      : new Date(opts.previousAppliedAt);
  }
  if (
    opts.status === "applied" ||
    opts.status === "interviewing" ||
    opts.status === "accepted"
  ) {
    return new Date();
  }
  return null;
}

export const api = express.Router();

api.get("/board/refresh", async (_req, res) => {
  res.json(await getBoardRefresh());
});

api.post("/board/refresh", async (_req, res) => {
  const result = await startBoardRefresh();
  res.status(result.started ? 202 : 409).json(result.snapshot);
});

api.get("/backup", async (_req, res) => {
  res.json(await getBackupJob());
});

api.post("/backup", async (_req, res) => {
  const result = await startBackupJob();
  res.status(result.started ? 202 : 409).json(result.snapshot);
});

api.get("/rank/live-backlog", async (_req, res) => {
  res.json(await getLiveRankBacklogJob());
});

api.post("/rank/live-backlog", async (_req, res) => {
  const result = await startLiveRankBacklogJob();
  res.status(result.started ? 202 : 409).json(result.snapshot);
});

api.get("/rank/batch", async (_req, res) => {
  res.json(await getRankBatchStatus());
});

api.get("/ops", async (_req, res) => {
  res.json(await getOpsStatus());
});

api.get("/home", async (_req, res) => {
  res.json(await getHomeDashboard());
});

api.get("/jobs/rerank-queue", async (_req, res) => {
  res.json(getRerankQueueSnapshot());
});

const JOB_VIEWS = ["ranked", "mismatches", "unranked", "needs-description"] as const;
type JobView = (typeof JOB_VIEWS)[number];

function parseJobView(raw: string): JobView {
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

const JOBS_LIST_BASE = `
  p.removed_from_board_at IS NULL
  AND (a.id IS NULL OR a.status = 'todo')
`;

const HAS_DESCRIPTION = `p.description_html IS NOT NULL AND btrim(p.description_html) <> ''`;
const BLANK_DESCRIPTION = `(p.description_html IS NULL OR btrim(p.description_html) = '')`;

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

api.get("/jobs", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const view = parseJobView(String(req.query.view ?? "ranked"));
  const sortKey = String(req.query.sort ?? "rank");
  const sort =
    sortKey === "published" || sortKey === "updated" ? sortKey : "rank";
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * pageSize;
  const locationFit =
    view === "ranked" ? parseLocationFitFilter(String(req.query.loc ?? "")) : null;
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
  const locationFilterSql = jobLocationFitFilter(locationFit, params);
  const effectiveSort = view === "ranked" ? sort : sort === "rank" ? "published" : sort;
  const orderBy =
    effectiveSort === "published"
      ? "p.first_published_at DESC NULLS LAST, p.first_seen_at DESC"
      : effectiveSort === "updated"
        ? "COALESCE(p.source_updated_at, p.first_published_at) DESC NULLS LAST, p.last_seen_at DESC"
        : "p.rank_score DESC NULLS LAST, p.last_seen_at DESC";
  params.push(pageSize, offset);
  const limitPh = `$${params.length - 1}`;
  const offsetPh = `$${params.length}`;

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
    params,
  );
  const count = result.rows[0]?.totalCount ?? 0;
  const jobs = result.rows.map(({ totalCount: _total, ...job }) => job);
  const counts = await jobTabCounts();
  const locationCounts = view === "ranked" ? await jobRankedLocationCounts(q) : undefined;
  res.json({ count, page, pageSize, view, counts, locationCounts, jobs });
});

api.get("/jobs/:id", async (req, res) => {
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
    [req.params.id],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(result.rows[0]);
});

api.patch("/jobs/:id", async (req, res) => {
  const body = req.body as { url?: string };
  if (!Object.prototype.hasOwnProperty.call(body, "url")) {
    res.status(400).json({ error: "url is required" });
    return;
  }
  const url = parseHttpUrl(body.url);
  if (!url) {
    res.status(400).json({ error: "Invalid URL — use http:// or https://" });
    return;
  }
  const updated = await pool.query(
    `UPDATE postings SET url = $2 WHERE id = $1 RETURNING id`,
    [req.params.id, url],
  );
  if (!updated.rows[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json({ id: updated.rows[0].id, url });
});

api.post("/jobs/:id/feedback", async (req, res) => {
  const kind = String((req.body as { kind?: string }).kind ?? "");
  const note = String((req.body as { note?: string }).note ?? "").trim() || null;
  if (kind !== "like" && kind !== "dismiss") {
    res.status(400).json({ error: "kind must be like or dismiss" });
    return;
  }
  const posting = await pool.query(`SELECT id FROM postings WHERE id = $1`, [req.params.id]);
  if (!posting.rows[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  const inserted = await pool.query(
    `INSERT INTO posting_feedback (posting_id, kind, note)
     VALUES ($1, $2, $3)
     ON CONFLICT (posting_id) DO UPDATE SET
       kind = EXCLUDED.kind,
       note = EXCLUDED.note,
       created_at = now()
     RETURNING id, kind, note`,
    [req.params.id, kind, note],
  );
  if (kind === "dismiss") {
    await pool.query(
      `UPDATE postings
       SET rank_eligible = false
       WHERE id = $1`,
      [req.params.id],
    );
  }
  res.status(201).json(inserted.rows[0]);
});

api.post("/jobs/:id/rerank", async (req, res) => {
  const note = String((req.body as { note?: string }).note ?? "").trim();
  if (!note) {
    res.status(400).json({ error: "note is required" });
    return;
  }
  const posting = await pool.query(
    `SELECT id, rank_eligible FROM postings WHERE id = $1 AND removed_from_board_at IS NULL`,
    [req.params.id],
  );
  if (!posting.rows[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  if (posting.rows[0].rank_eligible !== false) {
    res.status(400).json({ error: "Only mismatch postings can be reranked" });
    return;
  }
  try {
    const result = queueRerank(req.params.id, note);
    res.status(result.alreadyQueued ? 409 : 202).json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(400).json({ error: message });
  }
});

api.delete("/jobs/:id/feedback", async (req, res) => {
  const result = await pool.query(
    `DELETE FROM posting_feedback WHERE posting_id = $1 RETURNING id`,
    [req.params.id],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "No feedback on this job" });
    return;
  }
  res.json({ ok: true });
});

api.get("/applications", async (req, res) => {
  const status = String(req.query.status ?? "all");
  if (isLegacyApplicationBacklogStatus(status)) {
    res.status(400).json({ error: "Use Tasks for apply backlog" });
    return;
  }
  const params: unknown[] = [];
  let where = "WHERE a.status <> 'todo'";
  if (status !== "all") {
    if (!isApplicationStatus(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    params.push(normalizeApplicationStatus(status));
    where = "WHERE a.status = $1";
  }
  const orderBy =
    status === "all"
      ? `ORDER BY
           CASE a.status
             WHEN 'interviewing' THEN 0
             WHEN 'applied' THEN 1
             WHEN 'accepted' THEN 2
             WHEN 'declined' THEN 3
             ELSE 4
           END,
           a.applied_at DESC NULLS LAST,
           a.created_at DESC`
      : `ORDER BY a.applied_at DESC NULLS LAST, a.created_at DESC`;
  const result = await pool.query(
    `${applicationSelect} ${where} ${orderBy}`,
    params,
  );
  const countsResult = await pool.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM applications
     WHERE status <> 'todo'
     GROUP BY status`,
  );
  const counts: Record<string, number> = {
    all: 0,
    applied: 0,
    interviewing: 0,
    accepted: 0,
    declined: 0,
  };
  for (const row of countsResult.rows) {
    const n = Number(row.count) || 0;
    if (row.status in counts) counts[row.status] = n;
    counts.all += n;
  }
  res.json({ count: result.rows.length, counts, applications: result.rows });
});

api.get("/applications/locations", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const params: unknown[] = [];
  let filter = "";
  if (q) {
    params.push(`%${q}%`);
    filter = `AND loc ILIKE $1`;
  }
  const result = await pool.query<{ location: string }>(
    `SELECT loc AS location
     FROM (
       SELECT DISTINCT btrim(COALESCE(a.location, p.location)) AS loc
       FROM applications a
       LEFT JOIN postings p ON p.id = a.posting_id
     ) locations
     WHERE loc IS NOT NULL AND loc <> ''
       ${filter}
     ORDER BY loc ASC
     LIMIT 20`,
    params,
  );
  res.json({ locations: result.rows.map((row) => row.location) });
});

api.get("/applications/:id", async (req, res) => {
  const result = await pool.query(`${applicationSelect} WHERE a.id = $1`, [
    req.params.id,
  ]);
  if (!result.rows[0]) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const docs = await pool.query(
    `SELECT id, original_name AS "originalName", mime_type AS "mimeType", created_at AS "createdAt"
     FROM application_documents WHERE application_id = $1 ORDER BY created_at`,
    [req.params.id],
  );
  res.json({ ...result.rows[0], documents: docs.rows });
});

api.post("/applications", async (req, res) => {
  const body = req.body as {
    postingId?: string;
    status?: string;
    notes?: string;
    company?: string;
    title?: string;
    location?: string;
    url?: string;
    description?: string;
    descriptionHtml?: string;
    appliedAt?: string | null;
    dueAt?: string | null;
  };
  if (body.status && isLegacyApplicationBacklogStatus(body.status)) {
    res.status(400).json({ error: "Use Tasks for apply backlog" });
    return;
  }
  const status = normalizeApplicationStatus(body.status ?? "applied");
  if (!isApplicationStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const explicitProvided = Object.prototype.hasOwnProperty.call(body, "appliedAt");
  const appliedAt = resolveAppliedAt({
    status,
    explicit: body.appliedAt,
    explicitProvided,
  });
  const dueAt = null;

  if (body.postingId) {
    const inserted = await pool.query(
      `INSERT INTO applications (posting_id, status, notes, applied_at, due_at, status_changed_at)
       VALUES ($1, $2, $3, $4, $5, now())
       ON CONFLICT (posting_id) DO UPDATE SET
         status = EXCLUDED.status,
         notes = COALESCE(EXCLUDED.notes, applications.notes),
         applied_at = CASE
           WHEN EXCLUDED.status = 'todo' THEN NULL
           WHEN EXCLUDED.applied_at IS NOT NULL THEN EXCLUDED.applied_at
           WHEN applications.applied_at IS NOT NULL THEN applications.applied_at
           WHEN EXCLUDED.status IN ('applied', 'interviewing', 'accepted') THEN now()
           ELSE applications.applied_at
         END,
         due_at = CASE
           WHEN EXCLUDED.status <> 'todo' THEN NULL
           ELSE EXCLUDED.due_at
         END,
         status_changed_at = CASE
           WHEN applications.status IS DISTINCT FROM EXCLUDED.status THEN now()
           ELSE applications.status_changed_at
         END,
         updated_at = now()
       RETURNING id`,
      [body.postingId, status, body.notes ?? null, appliedAt, dueAt],
    );
    res.status(201).json({ id: inserted.rows[0].id });
    return;
  }

  if (!body.company?.trim() || !body.title?.trim()) {
    res.status(400).json({ error: "Manual applications need company and title" });
    return;
  }
  const descriptionHtml = normalizeDescriptionHtml(
    body.descriptionHtml,
    body.description,
  );
  const inserted = await pool.query(
    `INSERT INTO applications (
       status, notes, company_name, title, location, url, description_html, applied_at, due_at, status_changed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     RETURNING id`,
    [
      status,
      body.notes ?? null,
      body.company.trim(),
      body.title.trim(),
      body.location?.trim() || null,
      body.url?.trim() || null,
      descriptionHtml,
      appliedAt,
      dueAt,
    ],
  );
  res.status(201).json({ id: inserted.rows[0].id });
});

const STATUS_RANK: Record<string, number> = {
  todo: 0,
  applied: 1,
  interviewing: 2,
  accepted: 3,
  declined: 1,
};

function mergeNotes(a: string | null, b: string | null): string | null {
  const parts = [a?.trim(), b?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return [...new Set(parts)].join("\n\n");
}

api.patch("/applications/:id", async (req, res) => {
  const body = req.body as {
    status?: string;
    notes?: string;
    postingId?: string | null;
    appliedAt?: string | null;
    dueAt?: string | null;
    url?: string | null;
    description?: string;
    descriptionHtml?: string | null;
  };
  if (body.status && isLegacyApplicationBacklogStatus(body.status)) {
    res.status(400).json({ error: "Use Tasks for apply backlog" });
    return;
  }
  if (body.status && !isApplicationStatus(body.status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      id: string;
      notes: string | null;
      status: string;
      applied_at: Date | null;
      due_at: Date | null;
      description_html: string | null;
      status_changed_at: Date;
    }>(
      `SELECT id, notes, status, applied_at, due_at, description_html, status_changed_at
       FROM applications WHERE id = $1`,
      [req.params.id],
    );
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Application not found" });
      return;
    }

    const previousStatus = current.rows[0].status;
    let notes = body.notes !== undefined ? body.notes : current.rows[0].notes;
    let status = body.status ? normalizeApplicationStatus(body.status) : previousStatus;
    const explicitProvided = Object.prototype.hasOwnProperty.call(body, "appliedAt");
    const dueProvided = Object.prototype.hasOwnProperty.call(body, "dueAt");
    const urlProvided = Object.prototype.hasOwnProperty.call(body, "url");
    if (urlProvided && body.url != null && String(body.url).trim() && !parseHttpUrl(body.url, { allowEmpty: true })) {
      await client.query("ROLLBACK");
      res.status(400).json({ error: "Invalid URL — use http:// or https://" });
      return;
    }
    const urlFinal = urlProvided ? parseHttpUrl(body.url, { allowEmpty: true }) : undefined;

    let descriptionHtml = current.rows[0].description_html;
    if (body.descriptionHtml !== undefined) {
      descriptionHtml = normalizeDescriptionHtml(body.descriptionHtml);
    } else if (body.description !== undefined) {
      descriptionHtml = normalizeDescriptionHtml(null, body.description);
    }

    if (body.postingId) {
      const other = await client.query<{
        id: string;
        notes: string | null;
        status: string;
        applied_at: Date | null;
      }>(
        `SELECT id, notes, status, applied_at FROM applications WHERE posting_id = $1 AND id <> $2`,
        [body.postingId, req.params.id],
      );
      if (other.rows[0]) {
        notes = body.notes !== undefined ? body.notes : mergeNotes(notes, other.rows[0].notes);
        if (!body.status) {
          const keepRank = STATUS_RANK[status] ?? 0;
          const otherRank = STATUS_RANK[other.rows[0].status] ?? 0;
          if (otherRank > keepRank) status = other.rows[0].status;
        }
        await client.query(
          `UPDATE application_documents SET application_id = $1 WHERE application_id = $2`,
          [req.params.id, other.rows[0].id],
        );
        await client.query(`DELETE FROM applications WHERE id = $1`, [other.rows[0].id]);
      }
    }

    // Recompute applied_at if merge changed status without explicit appliedAt
    const appliedAtFinal = resolveAppliedAt({
      status,
      previousAppliedAt: current.rows[0].applied_at,
      explicit: body.appliedAt,
      explicitProvided,
    });
    const dueAtFinal =
      status !== "todo"
        ? null
        : dueProvided
          ? parseDueAt(body.dueAt)
          : current.rows[0].due_at;
    const statusChanged = status !== previousStatus;

    const result = await client.query(
      `UPDATE applications SET
         status = $2,
         notes = $3,
         applied_at = $4,
         due_at = $5,
         description_html = $6,
         url = CASE WHEN $10::boolean THEN $11 ELSE url END,
         posting_id = CASE WHEN $7::boolean THEN $8::uuid ELSE posting_id END,
         status_changed_at = CASE WHEN $9::boolean THEN now() ELSE status_changed_at END,
         updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        req.params.id,
        status,
        notes,
        appliedAtFinal,
        dueAtFinal,
        descriptionHtml,
        body.postingId !== undefined,
        body.postingId ?? null,
        statusChanged,
        urlProvided,
        urlFinal,
      ],
    );
    const resolution = applicationResolutionFromStatus(status);
    if (statusChanged && resolution) {
      await resolveThreadsForApplication(client, req.params.id, resolution);
    }
    await client.query("COMMIT");
    res.json({ id: result.rows[0].id });
  } catch (error) {
    await client.query("ROLLBACK");
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      res.status(409).json({ error: "That posting is already linked to an application" });
      return;
    }
    throw error;
  } finally {
    client.release();
  }
});

api.get("/interviews/picker-applications", async (_req, res) => {
  try {
    const applications = await listPickerApplications(pool);
    res.json({ applications });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bad request" });
  }
});

api.get("/interviews", async (req, res) => {
  const view = req.query.view === "past" ? "past" : "active";
  const data = await listInterviewThreads(pool, view);
  res.json(data);
});

api.post("/interviews", async (req, res) => {
  try {
    const body = req.body as {
      applicationIds?: string[];
      primaryApplicationId?: string;
      label?: string | null;
      step?: {
        kind?: string;
        title?: string;
        status?: string;
        dueAt?: string | null;
        scheduledAt?: string | null;
        url?: string | null;
        notes?: string | null;
      };
    };
    if (!body.step?.title?.trim()) {
      res.status(400).json({ error: "Step title is required" });
      return;
    }
    const threadId = await createInterviewThread(pool, {
      applicationIds: body.applicationIds ?? [],
      primaryApplicationId: body.primaryApplicationId,
      label: body.label,
      step: {
        kind: body.step.kind,
        title: body.step.title,
        status: body.step.status,
        dueAt: body.step.dueAt,
        scheduledAt: body.step.scheduledAt,
        url: body.step.url,
        notes: body.step.notes,
      },
    });
    res.status(201).json({ id: threadId });
  } catch (err) {
    res.status(400).json({ error: err instanceof Error ? err.message : "Bad request" });
  }
});

api.get("/interviews/:threadId", async (req, res) => {
  const thread = await getInterviewThread(pool, req.params.threadId);
  if (!thread) {
    res.status(404).json({ error: "Interview thread not found" });
    return;
  }
  res.json(thread);
});

api.patch("/interviews/:threadId", async (req, res) => {
  try {
    const body = req.body as {
      primaryApplicationId?: string;
      label?: string | null;
      status?: string;
      resolution?: string | null;
      addApplicationIds?: string[];
    };
    if (body.addApplicationIds?.length) {
      await addThreadMembers(pool, req.params.threadId, body.addApplicationIds);
    }
    await patchInterviewThread(pool, req.params.threadId, body);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/interviews/:threadId/steps", async (req, res) => {
  try {
    const body = req.body as {
      kind?: string;
      title?: string;
      status?: string;
      dueAt?: string | null;
      scheduledAt?: string | null;
      url?: string | null;
      notes?: string | null;
      prepNotes?: string | null;
    };
    if (!body.title?.trim()) {
      res.status(400).json({ error: "Step title is required" });
      return;
    }
    const stepId = await addInterviewStep(pool, req.params.threadId, {
      kind: body.kind,
      title: body.title,
      status: body.status,
      dueAt: body.dueAt,
      scheduledAt: body.scheduledAt,
      url: body.url,
      notes: body.notes,
      prepNotes: body.prepNotes,
    });
    res.status(201).json({ id: stepId });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.patch("/interviews/:threadId/steps/:stepId", async (req, res) => {
  try {
    const body = req.body as {
      kind?: string;
      title?: string;
      status?: string;
      dueAt?: string | null;
      scheduledAt?: string | null;
      url?: string | null;
      notes?: string | null;
      prepNotes?: string | null;
    };
    await patchInterviewStep(pool, req.params.threadId, req.params.stepId, body);
    res.json({ ok: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("not found") ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.delete("/applications/:id", async (req, res) => {
  const taskResult = await pool.query<{ id: string }>(
    `SELECT id FROM tasks
     WHERE application_id = $1 AND status = 'open' AND category = 'application'`,
    [req.params.id],
  );
  if (taskResult.rows[0]) {
    const deleted = await deleteTask(pool, taskResult.rows[0].id);
    if (!deleted) {
      res.status(404).json({ error: "Application not found" });
      return;
    }
    res.json({ ok: true });
    return;
  }
  const result = await pool.query(
    `DELETE FROM applications WHERE id = $1 AND status = 'todo' RETURNING id`,
    [req.params.id],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Application not found" });
    return;
  }
  res.json({ ok: true });
});

api.post("/applications/:id/documents", upload.single("file"), async (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "Missing file" });
    return;
  }
  const exists = await pool.query(`SELECT id FROM applications WHERE id = $1`, [
    req.params.id,
  ]);
  if (!exists.rows[0]) {
    await unlink(req.file.path).catch(() => undefined);
    res.status(404).json({ error: "Application not found" });
    return;
  }
  const inserted = await pool.query(
    `INSERT INTO application_documents (application_id, original_name, stored_name, mime_type)
     VALUES ($1, $2, $3, $4)
     RETURNING id, original_name AS "originalName", mime_type AS "mimeType", created_at AS "createdAt"`,
    [req.params.id, req.file.originalname, req.file.filename, req.file.mimetype],
  );
  res.status(201).json(inserted.rows[0]);
});

api.get("/applications/:id/documents/:docId", async (req, res) => {
  const result = await pool.query<{ stored_name: string; original_name: string; mime_type: string | null }>(
    `SELECT stored_name, original_name, mime_type FROM application_documents
     WHERE id = $1 AND application_id = $2`,
    [req.params.docId, req.params.id],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  const filePath = path.join(uploadDir, result.rows[0].stored_name);
  const inline = req.query.view === "1" || req.query.inline === "1";
  if (inline) {
    const mime = result.rows[0].mime_type || "application/octet-stream";
    res.setHeader("Content-Type", mime);
    res.setHeader(
      "Content-Disposition",
      `inline; filename="${result.rows[0].original_name.replace(/"/g, "")}"`,
    );
    res.sendFile(filePath);
    return;
  }
  res.download(filePath, result.rows[0].original_name);
});

api.get("/tasks", async (req, res) => {
  const view = String(req.query.view ?? "open");
  if (!isTaskView(view)) {
    res.status(400).json({ error: "Invalid view" });
    return;
  }
  res.json(await listTasks(pool, view));
});

api.post("/tasks/from-posting", async (req, res) => {
  const postingId = (req.body as { postingId?: string }).postingId;
  if (!postingId || typeof postingId !== "string") {
    res.status(400).json({ error: "postingId is required" });
    return;
  }
  try {
    const task = await createTaskFromPosting(pool, postingId);
    res.status(201).json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status =
      message === "Posting not found"
        ? 404
        : message.includes("already has a tracker")
          ? 409
          : 400;
    res.status(status).json({ error: message });
  }
});

api.delete("/tasks/from-posting/:postingId", async (req, res) => {
  const deleted = await deleteTaskByPostingId(pool, req.params.postingId);
  if (!deleted) {
    res.status(404).json({ error: "Open application task not found for posting" });
    return;
  }
  res.json({ ok: true });
});

api.post("/tasks", async (req, res) => {
  const parsed = parseCreateTaskBody(req.body as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Invalid task payload" });
    return;
  }
  const task = await createTask(pool, parsed);
  res.status(201).json(task);
});

api.patch("/tasks/:id", async (req, res) => {
  const parsed = parsePatchTaskBody(req.body as Record<string, unknown>);
  if (!parsed) {
    res.status(400).json({ error: "Invalid task update" });
    return;
  }
  try {
    const task = await patchTask(pool, req.params.id, parsed);
    if (!task) {
      res.status(404).json({ error: "Task not found" });
      return;
    }
    res.json(task);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message.includes("already linked") ? 409 : 400;
    res.status(status).json({ error: message });
  }
});

api.post("/tasks/:id/complete", async (req, res) => {
  const task = await completeTask(pool, req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found or cannot complete" });
    return;
  }
  res.json(task);
});

api.post("/tasks/:id/reopen", async (req, res) => {
  const task = await reopenTask(pool, req.params.id);
  if (!task) {
    res.status(404).json({ error: "Task not found or cannot reopen" });
    return;
  }
  res.json(task);
});

api.delete("/tasks/:id", async (req, res) => {
  const deleted = await deleteTask(pool, req.params.id);
  if (!deleted) {
    res.status(404).json({ error: "Task not found" });
    return;
  }
  res.json({ ok: true });
});

api.get("/progress/today", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  res.json(await getProgressToday(pool, tz));
});

api.get("/progress/heatmap", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const lane = String(req.query.lane ?? "application");
  if (!isProgressLane(lane)) {
    res.status(400).json({ error: "lane must be application or technical" });
    return;
  }
  const rawDays = Number(req.query.days);
  const days = Number.isFinite(rawDays) ? rawDays : 365;
  res.json(await getProgressHeatmap(pool, lane, tz, days));
});

api.get("/progress/outcome", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const period = String(req.query.period ?? "");
  if (!isProgressPeriod(period)) {
    res.status(400).json({ error: "period must be day, week, or month" });
    return;
  }
  try {
    const anchorDate = parseAnchorDate(
      typeof req.query.date === "string" ? req.query.date : undefined,
      tz,
    );
    const outcome = await getProgressOutcome(pool, period, tz, anchorDate);
    if (!outcome) {
      res.status(400).json({ error: "Invalid date" });
      return;
    }
    res.json(outcome);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(400).json({ error: message });
  }
});

api.get("/progress/day/:date", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const date = parseLocalDate(req.params.date);
  if (!date) {
    res.status(400).json({ error: "Invalid date" });
    return;
  }
  res.json(await getProgressDay(pool, tz, date));
});

api.patch("/progress/leetcode", async (req, res) => {
  const tz = resolveTimezone(String(req.query.tz ?? ""));
  if (!tz) {
    res.status(400).json({ error: "Invalid or missing tz (IANA timezone)" });
    return;
  }
  const body = req.body as { count?: number; delta?: number; date?: string };
  try {
    res.json(await setLeetcodeDaily(pool, tz, body));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(400).json({ error: message });
  }
});

api.post("/progress/reflections", async (req, res) => {
  const body = req.body as {
    lane?: string;
    body?: string;
    applicationId?: string | null;
    localDate?: string | null;
    tz?: string | null;
  };
  const lane = body.lane ?? "";
  if (!isProgressLane(lane)) {
    res.status(400).json({ error: "lane must be application or technical" });
    return;
  }
  if (!body.body || typeof body.body !== "string") {
    res.status(400).json({ error: "body is required" });
    return;
  }
  try {
    const row = await createReflectionLog(pool, {
      lane,
      body: body.body,
      applicationId: body.applicationId ?? null,
      localDate: body.localDate ?? null,
      tz: body.tz ?? (typeof req.query.tz === "string" ? req.query.tz : null),
    });
    res.status(201).json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    const status = message === "Application not found" ? 404 : 400;
    res.status(status).json({ error: message });
  }
});

api.patch("/progress/reflections/:id", async (req, res) => {
  const body = req.body as { body?: string };
  if (!body.body || typeof body.body !== "string") {
    res.status(400).json({ error: "body is required" });
    return;
  }
  try {
    const row = await updateReflectionLog(pool, req.params.id, body.body);
    if (!row) {
      res.status(404).json({ error: "Reflection not found" });
      return;
    }
    res.json(row);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Bad request";
    res.status(400).json({ error: message });
  }
});

export async function ensureUploadDir(): Promise<void> {
  await mkdir(uploadDir, { recursive: true });
}

export { APPLICATION_STATUSES };
