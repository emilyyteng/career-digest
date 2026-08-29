import type { Pool, PoolClient } from "pg";

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
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const taskSelect = `
  SELECT
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
    completed_at AS "completedAt",
    created_at AS "createdAt",
    updated_at AS "updatedAt"
  FROM tasks
`;

export function isTaskCategory(value: string): value is TaskCategory {
  return (TASK_CATEGORIES as readonly string[]).includes(value);
}

export function isSchoolPersonalCategory(value: string): value is "school" | "personal" {
  return value === "school" || value === "personal";
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

async function countSchoolPersonalTasks(
  db: Queryable,
): Promise<{ open: number; completed: number }> {
  const { rows } = await db.query<{ status: string; count: string }>(
    `SELECT status, COUNT(*)::text AS count
     FROM tasks
     WHERE category IN ('school', 'personal')
     GROUP BY status`,
  );
  let open = 0;
  let completed = 0;
  for (const row of rows) {
    const n = Number(row.count) || 0;
    if (row.status === "open") open = n;
    if (row.status === "completed") completed = n;
  }
  return { open, completed };
}

export async function listTasks(db: Queryable, view: TaskView): Promise<{
  view: TaskView;
  count: number;
  counts: { open: number; completed: number };
  tasks: TaskRow[];
}> {
  const counts = await countSchoolPersonalTasks(db);
  if (view === "open") {
    const { rows } = await db.query<TaskRow>(
      `${taskSelect}
       WHERE status = 'open' AND category IN ('school', 'personal')
       ORDER BY due_at ASC NULLS LAST, created_at DESC`,
    );
    return { view, count: rows.length, counts, tasks: rows };
  }
  const { rows } = await db.query<TaskRow>(
    `${taskSelect}
     WHERE status = 'completed' AND category IN ('school', 'personal')
     ORDER BY completed_at DESC NULLS LAST, created_at DESC`,
  );
  return { view, count: rows.length, counts, tasks: rows };
}

export async function getTaskById(db: Queryable, id: string): Promise<TaskRow | null> {
  const { rows } = await db.query<TaskRow>(`${taskSelect} WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export type CreateTaskInput = {
  category: TaskCategory;
  title: string;
  organization?: string | null;
  url?: string | null;
  notes?: string | null;
  dueAt?: string | null;
};

export async function createTask(db: Queryable, input: CreateTaskInput): Promise<TaskRow> {
  const { rows } = await db.query<TaskRow>(
    `INSERT INTO tasks (category, title, organization, url, notes, due_at)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING
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
       completed_at AS "completedAt",
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [
      input.category,
      input.title,
      input.organization ?? null,
      input.url ?? null,
      input.notes ?? null,
      input.dueAt ? new Date(input.dueAt) : null,
    ],
  );
  return rows[0]!;
}

export type PatchTaskInput = {
  title?: string;
  organization?: string | null;
  url?: string | null;
  notes?: string | null;
  dueAt?: string | null;
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

  const { rows } = await db.query<TaskRow>(
    `UPDATE tasks
     SET title = $2,
         organization = $3,
         url = $4,
         notes = $5,
         due_at = $6,
         updated_at = now()
     WHERE id = $1
     RETURNING
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
       completed_at AS "completedAt",
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [id, title, organization, url, notes, dueAt],
  );
  return rows[0] ?? null;
}

export async function completeTask(db: Queryable, id: string): Promise<TaskRow | null> {
  const existing = await getTaskById(db, id);
  if (!existing || existing.status !== "open") return null;
  if (!isSchoolPersonalCategory(existing.category)) return null;

  const { rows } = await db.query<TaskRow>(
    `UPDATE tasks
     SET status = 'completed',
         completed_at = now(),
         updated_at = now()
     WHERE id = $1
     RETURNING
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
       completed_at AS "completedAt",
       created_at AS "createdAt",
       updated_at AS "updatedAt"`,
    [id],
  );
  return rows[0] ?? null;
}

export async function deleteTask(db: Queryable, id: string): Promise<boolean> {
  const result = await db.query(`DELETE FROM tasks WHERE id = $1 RETURNING id`, [id]);
  return Boolean(result.rows[0]);
}

export function parseCreateTaskBody(body: Record<string, unknown>): CreateTaskInput | null {
  const category = typeof body.category === "string" ? body.category : "";
  if (!isSchoolPersonalCategory(category)) return null;

  const title = parseRequiredText(body.title);
  if (!title) return null;

  const organization = parseOptionalText(body.organization);
  if (organization === null && body.organization !== undefined && body.organization !== null) {
    if (typeof body.organization !== "string") return null;
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

  return {
    category,
    title,
    organization: organization ?? null,
    url,
    notes: notes ?? null,
    dueAt,
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

  if (
    patch.title === undefined &&
    patch.organization === undefined &&
    patch.notes === undefined &&
    patch.url === undefined &&
    patch.dueAt === undefined
  ) {
    return null;
  }

  return patch;
}
