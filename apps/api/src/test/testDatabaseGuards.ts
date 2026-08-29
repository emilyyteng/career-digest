/** Shared guards so integration tests never mutate the dev database. */

export function databaseNameFromUrl(url: string): string | null {
  try {
    return new URL(url).pathname.replace(/^\//, "") || null;
  } catch {
    const match = url.match(/\/([^/?]+)(?:\?|$)/);
    return match?.[1] ?? null;
  }
}

function isTestDatabaseName(dbName: string): boolean {
  return dbName.endsWith("_test");
}

/**
 * Require Vitest + TEST_DATABASE_URL pointing at a *_test database.
 * Call before any test harness operation that truncates or bulk-deletes rows.
 */
export function assertTestDatabaseMutationAllowed(): void {
  if (process.env.VITEST !== "true") {
    throw new Error(
      "Refusing database mutation outside Vitest (set VITEST=true in the test runner).",
    );
  }

  const testUrl = process.env.TEST_DATABASE_URL?.trim();
  if (!testUrl) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Add it to .env (see .env.example) before running integration tests.",
    );
  }

  const activeUrl = process.env.DATABASE_URL?.trim();
  if (!activeUrl || activeUrl !== testUrl) {
    throw new Error(
      "Test worker DATABASE_URL must exactly match TEST_DATABASE_URL. Check vitest.config.ts.",
    );
  }

  const dbName = databaseNameFromUrl(testUrl);
  if (!dbName || !isTestDatabaseName(dbName)) {
    throw new Error(
      `TEST_DATABASE_URL must use a database name ending in _test (got "${dbName ?? "unknown"}").`,
    );
  }

  if (process.env.ALLOW_DEV_TRUNCATE === "1") {
    throw new Error("ALLOW_DEV_TRUNCATE is not supported; use a *_test database.");
  }
}

/** Vitest config: required test database URL from .env or CI env. */
export function requireTestDatabaseUrl(): string {
  const url = process.env.TEST_DATABASE_URL?.trim();
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is required to run tests. Copy .env.example → .env and create the test database.",
    );
  }
  const dbName = databaseNameFromUrl(url);
  if (!dbName || !isTestDatabaseName(dbName)) {
    throw new Error(
      `TEST_DATABASE_URL must point to a *_test database (got "${dbName ?? "unknown"}").`,
    );
  }
  return url;
}
