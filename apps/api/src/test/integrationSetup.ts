import { afterAll, beforeAll, beforeEach } from "vitest";
import { migrate, pool } from "../db.js";
import { ensureUploadDir } from "../routes.js";
import { truncateAll } from "./dbHarness.js";
import { assertTestDatabaseMutationAllowed } from "./testDatabaseGuards.js";

export const integrationReady = await (async (): Promise<boolean> => {
  try {
    assertTestDatabaseMutationAllowed();
    await pool.query("SELECT 1");
    await migrate();
    return true;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Integration tests skipped: database not available (${message})`);
    return false;
  }
})();

if (integrationReady) {
  beforeAll(async () => {
    await ensureUploadDir();
  });

  beforeEach(async () => {
    await truncateAll();
  });

  afterAll(async () => {
    await pool.end();
  });
}
