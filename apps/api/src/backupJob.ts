import { execFile } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const STATE_PATH = path.join(root, "data/backup-job.json");
const SCRIPT_PATH = path.join(root, "scripts/backup-db.sh");

export type BackupJobSnapshot = {
  status: "idle" | "running" | "ok" | "error";
  startedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  error: string | null;
};

function blank(): BackupJobSnapshot {
  return {
    status: "idle",
    startedAt: null,
    finishedAt: null,
    lastOkAt: null,
    error: null,
  };
}

let state = blank();
let running: Promise<void> | null = null;
let loaded = false;

async function persist(): Promise<void> {
  await mkdir(path.dirname(STATE_PATH), { recursive: true });
  await writeFile(STATE_PATH, `${JSON.stringify(state)}\n`);
}

async function ensureLoaded(): Promise<void> {
  if (loaded) return;
  loaded = true;
  try {
    const raw = JSON.parse(await readFile(STATE_PATH, "utf8")) as Partial<BackupJobSnapshot>;
    state = {
      status:
        raw.status === "running"
          ? "error"
          : raw.status === "ok" || raw.status === "error"
            ? raw.status
            : "idle",
      startedAt: typeof raw.startedAt === "string" ? raw.startedAt : null,
      finishedAt:
        raw.status === "running"
          ? new Date().toISOString()
          : typeof raw.finishedAt === "string"
            ? raw.finishedAt
            : null,
      lastOkAt: typeof raw.lastOkAt === "string" ? raw.lastOkAt : null,
      error:
        raw.status === "running"
          ? "Backup interrupted by API restart"
          : typeof raw.error === "string"
            ? raw.error
            : null,
    };
    if (raw.status === "running") await persist();
  } catch {
    state = blank();
  }
}

async function executeBackup(): Promise<void> {
  await execFileAsync("bash", [SCRIPT_PATH], {
    cwd: root,
    env: process.env,
    timeout: 10 * 60 * 1000,
  });
  const finishedAt = new Date().toISOString();
  state = {
    status: "ok",
    startedAt: state.startedAt,
    finishedAt,
    lastOkAt: finishedAt,
    error: null,
  };
}

export async function getBackupJob(): Promise<BackupJobSnapshot> {
  await ensureLoaded();
  return { ...state };
}

export async function startBackupJob(): Promise<{
  started: boolean;
  snapshot: BackupJobSnapshot;
}> {
  await ensureLoaded();
  if (state.status === "running" || running) {
    return { started: false, snapshot: { ...state } };
  }

  state = {
    status: "running",
    startedAt: new Date().toISOString(),
    finishedAt: null,
    lastOkAt: state.lastOkAt,
    error: null,
  };
  await persist();

  running = (async () => {
    try {
      await executeBackup();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      state = {
        status: "error",
        startedAt: state.startedAt,
        finishedAt: new Date().toISOString(),
        lastOkAt: state.lastOkAt,
        error: message,
      };
      console.error(`backup failed: ${message}`);
    } finally {
      running = null;
      await persist();
    }
  })();

  return { started: true, snapshot: { ...state } };
}
