import path from "node:path";
import type { Pool, PoolClient } from "pg";
import { normalizeDescriptionHtml } from "./descriptionFromHtml.js";
import { resolveThreadsForApplication } from "./interviews.js";
import { applicationResolutionFromStatus } from "./interviewStatuses.js";
import { parseDueAt, parseHttpUrl, resolveAppliedAt } from "./parsing.js";
import type { ApplicationStatus } from "./statuses.js";
import { deleteTask } from "./tasks.js";

type Queryable = Pool | PoolClient;

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

export type ApplicationRow = {
  id: string;
  postingId: string | null;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  dueAt: string | null;
  statusChangedAt: string;
  createdAt: string;
  updatedAt: string;
  company: string | null;
  title: string | null;
  location: string | null;
  url: string | null;
  source: string | null;
  firstPublishedAt: string | null;
  sourceUpdatedAt: string | null;
  descriptionHtml: string | null;
};

export type ApplicationDocumentRow = {
  id: string;
  originalName: string;
  mimeType: string | null;
  createdAt: string;
};

export type ApplicationWithDocuments = ApplicationRow & {
  documents: ApplicationDocumentRow[];
};

export async function listApplications(
  db: Queryable,
  status: "all" | ApplicationStatus,
): Promise<{
  count: number;
  counts: Record<string, number>;
  applications: ApplicationRow[];
}> {
  const params: unknown[] = [];
  let where = "WHERE a.status <> 'todo'";
  if (status !== "all") {
    params.push(status);
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
  const result = await db.query<ApplicationRow>(
    `${applicationSelect} ${where} ${orderBy}`,
    params,
  );
  const countsResult = await db.query<{ status: string; count: string }>(
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
  return { count: result.rows.length, counts, applications: result.rows };
}

export async function listApplicationLocations(
  db: Queryable,
  q: string,
): Promise<string[]> {
  const params: unknown[] = [];
  let filter = "";
  if (q) {
    params.push(`%${q}%`);
    filter = `AND loc ILIKE $1`;
  }
  const result = await db.query<{ location: string }>(
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
  return result.rows.map((row) => row.location);
}

export async function getApplication(
  db: Queryable,
  id: string,
): Promise<ApplicationWithDocuments | null> {
  const result = await db.query<ApplicationRow>(`${applicationSelect} WHERE a.id = $1`, [id]);
  if (!result.rows[0]) return null;
  const docs = await db.query<ApplicationDocumentRow>(
    `SELECT id, original_name AS "originalName", mime_type AS "mimeType", created_at AS "createdAt"
     FROM application_documents WHERE application_id = $1 ORDER BY created_at`,
    [id],
  );
  return { ...result.rows[0], documents: docs.rows };
}

export type CreateApplicationInput = {
  postingId?: string;
  status: ApplicationStatus;
  notes?: string | null;
  company?: string;
  title?: string;
  location?: string;
  url?: string;
  description?: string;
  descriptionHtml?: string;
  appliedAt?: string | null;
  appliedAtProvided: boolean;
};

export async function createApplication(
  db: Queryable,
  input: CreateApplicationInput,
): Promise<{ id: string }> {
  const appliedAt = resolveAppliedAt({
    status: input.status,
    explicit: input.appliedAt,
    explicitProvided: input.appliedAtProvided,
  });
  const dueAt = null;

  if (input.postingId) {
    const inserted = await db.query<{ id: string }>(
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
      [input.postingId, input.status, input.notes ?? null, appliedAt, dueAt],
    );
    return { id: inserted.rows[0]!.id };
  }

  if (!input.company?.trim() || !input.title?.trim()) {
    throw new Error("Manual applications need company and title");
  }
  const descriptionHtml = normalizeDescriptionHtml(input.descriptionHtml, input.description);
  const inserted = await db.query<{ id: string }>(
    `INSERT INTO applications (
       status, notes, company_name, title, location, url, description_html, applied_at, due_at, status_changed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())
     RETURNING id`,
    [
      input.status,
      input.notes ?? null,
      input.company.trim(),
      input.title.trim(),
      input.location?.trim() || null,
      input.url?.trim() || null,
      descriptionHtml,
      appliedAt,
      dueAt,
    ],
  );
  return { id: inserted.rows[0]!.id };
}

export type PatchApplicationInput = {
  status?: ApplicationStatus;
  notes?: string;
  postingId?: string | null;
  appliedAt?: string | null;
  dueAt?: string | null;
  url?: string | null;
  description?: string;
  descriptionHtml?: string | null;
  appliedAtProvided: boolean;
  dueAtProvided: boolean;
  urlProvided: boolean;
  postingIdProvided: boolean;
};

export async function patchApplication(
  db: Pool,
  id: string,
  input: PatchApplicationInput,
): Promise<{ id: string }> {
  const client = await db.connect();
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
      [id],
    );
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      throw new Error("Application not found");
    }

    const previousStatus = current.rows[0].status;
    let notes = input.notes !== undefined ? input.notes : current.rows[0].notes;
    let status = input.status ?? previousStatus;
    if (
      input.urlProvided &&
      input.url != null &&
      String(input.url).trim() &&
      !parseHttpUrl(input.url, { allowEmpty: true })
    ) {
      await client.query("ROLLBACK");
      throw new Error("Invalid URL — use http:// or https://");
    }
    const urlFinal = input.urlProvided ? parseHttpUrl(input.url, { allowEmpty: true }) : undefined;

    let descriptionHtml = current.rows[0].description_html;
    if (input.descriptionHtml !== undefined) {
      descriptionHtml = normalizeDescriptionHtml(input.descriptionHtml);
    } else if (input.description !== undefined) {
      descriptionHtml = normalizeDescriptionHtml(null, input.description);
    }

    if (input.postingId) {
      const other = await client.query<{
        id: string;
        notes: string | null;
        status: string;
        applied_at: Date | null;
      }>(
        `SELECT id, notes, status, applied_at FROM applications WHERE posting_id = $1 AND id <> $2`,
        [input.postingId, id],
      );
      if (other.rows[0]) {
        notes = input.notes !== undefined ? input.notes : mergeNotes(notes, other.rows[0].notes);
        if (!input.status) {
          const keepRank = STATUS_RANK[status] ?? 0;
          const otherRank = STATUS_RANK[other.rows[0].status] ?? 0;
          if (otherRank > keepRank) status = other.rows[0].status;
        }
        await client.query(
          `UPDATE application_documents SET application_id = $1 WHERE application_id = $2`,
          [id, other.rows[0].id],
        );
        await client.query(`DELETE FROM applications WHERE id = $1`, [other.rows[0].id]);
      }
    }

    const appliedAtFinal = resolveAppliedAt({
      status,
      previousAppliedAt: current.rows[0].applied_at,
      explicit: input.appliedAt,
      explicitProvided: input.appliedAtProvided,
    });
    const dueAtFinal =
      status !== "todo"
        ? null
        : input.dueAtProvided
          ? parseDueAt(input.dueAt)
          : current.rows[0].due_at;
    const statusChanged = status !== previousStatus;

    const result = await client.query<{ id: string }>(
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
        id,
        status,
        notes,
        appliedAtFinal,
        dueAtFinal,
        descriptionHtml,
        input.postingIdProvided,
        input.postingId ?? null,
        statusChanged,
        input.urlProvided,
        urlFinal,
      ],
    );
    const resolution = applicationResolutionFromStatus(status);
    if (statusChanged && resolution) {
      await resolveThreadsForApplication(client, id, resolution);
    }
    await client.query("COMMIT");
    return { id: result.rows[0]!.id };
  } catch (error) {
    await client.query("ROLLBACK");
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      throw new Error("That posting is already linked to an application");
    }
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteApplication(db: Queryable, id: string): Promise<boolean> {
  const taskResult = await db.query<{ id: string }>(
    `SELECT id FROM tasks
     WHERE application_id = $1 AND status = 'open' AND category = 'application'`,
    [id],
  );
  if (taskResult.rows[0]) {
    return deleteTask(db, taskResult.rows[0].id);
  }
  const result = await db.query<{ id: string }>(
    `DELETE FROM applications WHERE id = $1 AND status = 'todo' RETURNING id`,
    [id],
  );
  return Boolean(result.rows[0]);
}

export type ApplicationDocumentMeta = {
  originalName: string;
  storedName: string;
  mimeType: string;
};

export async function addApplicationDocument(
  db: Queryable,
  applicationId: string,
  file: ApplicationDocumentMeta,
): Promise<ApplicationDocumentRow | null> {
  const exists = await db.query(`SELECT id FROM applications WHERE id = $1`, [applicationId]);
  if (!exists.rows[0]) return null;
  const inserted = await db.query<ApplicationDocumentRow>(
    `INSERT INTO application_documents (application_id, original_name, stored_name, mime_type)
     VALUES ($1, $2, $3, $4)
     RETURNING id, original_name AS "originalName", mime_type AS "mimeType", created_at AS "createdAt"`,
    [applicationId, file.originalName, file.storedName, file.mimeType],
  );
  return inserted.rows[0] ?? null;
}

export type ApplicationDocumentDownload = {
  filePath: string;
  originalName: string;
  mimeType: string | null;
};

export function applicationDocumentPath(uploadDir: string, storedName: string): string {
  return path.join(uploadDir, storedName);
}

export async function getApplicationDocument(
  db: Queryable,
  applicationId: string,
  docId: string,
  uploadDir: string,
): Promise<ApplicationDocumentDownload | null> {
  const result = await db.query<{
    stored_name: string;
    original_name: string;
    mime_type: string | null;
  }>(
    `SELECT stored_name, original_name, mime_type FROM application_documents
     WHERE id = $1 AND application_id = $2`,
    [docId, applicationId],
  );
  if (!result.rows[0]) return null;
  return {
    filePath: applicationDocumentPath(uploadDir, result.rows[0].stored_name),
    originalName: result.rows[0].original_name,
    mimeType: result.rows[0].mime_type,
  };
}
