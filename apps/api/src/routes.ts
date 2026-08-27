import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { getBoardRefresh, startBoardRefresh } from "./boardRefresh.js";
import { pool } from "./db.js";
import { sanitizeDescriptionHtml } from "./descriptionFromHtml.js";
import { getRankBatchStatus } from "./rankBatchStatus.js";
import {
  APPLICATION_STATUSES,
  isApplicationStatus,
} from "./statuses.js";

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

function plainTextToHtml(text: string | null | undefined): string | null {
  const raw = text?.trim();
  if (!raw) return null;
  const escaped = raw
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<p>${escaped.replace(/\r\n|\r|\n/g, "<br>")}</p>`;
}

function normalizeDescriptionHtml(
  html: string | null | undefined,
  plain?: string | null,
): string | null {
  const fromHtml = html?.trim();
  if (fromHtml) {
    const cleaned = sanitizeDescriptionHtml(fromHtml);
    return cleaned || null;
  }
  return plainTextToHtml(plain);
}

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

function resolveAppliedAt(opts: {
  status: string;
  previousAppliedAt?: Date | string | null;
  explicit?: unknown;
  explicitProvided: boolean;
}): Date | null {
  if (opts.status === "starred") return null;
  if (opts.explicitProvided) return parseAppliedAt(opts.explicit);
  if (opts.previousAppliedAt) {
    return opts.previousAppliedAt instanceof Date
      ? opts.previousAppliedAt
      : new Date(opts.previousAppliedAt);
  }
  if (
    opts.status === "applied" ||
    opts.status === "interviewing" ||
    opts.status === "hired"
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

api.get("/rank/batch", async (_req, res) => {
  res.json(await getRankBatchStatus());
});

api.get("/jobs", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const mismatches = req.query.mismatches === "1" || req.query.mismatches === "true";
  const showUnranked = req.query.unranked !== "0" && req.query.unranked !== "false";
  const sortKey = String(req.query.sort ?? "rank");
  const sort =
    sortKey === "published" || sortKey === "updated" ? sortKey : "rank";
  const pageSize = Math.min(100, Math.max(1, Number(req.query.pageSize) || 25));
  const page = Math.max(1, Number(req.query.page) || 1);
  const offset = (page - 1) * pageSize;
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
  const eligibleFilter = mismatches ? "" : "AND p.rank_eligible IS NOT FALSE";
  const unrankedFilter = showUnranked ? "" : "AND p.ranked_at IS NOT NULL";
  const orderBy =
    sort === "published"
      ? "p.first_published_at DESC NULLS LAST, p.first_seen_at DESC"
      : sort === "updated"
        ? "COALESCE(p.source_updated_at, p.first_published_at) DESC NULLS LAST, p.last_seen_at DESC"
        : `${showUnranked ? "CASE WHEN p.ranked_at IS NULL THEN 0 ELSE 1 END," : ""}
       CASE WHEN p.rank_eligible IS FALSE THEN 1 ELSE 0 END,
       p.rank_score DESC NULLS LAST,
       p.last_seen_at DESC`;
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
       a.id AS "applicationId",
       a.status AS "applicationStatus",
       f.kind AS "feedbackKind",
       COUNT(*) OVER()::int AS "totalCount"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     LEFT JOIN posting_feedback f ON f.posting_id = p.id
     WHERE p.removed_from_board_at IS NULL
       AND (a.id IS NULL OR a.status = 'starred')
       AND (f.kind IS NULL OR f.kind <> 'dismiss')
       ${eligibleFilter}
       ${unrankedFilter}
       ${search}
     ORDER BY
       ${orderBy}
     LIMIT ${limitPh} OFFSET ${offsetPh}`,
    params,
  );
  const count = result.rows[0]?.totalCount ?? 0;
  const jobs = result.rows.map(({ totalCount: _total, ...job }) => job);
  res.json({ count, page, pageSize, jobs });
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
  res.status(201).json(inserted.rows[0]);
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
  const params: unknown[] = [];
  let where = "";
  if (status !== "all") {
    if (!isApplicationStatus(status)) {
      res.status(400).json({ error: "Invalid status" });
      return;
    }
    params.push(status);
    where = "WHERE a.status = $1";
  }
  // Within a status: newest entry into that status first (created, or status change).
  // All tab: hired → interviewing → applied → starred → declined, then same within-status order.
  const orderBy =
    status === "all"
      ? `ORDER BY
           CASE a.status
             WHEN 'hired' THEN 0
             WHEN 'interviewing' THEN 1
             WHEN 'applied' THEN 2
             WHEN 'starred' THEN 3
             WHEN 'declined' THEN 4
             ELSE 5
           END,
           a.status_changed_at DESC,
           a.created_at DESC`
      : `ORDER BY a.status_changed_at DESC, a.created_at DESC`;
  const result = await pool.query(
    `${applicationSelect} ${where} ${orderBy}`,
    params,
  );
  const countsResult = await pool.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count FROM applications GROUP BY status`,
  );
  const counts: Record<string, number> = {
    all: 0,
    starred: 0,
    applied: 0,
    interviewing: 0,
    hired: 0,
    declined: 0,
  };
  for (const row of countsResult.rows) {
    const n = Number(row.count) || 0;
    counts[row.status] = n;
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
  };
  const status = body.status ?? "applied";
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

  if (body.postingId) {
    const inserted = await pool.query(
      `INSERT INTO applications (posting_id, status, notes, applied_at, status_changed_at)
       VALUES ($1, $2, $3, $4, now())
       ON CONFLICT (posting_id) DO UPDATE SET
         status = EXCLUDED.status,
         notes = COALESCE(EXCLUDED.notes, applications.notes),
         applied_at = CASE
           WHEN EXCLUDED.status = 'starred' THEN NULL
           WHEN EXCLUDED.applied_at IS NOT NULL THEN EXCLUDED.applied_at
           WHEN applications.applied_at IS NOT NULL THEN applications.applied_at
           WHEN EXCLUDED.status IN ('applied', 'interviewing', 'hired') THEN now()
           ELSE applications.applied_at
         END,
         status_changed_at = CASE
           WHEN applications.status IS DISTINCT FROM EXCLUDED.status THEN now()
           ELSE applications.status_changed_at
         END,
         updated_at = now()
       RETURNING id`,
      [body.postingId, status, body.notes ?? null, appliedAt],
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
       status, notes, company_name, title, location, url, description_html, applied_at, status_changed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
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
    ],
  );
  res.status(201).json({ id: inserted.rows[0].id });
});

const STATUS_RANK: Record<string, number> = {
  starred: 0,
  applied: 1,
  interviewing: 2,
  hired: 3,
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
    description?: string;
    descriptionHtml?: string | null;
  };
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
      description_html: string | null;
      status_changed_at: Date;
    }>(
      `SELECT id, notes, status, applied_at, description_html, status_changed_at
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
    let status = body.status ?? previousStatus;
    const explicitProvided = Object.prototype.hasOwnProperty.call(body, "appliedAt");

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
    const statusChanged = status !== previousStatus;

    const result = await client.query(
      `UPDATE applications SET
         status = $2,
         notes = $3,
         applied_at = $4,
         description_html = $5,
         posting_id = CASE WHEN $6::boolean THEN $7::uuid ELSE posting_id END,
         status_changed_at = CASE WHEN $8::boolean THEN now() ELSE status_changed_at END,
         updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        req.params.id,
        status,
        notes,
        appliedAtFinal,
        descriptionHtml,
        body.postingId !== undefined,
        body.postingId ?? null,
        statusChanged,
      ],
    );
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

api.delete("/applications/:id", async (req, res) => {
  const result = await pool.query(
    `DELETE FROM applications WHERE id = $1 AND status = 'starred' RETURNING id`,
    [req.params.id],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Starred application not found" });
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
  const result = await pool.query<{ stored_name: string; original_name: string }>(
    `SELECT stored_name, original_name FROM application_documents
     WHERE id = $1 AND application_id = $2`,
    [req.params.docId, req.params.id],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Document not found" });
    return;
  }
  res.download(
    path.join(uploadDir, result.rows[0].stored_name),
    result.rows[0].original_name,
  );
});

export async function ensureUploadDir(): Promise<void> {
  await mkdir(uploadDir, { recursive: true });
}

export { APPLICATION_STATUSES };
