import { describe, expect, it } from "vitest";
import { apiClient } from "./test/apiClient.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("health", () => {
  it("GET /health returns ok", async () => {
    const res = await apiClient().get("/health");
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ok: true });
  });
});
