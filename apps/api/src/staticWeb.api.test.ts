import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "./app.js";

describe("static web packaging", () => {
  it("serves index.html for / and unknown SPA routes when web dist is configured", async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "career-digest-web-"));
    await writeFile(
      path.join(dir, "index.html"),
      "<!doctype html><title>packaged-demo</title><div id='root'></div>",
    );
    await writeFile(path.join(dir, "app.js"), "window.__packaged = true;");

    const client = request(createApp({ webDistPath: dir }));

    const home = await client.get("/").expect(200);
    expect(home.text).toContain("packaged-demo");

    const spa = await client.get("/jobs").expect(200);
    expect(spa.text).toContain("packaged-demo");

    const asset = await client.get("/app.js").expect(200);
    expect(asset.text).toContain("__packaged");

    await client.get("/health").expect(200);

    const apiMiss = await client.get("/api/__packaging_probe__");
    expect(apiMiss.status).toBeGreaterThanOrEqual(400);
    expect(String(apiMiss.headers["content-type"] ?? "")).not.toMatch(/html/i);
  });

  it("does not mount SPA routes when web dist is omitted", async () => {
    const client = request(createApp());
    await client.get("/").expect(404);
  });
});
