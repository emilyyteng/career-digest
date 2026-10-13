import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";
import { config as loadEnv } from "dotenv";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
loadEnv({ path: path.join(root, ".env") });

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Copy .env.example to .env");
}

export const pool = new pg.Pool({ connectionString });

const DEFAULT_SQL_DIR = path.join(fileURLToPath(new URL(".", import.meta.url)), "sql");

/** Arbitrary constant; any process migrating this database takes the same lock. */
const MIGRATION_LOCK_KEY = 4_708_210_001;

function checksum(sql: string): string {
  return createHash("sha256").update(sql).digest("hex");
}

/**
 * Apply each `.sql` file in `sqlDir` once, in name order, recording it in
 * `schema_migrations`. Applied files must not be edited: a changed checksum
 * stops the run, so schema changes always go in a new file.
 * On a database without the table every file runs once (they were written to
 * be re-runnable) and is then recorded.
 */
export async function migrate(
  opts: { sqlDir?: string } = {},
): Promise<{ applied: string[] }> {
  const sqlDir = opts.sqlDir ?? DEFAULT_SQL_DIR;
  const files = (await readdir(sqlDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();

  const client = await pool.connect();
  const applied: string[] = [];
  try {
    await client.query("SELECT pg_advisory_lock($1)", [MIGRATION_LOCK_KEY]);
    await client.query(
      `CREATE TABLE IF NOT EXISTS schema_migrations (
         name text PRIMARY KEY,
         checksum text NOT NULL,
         applied_at timestamptz NOT NULL DEFAULT now()
       )`,
    );
    const { rows } = await client.query<{ name: string; checksum: string }>(
      "SELECT name, checksum FROM schema_migrations",
    );
    const recorded = new Map(rows.map((r) => [r.name, r.checksum]));

    for (const name of files) {
      const sql = await readFile(path.join(sqlDir, name), "utf8");
      const sum = checksum(sql);
      const previous = recorded.get(name);
      if (previous !== undefined) {
        if (previous !== sum) {
          throw new Error(
            `Migration ${name} was edited after it was applied. Revert the edit and put the change in a new migration file.`,
          );
        }
        continue;
      }
      try {
        await client.query("BEGIN");
        await client.query(sql);
        await client.query(
          "INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)",
          [name, sum],
        );
        await client.query("COMMIT");
      } catch (err) {
        await client.query("ROLLBACK");
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Migration ${name} failed: ${message}`);
      }
      applied.push(name);
    }
  } finally {
    await client
      .query("SELECT pg_advisory_unlock($1)", [MIGRATION_LOCK_KEY])
      .catch(() => {});
    client.release();
  }
  return { applied };
}
