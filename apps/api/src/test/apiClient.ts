import http from "node:http";
import type { AddressInfo } from "node:net";
import supertest from "supertest";
import { afterAll, beforeAll } from "vitest";
import { createApp } from "../app.js";

/**
 * One server per test file, bound to 127.0.0.1.
 *
 * Don't pass the app to supertest directly: it calls `listen(0)` (all
 * interfaces) but always requests 127.0.0.1. On macOS another process can
 * already hold that port on 127.0.0.1, and the request reaches it instead,
 * which showed up as random 404s (MT-03). Binding to 127.0.0.1 makes the OS
 * pick a port that's free there.
 */
let server: http.Server | null = null;
let baseUrl: string | null = null;

beforeAll(async () => {
  server = http.createServer(createApp());
  await new Promise<void>((resolve, reject) => {
    server!.once("error", reject);
    server!.listen(0, "127.0.0.1", () => resolve());
  });
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

afterAll(async () => {
  const s = server;
  server = null;
  baseUrl = null;
  if (s) await new Promise<void>((resolve) => s.close(() => resolve()));
});

export function apiClient(): supertest.SuperTest<supertest.Test> {
  if (!baseUrl) {
    throw new Error("apiClient() used outside a test: the test server starts in beforeAll.");
  }
  return supertest(baseUrl) as unknown as supertest.SuperTest<supertest.Test>;
}
