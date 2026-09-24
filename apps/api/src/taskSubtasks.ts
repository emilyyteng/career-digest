import type { Pool, PoolClient } from "pg";
import type { TaskKind, TaskRow } from "./tasks.js";

type Queryable = Pool | PoolClient;

export type TaskPriority = 0 | 1 | 2;

export type TaskSubtaskRow = {
  id: string;
  taskId: string;
  title: string;
  status: "open" | "completed";
  dueAt: string | null;
  dueKind: "deadline" | "target" | null;
  estimateMinutes: number | null;
  /** Explicit override; null means inherit parent. */
  priorityOverride: TaskPriority | null;
  /** Effective priority for display/sort (override ?? parent). */
  priority: TaskPriority | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const subtaskSelect = `
  SELECT
    s.id,
    s.task_id AS "taskId",
    s.title,
    s.status,
    s.due_at AS "dueAt",
    s.due_kind AS "dueKind",
    s.estimate_minutes AS "estimateMinutes",
    s.priority_override AS "priorityOverride",
    s.sort_order AS "sortOrder",
    s.completed_at AS "completedAt",
    s.created_at AS "createdAt",
    s.updated_at AS "updatedAt",
    t.priority AS "parentPriority"
  FROM task_subtasks s
  JOIN tasks t ON t.id = s.task_id
`;

type SubtaskDbRow = Omit<TaskSubtaskRow, "priority"> & {
  parentPriority: TaskPriority | null;
};

function mapSubtask(row: SubtaskDbRow): TaskSubtaskRow {
  const priorityOverride =
    row.priorityOverride === 0 || row.priorityOverride === 1 || row.priorityOverride === 2
      ? row.priorityOverride
      : null;
  const parentPriority =
    row.parentPriority === 0 || row.parentPriority === 1 || row.parentPriority === 2
      ? row.parentPriority
      : null;
  const completedAt =
    row.completedAt == null
      ? null
      : typeof row.completedAt === "string"
        ? row.completedAt
        : new Date(row.completedAt as unknown as string | Date).toISOString();
  const createdAt =
    typeof row.createdAt === "string"
      ? row.createdAt
      : new Date(row.createdAt as unknown as string | Date).toISOString();
  const updatedAt =
    typeof row.updatedAt === "string"
      ? row.updatedAt
      : new Date(row.updatedAt as unknown as string | Date).toISOString();
  const dueAt =
    row.dueAt == null
      ? null
      : typeof row.dueAt === "string"
        ? row.dueAt
        : new Date(row.dueAt as unknown as string | Date).toISOString();
  return {
    id: row.id,
    taskId: row.taskId,
    title: row.title,
    status: row.status,
    dueAt,
    dueKind:
      row.dueKind === "deadline" || row.dueKind === "target" ? row.dueKind : null,
    estimateMinutes: row.estimateMinutes,
    priorityOverride,
    priority: priorityOverride ?? parentPriority,
    sortOrder: row.sortOrder,
    completedAt,
    createdAt,
    updatedAt,
  };
}

/** Open by sort_order, then completed by completed_at ASC (completion order). */
function sortSubtasksForDisplay(rows: TaskSubtaskRow[]): TaskSubtaskRow[] {
  const open = rows
    .filter((r) => r.status === "open")
    .sort((a, b) => a.sortOrder - b.sortOrder || a.createdAt.localeCompare(b.createdAt));
  const done = rows
    .filter((r) => r.status === "completed")
    .sort((a, b) => {
      const ac = a.completedAt ?? "";
      const bc = b.completedAt ?? "";
      if (ac !== bc) return ac.localeCompare(bc);
      return a.sortOrder - b.sortOrder;
    });
  return [...open, ...done];
}

export async function listSubtasksForTasks(
  db: Queryable,
  taskIds: string[],
): Promise<Map<string, TaskSubtaskRow[]>> {
  const map = new Map<string, TaskSubtaskRow[]>();
  if (taskIds.length === 0) return map;
  const { rows } = await db.query<SubtaskDbRow>(
    `${subtaskSelect}
     WHERE s.task_id = ANY($1::uuid[])
       AND s.parent_subtask_id IS NULL`,
    [taskIds],
  );
  for (const row of rows) {
    const mapped = mapSubtask(row);
    const list = map.get(mapped.taskId);
    if (list) list.push(mapped);
    else map.set(mapped.taskId, [mapped]);
  }
  for (const [id, list] of map) {
    map.set(id, sortSubtasksForDisplay(list));
  }
  return map;
}

export async function attachSubtasksToTasks(
  db: Queryable,
  tasks: TaskRow[],
): Promise<TaskRow[]> {
  const miscIds = tasks.filter((t) => t.category === "misc").map((t) => t.id);
  const byTask = await listSubtasksForTasks(db, miscIds);
  return tasks.map((task) => {
    if (task.category !== "misc") {
      return { ...task, subtasks: [], subtaskProgress: null };
    }
    const subtasks = byTask.get(task.id) ?? [];
    const total = subtasks.length;
    const completed = subtasks.filter((s) => s.status === "completed").length;
    return {
      ...task,
      subtasks,
      subtaskProgress: total === 0 ? null : { completed, total },
    };
  });
}

function parsePriority(value: unknown): TaskPriority | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (n === 0 || n === 1 || n === 2) return n;
  throw Object.assign(new Error("priority must be 0, 1, 2, or null"), { status: 400 });
}

function parseEstimateMinutes(value: unknown): number | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isInteger(n) || n <= 0) {
    throw Object.assign(new Error("estimateMinutes must be a positive integer"), { status: 400 });
  }
  return n;
}

function parseDueAt(value: string | null | undefined): Date | null {
  if (value == null || value === "") return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

async function assertMiscParent(
  db: Queryable,
  taskId: string,
): Promise<{ id: string; category: TaskKind; priority: TaskPriority | null }> {
  const { rows } = await db.query<{
    id: string;
    category: TaskKind;
    priority: TaskPriority | null;
  }>(`SELECT id, category, priority FROM tasks WHERE id = $1`, [taskId]);
  const task = rows[0];
  if (!task) throw Object.assign(new Error("Task not found"), { status: 404 });
  if (task.category !== "misc") {
    throw Object.assign(new Error("Only misc tasks can have subtasks"), { status: 400 });
  }
  return task;
}

async function fetchSubtask(db: Queryable, id: string): Promise<TaskSubtaskRow | null> {
  const { rows } = await db.query<SubtaskDbRow>(`${subtaskSelect} WHERE s.id = $1`, [id]);
  return rows[0] ? mapSubtask(rows[0]) : null;
}

export async function createSubtask(
  db: Queryable,
  taskId: string,
  input: {
    title: string;
    dueAt?: string | null;
    dueKind?: "deadline" | "target" | null;
    estimateMinutes?: number | null;
    priorityOverride?: TaskPriority | null;
  },
): Promise<TaskSubtaskRow> {
  await assertMiscParent(db, taskId);
  const title = input.title.trim();
  if (!title) throw Object.assign(new Error("title is required"), { status: 400 });
  const dueAt =
    input.dueAt !== undefined ? parseDueAt(input.dueAt) : null;
  if (input.dueAt != null && input.dueAt !== "" && dueAt === null) {
    throw Object.assign(new Error("Invalid dueAt"), { status: 400 });
  }
  let dueKind: "deadline" | "target" | null = null;
  if (dueAt) {
    dueKind =
      input.dueKind === "deadline" || input.dueKind === "target"
        ? input.dueKind
        : "target";
  }
  const estimateMinutes =
    input.estimateMinutes !== undefined
      ? parseEstimateMinutes(input.estimateMinutes) ?? null
      : null;
  const priorityOverride =
    input.priorityOverride !== undefined
      ? parsePriority(input.priorityOverride) ?? null
      : null;

  const { rows: orderRows } = await db.query<{ next: string }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
     FROM task_subtasks
     WHERE task_id = $1 AND status = 'open' AND parent_subtask_id IS NULL`,
    [taskId],
  );
  const sortOrder = Number(orderRows[0]?.next ?? 0) || 0;

  const { rows } = await db.query<{ id: string }>(
    `INSERT INTO task_subtasks (
       task_id, title, due_at, due_kind, estimate_minutes, priority_override, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id`,
    [taskId, title, dueAt, dueKind, estimateMinutes, priorityOverride, sortOrder],
  );
  return (await fetchSubtask(db, rows[0]!.id))!;
}

export async function patchSubtask(
  db: Queryable,
  taskId: string,
  subtaskId: string,
  patch: {
    title?: string;
    dueAt?: string | null;
    dueKind?: "deadline" | "target" | null;
    estimateMinutes?: number | null;
    priorityOverride?: TaskPriority | null;
  },
): Promise<TaskSubtaskRow | null> {
  await assertMiscParent(db, taskId);
  const existing = await fetchSubtask(db, subtaskId);
  if (!existing || existing.taskId !== taskId) return null;

  const title =
    patch.title !== undefined ? patch.title.trim() : existing.title;
  if (!title) throw Object.assign(new Error("title is required"), { status: 400 });

  let dueAt: Date | null = existing.dueAt ? new Date(existing.dueAt) : null;
  if (patch.dueAt !== undefined) {
    dueAt = parseDueAt(patch.dueAt);
    if (patch.dueAt !== null && patch.dueAt !== "" && dueAt === null) {
      throw Object.assign(new Error("Invalid dueAt"), { status: 400 });
    }
  }

  let dueKind: "deadline" | "target" | null = existing.dueKind;
  if (patch.dueKind !== undefined) {
    dueKind =
      patch.dueKind === "deadline" || patch.dueKind === "target" ? patch.dueKind : null;
  }
  if (!dueAt) dueKind = null;
  else if (!dueKind) dueKind = "target";

  let estimateMinutes = existing.estimateMinutes;
  if (patch.estimateMinutes !== undefined) {
    estimateMinutes = parseEstimateMinutes(patch.estimateMinutes) ?? null;
  }

  let priorityOverride = existing.priorityOverride;
  if (patch.priorityOverride !== undefined) {
    priorityOverride = parsePriority(patch.priorityOverride) ?? null;
  }

  await db.query(
    `UPDATE task_subtasks
     SET title = $2,
         due_at = $3,
         due_kind = $4,
         estimate_minutes = $5,
         priority_override = $6,
         updated_at = now()
     WHERE id = $1`,
    [subtaskId, title, dueAt, dueKind, estimateMinutes, priorityOverride],
  );
  return fetchSubtask(db, subtaskId);
}

export async function completeSubtask(
  db: Queryable,
  taskId: string,
  subtaskId: string,
): Promise<TaskSubtaskRow | null> {
  await assertMiscParent(db, taskId);
  const existing = await fetchSubtask(db, subtaskId);
  if (!existing || existing.taskId !== taskId || existing.status !== "open") return null;

  await db.query(
    `UPDATE task_subtasks
     SET status = 'completed',
         completed_at = now(),
         updated_at = now()
     WHERE id = $1`,
    [subtaskId],
  );
  // Compact open sort orders
  await db.query(
    `WITH ordered AS (
       SELECT id, ROW_NUMBER() OVER (ORDER BY sort_order, created_at) - 1 AS next_order
       FROM task_subtasks
       WHERE task_id = $1 AND status = 'open' AND parent_subtask_id IS NULL
     )
     UPDATE task_subtasks s
     SET sort_order = ordered.next_order
     FROM ordered
     WHERE s.id = ordered.id`,
    [taskId],
  );
  return fetchSubtask(db, subtaskId);
}

export async function reopenSubtask(
  db: Queryable,
  taskId: string,
  subtaskId: string,
): Promise<TaskSubtaskRow | null> {
  await assertMiscParent(db, taskId);
  const existing = await fetchSubtask(db, subtaskId);
  if (!existing || existing.taskId !== taskId || existing.status !== "completed") return null;

  const { rows: orderRows } = await db.query<{ next: string }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next
     FROM task_subtasks
     WHERE task_id = $1 AND status = 'open' AND parent_subtask_id IS NULL`,
    [taskId],
  );
  const sortOrder = Number(orderRows[0]?.next ?? 0) || 0;

  await db.query(
    `UPDATE task_subtasks
     SET status = 'open',
         completed_at = NULL,
         sort_order = $2,
         updated_at = now()
     WHERE id = $1`,
    [subtaskId, sortOrder],
  );
  return fetchSubtask(db, subtaskId);
}

export async function deleteSubtask(
  db: Queryable,
  taskId: string,
  subtaskId: string,
): Promise<boolean> {
  await assertMiscParent(db, taskId);
  const result = await db.query(
    `DELETE FROM task_subtasks WHERE id = $1 AND task_id = $2`,
    [subtaskId, taskId],
  );
  return (result.rowCount ?? 0) > 0;
}

export async function moveSubtask(
  db: Queryable,
  taskId: string,
  subtaskId: string,
  direction: "up" | "down",
): Promise<TaskSubtaskRow[] | null> {
  await assertMiscParent(db, taskId);
  const { rows } = await db.query<{ id: string; sort_order: number }>(
    `SELECT id, sort_order
     FROM task_subtasks
     WHERE task_id = $1 AND status = 'open' AND parent_subtask_id IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    [taskId],
  );
  const index = rows.findIndex((r) => r.id === subtaskId);
  if (index < 0) return null;
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (swapWith < 0 || swapWith >= rows.length) {
    const byTask = await listSubtasksForTasks(db, [taskId]);
    return byTask.get(taskId) ?? [];
  }
  const a = rows[index]!;
  const b = rows[swapWith]!;
  await db.query(
    `UPDATE task_subtasks SET sort_order = CASE id
       WHEN $1 THEN $3
       WHEN $2 THEN $4
       ELSE sort_order
     END,
     updated_at = now()
     WHERE id IN ($1, $2)`,
    [a.id, b.id, b.sort_order, a.sort_order],
  );
  const byTask = await listSubtasksForTasks(db, [taskId]);
  return byTask.get(taskId) ?? [];
}

/** Reorder open subtasks to match orderedIds (must be a permutation of current open ids). */
export async function reorderSubtasks(
  db: Queryable,
  taskId: string,
  orderedIds: string[],
): Promise<TaskSubtaskRow[] | null> {
  await assertMiscParent(db, taskId);
  const { rows } = await db.query<{ id: string }>(
    `SELECT id
     FROM task_subtasks
     WHERE task_id = $1 AND status = 'open' AND parent_subtask_id IS NULL
     ORDER BY sort_order ASC, created_at ASC`,
    [taskId],
  );
  const current = rows.map((r) => r.id);
  if (orderedIds.length !== current.length) {
    throw Object.assign(new Error("orderedIds must include every open subtask once"), {
      status: 400,
    });
  }
  const currentSet = new Set(current);
  for (const id of orderedIds) {
    if (!currentSet.has(id)) {
      throw Object.assign(new Error("orderedIds contains unknown subtask"), { status: 400 });
    }
  }
  if (new Set(orderedIds).size !== orderedIds.length) {
    throw Object.assign(new Error("orderedIds must be unique"), { status: 400 });
  }

  for (let i = 0; i < orderedIds.length; i += 1) {
    await db.query(
      `UPDATE task_subtasks SET sort_order = $2, updated_at = now() WHERE id = $1`,
      [orderedIds[i], i],
    );
  }
  const byTask = await listSubtasksForTasks(db, [taskId]);
  return byTask.get(taskId) ?? [];
}

export async function completeOpenSubtasksForTask(
  db: Queryable,
  taskId: string,
): Promise<void> {
  await db.query(
    `UPDATE task_subtasks
     SET status = 'completed',
         completed_at = COALESCE(completed_at, now()),
         updated_at = now()
     WHERE task_id = $1 AND status = 'open'`,
    [taskId],
  );
}

export function parseTaskPriority(value: unknown): TaskPriority | null | undefined {
  return parsePriority(value);
}

export function parseTaskEstimateMinutes(value: unknown): number | null | undefined {
  return parseEstimateMinutes(value);
}

export type { TaskKind };
