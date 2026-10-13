import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { migrate, pool } from "./db.js";
import { integrationReady } from "./test/integrationSetup.js";

async function droppedColumnCount(): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT count(*)::text AS n
     FROM pg_attribute a
     JOIN pg_class c ON c.oid = a.attrelid
     JOIN pg_namespace ns ON ns.oid = c.relnamespace
     WHERE ns.nspname = 'public' AND c.relkind = 'r' AND a.attnum > 0 AND a.attisdropped`,
  );
  return Number(rows[0]?.n ?? 0);
}

async function sqlDirWith(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(path.join(tmpdir(), "mt06-"));
  for (const [name, sql] of Object.entries(files)) {
    await writeFile(path.join(dir, name), sql, "utf8");
  }
  return dir;
}

const PROBE = `CREATE TABLE IF NOT EXISTS mt06_probe (id serial PRIMARY KEY);
INSERT INTO mt06_probe DEFAULT VALUES;`;

describe.skipIf(!integrationReady)("migrate", () => {
  const dirs: string[] = [];

  afterEach(async () => {
    await pool.query(`DELETE FROM schema_migrations WHERE name LIKE '9%\\_mt06\\_%'`);
    await pool.query(`DROP TABLE IF EXISTS mt06_probe, mt06_fail`);
    for (const dir of dirs.splice(0)) await rm(dir, { recursive: true, force: true });
  });

  it("a second run on an up-to-date database applies nothing and drops no columns", async () => {
    const before = await droppedColumnCount();
    const { applied } = await migrate();
    expect(applied).toEqual([]);
    expect(await droppedColumnCount()).toBe(before);
  });

  it("refuses to run when an applied migration was edited", async () => {
    const dir = await sqlDirWith({ "900_mt06_probe.sql": PROBE });
    dirs.push(dir);
    expect((await migrate({ sqlDir: dir })).applied).toEqual(["900_mt06_probe.sql"]);

    await writeFile(path.join(dir, "900_mt06_probe.sql"), `${PROBE}\n-- edited`, "utf8");
    await expect(migrate({ sqlDir: dir })).rejects.toThrow(
      /900_mt06_probe\.sql was edited after it was applied/,
    );
  });

  it("concurrent runs apply each file once", async () => {
    const dir = await sqlDirWith({ "901_mt06_probe.sql": PROBE });
    dirs.push(dir);
    const results = await Promise.all([
      migrate({ sqlDir: dir }),
      migrate({ sqlDir: dir }),
      migrate({ sqlDir: dir }),
    ]);
    expect(results.flatMap((r) => r.applied)).toEqual(["901_mt06_probe.sql"]);
    const { rows } = await pool.query<{ n: string }>(
      `SELECT count(*)::text AS n FROM mt06_probe`,
    );
    expect(Number(rows[0]?.n)).toBe(1);
  });

  it("a failing migration rolls back and isn't recorded", async () => {
    const dir = await sqlDirWith({
      "902_mt06_fail.sql": `CREATE TABLE mt06_fail (id int); SELECT 1 / 0;`,
    });
    dirs.push(dir);
    await expect(migrate({ sqlDir: dir })).rejects.toThrow(/902_mt06_fail\.sql failed/);
    const { rows } = await pool.query<{ t: string | null; recorded: boolean }>(
      `SELECT to_regclass('public.mt06_fail')::text AS t,
              EXISTS (SELECT 1 FROM schema_migrations WHERE name = '902_mt06_fail.sql') AS recorded`,
    );
    expect(rows[0]).toEqual({ t: null, recorded: false });
  });
});
