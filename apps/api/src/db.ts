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

export async function migrate(): Promise<void> {
  const sqlDir = path.join(fileURLToPath(new URL(".", import.meta.url)), "sql");
  const files = (await readdir(sqlDir))
    .filter((name) => name.endsWith(".sql"))
    .sort();
  for (const name of files) {
    const sql = await readFile(path.join(sqlDir, name), "utf8");
    await pool.query(sql);
  }
}
