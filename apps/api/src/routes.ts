import { randomUUID } from "node:crypto";
import { mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import multer from "multer";
import { pool } from "./db.js";
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
    a.created_at AS "createdAt",
    a.updated_at AS "updatedAt",
    COALESCE(a.company_name, c.name) AS company,
    COALESCE(a.title, p.title) AS title,
    COALESCE(a.location, p.location) AS location,
    COALESCE(a.url, p.url) AS url,
    p.source,
    p.cycle_status AS "cycleStatus",
    p.description_html AS "descriptionHtml"
  FROM applications a
  LEFT JOIN postings p ON p.id = a.posting_id
  LEFT JOIN companies c ON c.id = p.company_id
`;

export const api = express.Router();

api.get("/jobs", async (req, res) => {
  const q = String(req.query.q ?? "").trim();
  const params: unknown[] = [];
  let search = "";
  if (q) {
    params.push(`%${q}%`);
    search = `AND (
      p.title ILIKE $1 OR c.name ILIKE $1 OR COALESCE(p.location, '') ILIKE $1
    )`;
  }

  const result = await pool.query(
    `SELECT
       p.id,
       p.source,
       p.external_id AS "externalId",
       c.name AS company,
       p.title,
       p.location,
       p.department,
       p.url,
       p.cycle_status AS "cycleStatus",
       p.first_published_at AS "firstPublishedAt",
       p.first_seen_at AS "firstSeenAt",
       p.last_seen_at AS "lastSeenAt",
       a.id AS "applicationId",
       a.status AS "applicationStatus"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE p.removed_from_board_at IS NULL
       AND (a.id IS NULL OR a.status = 'starred')
       ${search}
     ORDER BY
       CASE WHEN a.status = 'starred' THEN 0 ELSE 1 END,
       CASE p.cycle_status WHEN 'target' THEN 0 WHEN 'optional' THEN 1 ELSE 2 END,
       p.last_seen_at DESC`,
    params,
  );
  res.json({ count: result.rows.length, jobs: result.rows });
});

api.get("/jobs/:id", async (req, res) => {
  const result = await pool.query(
    `SELECT
       p.id,
       p.source,
       p.external_id AS "externalId",
       c.name AS company,
       p.title,
       p.location,
       p.department,
       p.url,
       p.description_html AS "descriptionHtml",
       p.cycle_status AS "cycleStatus",
       p.first_published_at AS "firstPublishedAt",
       p.first_seen_at AS "firstSeenAt",
       p.last_seen_at AS "lastSeenAt",
       a.id AS "applicationId",
       a.status AS "applicationStatus",
       a.notes AS "applicationNotes"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE p.id = $1`,
    [req.params.id],
  );
  if (!result.rows[0]) {
    res.status(404).json({ error: "Job not found" });
    return;
  }
  res.json(result.rows[0]);
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
  const result = await pool.query(
    `${applicationSelect} ${where} ORDER BY a.updated_at DESC`,
    params,
  );
  res.json({ count: result.rows.length, applications: result.rows });
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
  };
  const status = body.status ?? "applied";
  if (!isApplicationStatus(status)) {
    res.status(400).json({ error: "Invalid status" });
    return;
  }

  if (body.postingId) {
    const existing = await pool.query(
      `SELECT id FROM applications WHERE posting_id = $1`,
      [body.postingId],
    );
    if (existing.rows[0]) {
      const updated = await pool.query(
        `UPDATE applications
         SET status = $2, notes = COALESCE($3, notes), updated_at = now()
         WHERE posting_id = $1
         RETURNING id`,
        [body.postingId, status, body.notes ?? null],
      );
      res.json({ id: updated.rows[0].id });
      return;
    }
    const inserted = await pool.query(
      `INSERT INTO applications (posting_id, status, notes)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [body.postingId, status, body.notes ?? null],
    );
    res.status(201).json({ id: inserted.rows[0].id });
    return;
  }

  if (!body.company?.trim() || !body.title?.trim()) {
    res.status(400).json({ error: "Manual applications need company and title" });
    return;
  }
  const inserted = await pool.query(
    `INSERT INTO applications (status, notes, company_name, title, location, url)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      status,
      body.notes ?? null,
      body.company.trim(),
      body.title.trim(),
      body.location?.trim() || null,
      body.url?.trim() || null,
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
    }>(`SELECT id, notes, status FROM applications WHERE id = $1`, [req.params.id]);
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      res.status(404).json({ error: "Application not found" });
      return;
    }

    let notes = body.notes !== undefined ? body.notes : current.rows[0].notes;
    let status = body.status ?? current.rows[0].status;

    if (body.postingId) {
      const other = await client.query<{
        id: string;
        notes: string | null;
        status: string;
      }>(
        `SELECT id, notes, status FROM applications WHERE posting_id = $1 AND id <> $2`,
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

    const result = await client.query(
      `UPDATE applications SET
         status = $2,
         notes = $3,
         posting_id = CASE WHEN $4::boolean THEN $5::uuid ELSE posting_id END,
         updated_at = now()
       WHERE id = $1
       RETURNING id`,
      [
        req.params.id,
        status,
        notes,
        body.postingId !== undefined,
        body.postingId ?? null,
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
