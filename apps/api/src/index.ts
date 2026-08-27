import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config as loadEnv } from "dotenv";
import { migrate } from "./db.js";
import { api, ensureUploadDir } from "./routes.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
loadEnv({ path: path.join(root, ".env") });

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.use(express.json({ limit: "2mb" }));
app.use("/api", api);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

await migrate();
await ensureUploadDir();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
