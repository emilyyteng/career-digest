import express from "express";
import { api } from "./routes.js";

export function createApp(): express.Express {
  const app = express();
  app.use(express.json({ limit: "2mb" }));
  app.use("/api", api);
  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });
  return app;
}
