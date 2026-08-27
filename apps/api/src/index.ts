import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import { config as loadEnv } from "dotenv";
import { migrate, pool } from "./db.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
loadEnv({ path: path.join(root, ".env") });

const app = express();
const port = Number(process.env.PORT ?? 3000);

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.get("/jobs", async (_req, res) => {
  const result = await pool.query(
    `SELECT
       p.id,
       p.source,
       p.external_id AS "externalId",
       c.name AS company,
       p.title,
       p.location,
       p.department,
       p.url,
       p.is_internship AS "isInternship",
       p.cycle_status AS "cycleStatus",
       p.first_published_at AS "firstPublishedAt",
       p.source_updated_at AS "sourceUpdatedAt",
       p.first_seen_at AS "firstSeenAt",
       p.last_seen_at AS "lastSeenAt"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.removed_from_board_at IS NULL
       AND p.is_internship
     ORDER BY
       CASE p.cycle_status WHEN 'target' THEN 0 WHEN 'optional' THEN 1 ELSE 2 END,
       p.last_seen_at DESC`,
  );
  res.json({ count: result.rows.length, jobs: result.rows });
});

await migrate();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
