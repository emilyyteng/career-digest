import type { Pool, PoolClient } from "pg";
import { resolveThreadsForApplication } from "./interviews.js";
import { applicationResolutionFromStatus } from "./interviewStatuses.js";

type Queryable = Pool | PoolClient;

export const TASK_CATEGORIES = ["application", "school", "personal"] as const;
export type TaskCategory = (typeof TASK_CATEGORIES)[number];

export const TASK_VIEWS = ["open", "completed"] as const;
export type TaskView = (typeof TASK_VIEWS)[number];

export const SCHOOL_PERSONAL_CATEGORIES: TaskCategory[] = ["school", "personal"];

export type TaskRow = {
  id: string;
  category: TaskCategory;
  status: "open" | "completed";
  title: string;
  organization: string | null;
  url: string | null;
  notes: string | null;
  dueAt: string | null;
  postingId: string | null;
  applicationId: string | null;
  location: string | null;
  source: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const taskListSelect = `
  SELECT
    t.id,
    t.category,
    t.status,
    COALESCE(t.title, a.title, p.title) AS title,
    COALESCE(
      t.organization,
      a.company_name,
      CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
      c.name
    ) AS organization,
    COALESCE(t.url, a.url, p.url) AS url,
    t.notes,
    t.due_at AS "dueAt",
    t.posting_id AS "postingId",
    t.application_id AS "applicationId",
    COALESCE(a.location, p.location) AS location,
    p.source,
    t.completed_at AS "completedAt",
    t.created_at AS "createdAt",
    t.updated_at AS "updatedAt"
  FROM tasks t
  LEFT JOIN applications a ON a.id = t.application_id
  LEFT JOIN postings p ON p.id = COALESCE(t.posting_id, a.posting_id)
  LEFT JOIN companies c ON c.id = p.company_id
`;

const taskReturnColumns = `
  id,
  category,
  status,
  title,
  organization,
  url,
  notes,
  due_at AS "dueAt",
  posting_id AS "postingId",
  application_id AS "applicationId",
  location,
  source,
  completed_at AS "completedAt",
  created_at AS "createdAt",
  updated_at AS "updatedAt"
`;

const STATUS_RANK: Record<string, number> = {
  todo: 0,
  applied: 1,
  interviewing: 2,
  accepted: 3,
  declined: 1,
};

export function isTaskCategory(value: string): value is TaskCategory {
  return (TASK_CATEGORIES as readonly string[]).includes(value);
}

export function isSchoolPersonalCategory(value: string): value is "school" | "personal" {
  return value === "school" || value === "personal";
}

export function isApplicationCategory(value: string): value is "application" {
  return value === "application";
}

export function isTaskView(value: string): value is TaskView {
  return (TASK_VIEWS as readonly string[]).includes(value);
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

function parseOptionalText(value: unknown): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function parseRequiredText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function mergeNotes(a: string | null, b: string | null): string | null {
  const parts = [a?.trim(), b?.trim()].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return [...new Set(parts)].join("\n\n");
}

async function countTasks(db: Queryable): Promise<{ open: number; completed: number }> {
  const { rows } = await db.query<{ open: string; completed: string }>(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'open')::text AS open,
       COUNT(*) FILTER (
         WHERE status = 'completed' AND category IN ('school', 'personal')
       )::text AS completed
     FROM tasks`,
  );
  return {
    open: Number(rows[0]?.open ?? 0) || 0,
    completed: Number(rows[0]?.completed ?? 0) || 0,
  };
}

async function fetchTaskRow(db: Queryable, id: string): Promise<TaskRow | null> {
  const { rows } = await db.query<TaskRow>(`${taskListSelect} WHERE t.id = $1`, [id]);
  return rows[0] ?? null;
}

export async function listTasks(db: Queryable, view: TaskView): Promise<{
  view: TaskView;
  count: number;
  counts: { open: number; completed: number };
  tasks: TaskRow[];
}> {
  const counts = await countTasks(db);
  if (view === "open") {
    const { rows } = await db.query<TaskRow>(
      `${taskListSelect}
       WHERE t.status = 'open'
       ORDER BY t.due_at ASC NULLS LAST, t.created_at DESC`,
    );
    return { view, count: rows.length, counts, tasks: rows };
  }
  const { rows } = await db.query<TaskRow>(
    `${taskListSelect}
     WHERE t.status = 'completed' AND t.category IN ('school', 'personal')
     ORDER BY t.completed_at DESC NULLS LAST, t.created_at DESC`,
  );
  return { view, count: rows.length, counts, tasks: rows };
}

export async function getTaskById(db: Queryable, id: string): Promise<TaskRow | null> {
  return fetchTaskRow(db, id);
}

export type CreateTaskInput = {
  category: TaskCategory;
  title: string;
  organization?: string | null;
  url?: string | null;
  notes?: string | null;
  dueAt?: string | null;
  location?: string | null;
};

async function createManualApplicationTask(
  db: Queryable,
  input: CreateTaskInput,
): Promise<TaskRow> {
  const dueAt = input.dueAt ? new Date(input.dueAt) : null;
  const client = "connect" in db ? await db.connect() : null;
  const queryable = client ?? db;
  try {
    if (client) await client.query("BEGIN");
    const appResult = await queryable.query<{ id: string }>(
      `INSERT INTO applications (
         status, notes, company_name, title, location, url, due_at, status_changed_at
       )
       VALUES ('todo', $1, $2, $3, $4, $5, $6, now())
       RETURNING id`,
      [
        input.notes ?? null,
        input.organization ?? null,
        input.title,
        input.location ?? null,
        input.url ?? null,
        dueAt,
      ],
    );
    const applicationId = appResult.rows[0]!.id;
    const { rows } = await queryable.query<{ id: string }>(
      `INSERT INTO tasks (
         category, status, title, organization, url, notes, due_at, application_id
       )
       VALUES ('application', 'open', $1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [
        input.title,
        input.organization ?? null,
        input.url ?? null,
        input.notes ?? null,
        dueAt,
        applicationId,
      ],
    );
    if (client) await client.query("COMMIT");
    return (await fetchTaskRow(db, rows[0]!.id))!;
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function createTask(db: Queryable, input: CreateTaskInput): Promise<TaskRow> {
  if (input.category === "application") {
    return createManualApplicationTask(db, input);
  }
  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO tasks (category, title, organization, url, notes, due_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id`,
    [
      input.category,
      input.title,
      input.organization ?? null,
      input.url ?? null,
      input.notes ?? null,
      input.dueAt ? new Date(input.dueAt) : null,
    ],
  );
  return (await fetchTaskRow(db, rows[0]!.id))!;
}

async function linkApplicationToPosting(
  db: PoolClient,
  applicationId: string,
  postingId: string,
): Promise<void> {
  const current = await db.query<{
    id: string;
    notes: string | null;
    status: string;
  }>(`SELECT id, notes, status FROM applications WHERE id = $1`, [applicationId]);
  if (!current.rows[0]) throw new Error("Application not found");

  const other = await db.query<{
    id: string;
    notes: string | null;
    status: string;
  }>(
    `SELECT id, notes, status FROM applications WHERE posting_id = $1 AND id <> $2`,
    [postingId, applicationId],
  );
  let notes = current.rows[0].notes;
  let status = current.rows[0].status;
  if (other.rows[0]) {
    notes = mergeNotes(notes, other.rows[0].notes);
    const keepRank = STATUS_RANK[status] ?? 0;
    const otherRank = STATUS_RANK[other.rows[0].status] ?? 0;
    if (otherRank > keepRank) status = other.rows[0].status;
    await db.query(
      `UPDATE application_documents SET application_id = $1 WHERE application_id = $2`,
      [applicationId, other.rows[0].id],
    );
    await db.query(`DELETE FROM applications WHERE id = $1`, [other.rows[0].id]);
  }

  await db.query(
    `UPDATE applications SET posting_id = $2, status = $3, notes = $4, updated_at = now() WHERE id = $1`,
    [applicationId, postingId, status, notes],
  );
}

export async function createTaskFromPosting(db: Queryable, postingId: string): Promise<TaskRow> {
  const existing = await db.query<{ id: string }>(
    `SELECT id FROM tasks
     WHERE posting_id = $1 AND status = 'open' AND category = 'application'`,
    [postingId],
  );
  if (existing.rows[0]) {
    return (await fetchTaskRow(db, existing.rows[0].id))!;
  }

  const posting = await db.query<{
    id: string;
    title: string;
    location: string | null;
    url: string;
    company: string | null;
  }>(
    `SELECT
       p.id,
       p.title,
       p.location,
       p.url,
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.id = $1`,
    [postingId],
  );
  if (!posting.rows[0]) throw new Error("Posting not found");

  const client = "connect" in db ? await db.connect() : null;
  const queryable = client ?? db;
  try {
    if (client) await client.query("BEGIN");
    const appResult = await queryable.query<{ id: string; status: string }>(
      `INSERT INTO applications (posting_id, status, status_changed_at)
       VALUES ($1, 'todo', now())
       ON CONFLICT (posting_id) DO UPDATE SET
         status = CASE
           WHEN applications.status = 'todo' THEN 'todo'
           ELSE applications.status
         END,
         updated_at = now()
       RETURNING id, status`,
      [postingId],
    );
    const applicationId = appResult.rows[0]!.id;
    if (appResult.rows[0]!.status !== "todo") {
      throw new Error("Posting already has a tracker application past to-do");
    }

    const row = posting.rows[0]!;
    const { rows: taskRows } = await queryable.query<{ id: string }>(
      `INSERT INTO tasks (
         category, status, title, organization, url, posting_id, application_id
       )
       VALUES ('application', 'open', $1, $2, $3, $4, $5)
       RETURNING id`,
      [row.title, row.company, row.url, postingId, applicationId],
    );
    if (client) await client.query("COMMIT");
    return (await fetchTaskRow(db, taskRows[0]!.id))!;
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client) client.release();
  }
}

export type PatchTaskInput = {
  title?: string;
  organization?: string | null;
  url?: string | null;
  notes?: string | null;
  dueAt?: string | null;
  postingId?: string | null;
};

export async function patchTask(
  db: Queryable,
  id: string,
  patch: PatchTaskInput,
): Promise<TaskRow | null> {
  const existing = await getTaskById(db, id);
  if (!existing) return null;

  const title = patch.title !== undefined ? parseRequiredText(patch.title) : existing.title;
  if (!title) return null;

  const organization =
    patch.organization !== undefined ? parseOptionalText(patch.organization) : existing.organization;
  const notes = patch.notes !== undefined ? parseOptionalText(patch.notes) : existing.notes;
  let url = existing.url;
  if (patch.url !== undefined) {
    const parsed = parseHttpUrl(patch.url, { allowEmpty: true });
    if (patch.url !== null && patch.url !== "" && parsed === null) return null;
    url = parsed;
  }
  let dueAt: Date | null = existing.dueAt ? new Date(existing.dueAt) : null;
  if (patch.dueAt !== undefined) {
    dueAt = parseDueAt(patch.dueAt);
    if (patch.dueAt !== null && patch.dueAt !== "" && dueAt === null) return null;
  }

  const client = "connect" in db && patch.postingId ? await db.connect() : null;
  const queryable = client ?? db;
  try {
    if (client) await client.query("BEGIN");

    if (patch.postingId !== undefined && existing.category === "application") {
      if (!existing.applicationId) return null;
      if (patch.postingId) {
        if (!client) throw new Error("Posting link requires transaction");
        await linkApplicationToPosting(client, existing.applicationId, patch.postingId);
      }
    }

    await queryable.query(
      `UPDATE tasks
       SET title = $2,
           organization = $3,
           url = $4,
           notes = $5,
           due_at = $6,
           posting_id = CASE WHEN $7::boolean THEN $8::uuid ELSE posting_id END,
           updated_at = now()
       WHERE id = $1`,
      [
        id,
        title,
        organization,
        url,
        notes,
        dueAt,
        patch.postingId !== undefined,
        patch.postingId ?? null,
      ],
    );

    if (
      existing.category === "application" &&
      existing.applicationId &&
      patch.dueAt !== undefined
    ) {
      await queryable.query(
        `UPDATE applications SET due_at = $2, updated_at = now() WHERE id = $1`,
        [existing.applicationId, dueAt],
      );
    }

    if (client) await client.query("COMMIT");
    return await fetchTaskRow(db, id);
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    const code = (error as { code?: string }).code;
    if (code === "23505") throw new Error("That posting is already linked to an application");
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function completeTask(db: Queryable, id: string): Promise<TaskRow | null> {
  const existing = await getTaskById(db, id);
  if (!existing || existing.status !== "open") return null;

  const client = "connect" in db ? await db.connect() : null;
  const queryable = client ?? db;
  try {
    if (client) await client.query("BEGIN");

    if (isApplicationCategory(existing.category)) {
      if (!existing.applicationId) return null;
      await queryable.query(
        `UPDATE applications
         SET status = 'applied',
             applied_at = now(),
             due_at = NULL,
             status_changed_at = now(),
             updated_at = now()
         WHERE id = $1`,
        [existing.applicationId],
      );
      const resolution = applicationResolutionFromStatus("applied");
      if (resolution && client) {
        await resolveThreadsForApplication(client, existing.applicationId, resolution);
      }
    } else if (!isSchoolPersonalCategory(existing.category)) {
      return null;
    }

    await queryable.query(
      `UPDATE tasks
       SET status = 'completed',
           completed_at = now(),
           updated_at = now()
       WHERE id = $1`,
      [id],
    );

    if (client) await client.query("COMMIT");
    return await fetchTaskRow(db, id);
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function deleteTask(db: Queryable, id: string): Promise<boolean> {
  const existing = await getTaskById(db, id);
  if (!existing) return false;

  const client = "connect" in db ? await db.connect() : null;
  const queryable = client ?? db;
  try {
    if (client) await client.query("BEGIN");
    await queryable.query(`DELETE FROM tasks WHERE id = $1`, [id]);
    if (existing.applicationId) {
      await queryable.query(
        `DELETE FROM applications WHERE id = $1 AND status = 'todo'`,
        [existing.applicationId],
      );
    }
    if (client) await client.query("COMMIT");
    return true;
  } catch (error) {
    if (client) await client.query("ROLLBACK");
    throw error;
  } finally {
    if (client) client.release();
  }
}

export async function deleteTaskByPostingId(db: Queryable, postingId: string): Promise<boolean> {
  const { rows } = await db.query<{ id: string }>(
    `SELECT id FROM tasks
     WHERE posting_id = $1 AND status = 'open' AND category = 'application'`,
    [postingId],
  );
  if (!rows[0]) return false;
  return deleteTask(db, rows[0].id);
}

export function parseCreateTaskBody(body: Record<string, unknown>): CreateTaskInput | null {
  const category = typeof body.category === "string" ? body.category : "";
  if (!isTaskCategory(category)) return null;

  const title = parseRequiredText(body.title);
  if (!title) return null;

  let organization: string | null;
  if (category === "application") {
    const company = parseRequiredText(body.organization);
    if (!company) return null;
    organization = company;
  } else {
    const org = parseOptionalText(body.organization);
    if (org === null && body.organization !== undefined && body.organization !== null) {
      if (typeof body.organization !== "string") return null;
    }
    organization = org ?? null;
  }

  const notes = parseOptionalText(body.notes);
  if (notes === null && body.notes !== undefined && body.notes !== null) {
    if (typeof body.notes !== "string") return null;
  }

  let url: string | null = null;
  if (body.url !== undefined && body.url !== null && body.url !== "") {
    url = parseHttpUrl(body.url);
    if (!url) return null;
  }

  let dueAt: string | null = null;
  if (body.dueAt !== undefined && body.dueAt !== null && body.dueAt !== "") {
    const parsed = parseDueAt(body.dueAt);
    if (!parsed) return null;
    dueAt = parsed.toISOString();
  }

  const location = parseOptionalText(body.location);

  return {
    category,
    title,
    organization,
    url,
    notes: notes ?? null,
    dueAt,
    location: location ?? null,
  };
}

export function parsePatchTaskBody(body: Record<string, unknown>): PatchTaskInput | null {
  const patch: PatchTaskInput = {};

  if (body.title !== undefined) {
    const title = parseRequiredText(body.title);
    if (!title) return null;
    patch.title = title;
  }

  if (body.organization !== undefined) {
    if (body.organization !== null && typeof body.organization !== "string") return null;
    patch.organization = parseOptionalText(body.organization);
  }

  if (body.notes !== undefined) {
    if (body.notes !== null && typeof body.notes !== "string") return null;
    patch.notes = parseOptionalText(body.notes);
  }

  if (body.url !== undefined) {
    if (body.url !== null && body.url !== "") {
      const url = parseHttpUrl(body.url);
      if (!url) return null;
      patch.url = url;
    } else {
      patch.url = null;
    }
  }

  if (body.dueAt !== undefined) {
    if (body.dueAt === null || body.dueAt === "") {
      patch.dueAt = null;
    } else {
      const parsed = parseDueAt(body.dueAt);
      if (!parsed) return null;
      patch.dueAt = parsed.toISOString();
    }
  }

  if (body.postingId !== undefined) {
    if (body.postingId !== null && typeof body.postingId !== "string") return null;
    patch.postingId = body.postingId === null ? null : body.postingId;
  }

  if (
    patch.title === undefined &&
    patch.organization === undefined &&
    patch.notes === undefined &&
    patch.url === undefined &&
    patch.dueAt === undefined &&
    patch.postingId === undefined
  ) {
    return null;
  }

  return patch;
}
