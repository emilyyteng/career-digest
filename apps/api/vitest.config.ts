import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    pool: "forks",
    // Pure unit tests should not require a live DB; set a dummy URL if a module
    // accidentally loads db.ts during collection.
    env: {
      DATABASE_URL: "postgres://career_digest:career_digest@127.0.0.1:5432/career_digest_test",
    },
  },
});
