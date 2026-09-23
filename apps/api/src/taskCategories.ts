import type { Pool, PoolClient } from "pg";

type Queryable = Pool | PoolClient;

export type TaskCategoryKind = "application" | "misc";

export type TaskCategoryRow = {
  id: string;
  name: string;
  kind: TaskCategoryKind;
  system: boolean;
  sortOrder: number;
  openCount: number;
};

const categorySelect = `
  SELECT
    c.id,
    c.name,
    c.kind,
    c.system,
    c.sort_order AS "sortOrder",
    COUNT(t.id) FILTER (WHERE t.status = 'open')::int AS "openCount"
  FROM task_categories c
  LEFT JOIN tasks t ON t.category_id = c.id
`;

export async function listTaskCategories(db: Queryable): Promise<TaskCategoryRow[]> {
  const { rows } = await db.query<TaskCategoryRow>(
    `${categorySelect}
     GROUP BY c.id
     ORDER BY c.sort_order ASC, c.created_at ASC`,
  );
  return rows;
}

export async function getTaskCategoryById(
  db: Queryable,
  id: string,
): Promise<TaskCategoryRow | null> {
  const { rows } = await db.query<TaskCategoryRow>(
    `${categorySelect}
     WHERE c.id = $1
     GROUP BY c.id`,
    [id],
  );
  return rows[0] ?? null;
}

export async function getApplicationTaskCategory(db: Queryable): Promise<TaskCategoryRow> {
  const { rows } = await db.query<TaskCategoryRow>(
    `${categorySelect}
     WHERE c.kind = 'application'
     GROUP BY c.id
     LIMIT 1`,
  );
  if (!rows[0]) {
    throw new Error("Applications task category is missing — run migrations");
  }
  return rows[0];
}

export async function createTaskCategory(
  db: Queryable,
  name: string,
): Promise<TaskCategoryRow> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error("name is required"), { status: 400 });
  }
  try {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO task_categories (name, kind, system, sort_order)
       VALUES ($1, 'misc', false, 1000)
       RETURNING id`,
      [trimmed],
    );
    return (await getTaskCategoryById(db, rows[0]!.id))!;
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      throw Object.assign(new Error("A category with that name already exists"), { status: 409 });
    }
    throw error;
  }
}

export async function renameTaskCategory(
  db: Queryable,
  id: string,
  name: string,
): Promise<TaskCategoryRow | null> {
  const trimmed = name.trim();
  if (!trimmed) {
    throw Object.assign(new Error("name is required"), { status: 400 });
  }
  const existing = await getTaskCategoryById(db, id);
  if (!existing) return null;
  if (existing.kind === "application" || existing.system) {
    throw Object.assign(new Error("Applications category cannot be renamed"), { status: 400 });
  }
  try {
    await db.query(
      `UPDATE task_categories SET name = $2, updated_at = now() WHERE id = $1`,
      [id, trimmed],
    );
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "23505") {
      throw Object.assign(new Error("A category with that name already exists"), { status: 409 });
    }
    throw error;
  }
  return getTaskCategoryById(db, id);
}

export async function deleteTaskCategory(db: Queryable, id: string): Promise<"ok" | "missing" | "blocked"> {
  const existing = await getTaskCategoryById(db, id);
  if (!existing) return "missing";
  if (existing.kind === "application" || existing.system) {
    throw Object.assign(new Error("Applications category cannot be deleted"), { status: 400 });
  }
  if (existing.openCount > 0) {
    return "blocked";
  }
  // Completed misc tasks in this category: move to Admin so history isn't orphaned.
  const admin = await db.query<{ id: string }>(
    `SELECT id FROM task_categories WHERE lower(name) = 'admin' AND kind = 'misc' LIMIT 1`,
  );
  const adminId = admin.rows[0]?.id;
  if (adminId && adminId !== id) {
    await db.query(
      `UPDATE tasks SET category_id = $2, updated_at = now()
       WHERE category_id = $1 AND status = 'completed'`,
      [id, adminId],
    );
  }
  await db.query(`DELETE FROM task_categories WHERE id = $1`, [id]);
  return "ok";
}
