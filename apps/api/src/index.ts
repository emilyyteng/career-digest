import path from "node:path";
import { fileURLToPath } from "node:url";
import { config as loadEnv } from "dotenv";
import { createApp } from "./app.js";
import { migrate } from "./db.js";
import { startRankBatchWatcher } from "./rankBatchWatcher.js";
import { ensureUploadDir } from "./routes.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
loadEnv({ path: path.join(root, ".env") });

const app = createApp();
const port = Number(process.env.PORT ?? 3000);

await migrate();
await ensureUploadDir();
startRankBatchWatcher();

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
