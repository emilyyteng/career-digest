import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { defineConfig } from "vitest/config";
import { requireTestDatabaseUrl } from "./src/test/testDatabaseGuards.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../..");
loadEnv({ path: path.join(root, ".env") });

const testDatabaseUrl = requireTestDatabaseUrl();

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: "unit",
          include: ["src/**/*.test.ts"],
          exclude: ["src/**/*.integration.test.ts", "src/**/*.api.test.ts"],
          environment: "node",
          pool: "forks",
          env: {
            DATABASE_URL: testDatabaseUrl,
            TEST_DATABASE_URL: testDatabaseUrl,
            VITEST: "true",
          },
        },
      },
      {
        test: {
          name: "integration",
          include: ["src/**/*.integration.test.ts", "src/**/*.api.test.ts"],
          environment: "node",
          pool: "forks",
          fileParallelism: false,
          poolOptions: {
            forks: {
              singleFork: true,
            },
          },
          setupFiles: ["src/test/integrationSetup.ts"],
          testTimeout: 30_000,
          env: {
            DATABASE_URL: testDatabaseUrl,
            TEST_DATABASE_URL: testDatabaseUrl,
            VITEST: "true",
          },
        },
      },
    ],
  },
});
