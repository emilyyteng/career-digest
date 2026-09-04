import { existsSync } from "node:fs";
import path from "node:path";
import express from "express";
import { api } from "./routes.js";

export type CreateAppOptions = {
  /** Absolute path to Vite `apps/web/dist`. When present, the API serves the SPA. */
  webDistPath?: string | null;
};

export function createApp(options: CreateAppOptions = {}): express.Express {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", api);
  // Unmatched /api routes must stay JSON — do not fall through to the SPA HTML shell.
  app.use("/api", (_req, res) => {
    res.status(404).json({ error: "Not found" });
  });
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  const webDistPath = options.webDistPath?.trim() || null;
  if (webDistPath && existsSync(webDistPath)) {
    mountWebApp(app, webDistPath);
  }

  return app;
}

/** Serve Vite build output and fall back to index.html for client-side routes. */
export function mountWebApp(app: express.Express, webDistPath: string): void {
  app.use(express.static(webDistPath, { index: false, fallthrough: true }));
  app.use((req, res, next) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      next();
      return;
    }
    // Use originalUrl: after an unmatched /api router, req.path may be stripped.
    const pathname = (req.originalUrl ?? req.url).split("?")[0] ?? "";
    if (pathname.startsWith("/api") || pathname === "/health") {
      next();
      return;
    }
    res.sendFile(path.join(webDistPath, "index.html"), (err) => {
      if (err) next(err);
    });
  });
}
