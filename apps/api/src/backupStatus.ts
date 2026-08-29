import { access, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
export const BACKUPS_DIR = path.join(root, "backups");
export const BACKUP_META_PATH = path.join(BACKUPS_DIR, "latest.json");
export const BACKUP_RETENTION_DAYS = 14;

type BackupMeta = {
  at: string;
  file: string;
  sizeBytes: number;
};

export type BackupStatusSnapshot = {
  directory: string;
  retentionDays: number;
  lastAt: string | null;
  lastFile: string | null;
  sizeBytes: number | null;
  backupCount: number;
};

async function readLatestMeta(): Promise<BackupMeta | null> {
  try {
    const raw = await readFile(BACKUP_META_PATH, "utf8");
    const parsed = JSON.parse(raw) as BackupMeta;
    if (!parsed.at || !parsed.file) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function scanLatestDump(): Promise<{ file: string; at: string; sizeBytes: number } | null> {
  try {
    await access(BACKUPS_DIR);
  } catch {
    return null;
  }
  const names = await readdir(BACKUPS_DIR);
  const dumps = names.filter((name) => name.endsWith(".dump")).sort().reverse();
  if (dumps.length === 0) return null;
  const file = dumps[0]!;
  const filePath = path.join(BACKUPS_DIR, file);
  const info = await stat(filePath);
  return {
    file,
    at: info.mtime.toISOString(),
    sizeBytes: info.size,
  };
}

export async function getBackupStatus(): Promise<BackupStatusSnapshot> {
  const meta = await readLatestMeta();
  const scanned = await scanLatestDump();

  let backupCount = 0;
  try {
    const names = await readdir(BACKUPS_DIR);
    backupCount = names.filter((name) => name.endsWith(".dump")).length;
  } catch {
    backupCount = 0;
  }

  const lastFile = meta?.file ?? scanned?.file ?? null;
  const lastAt = meta?.at ?? scanned?.at ?? null;
  const sizeBytes = meta?.sizeBytes ?? scanned?.sizeBytes ?? null;

  return {
    directory: "backups/",
    retentionDays: BACKUP_RETENTION_DAYS,
    lastAt,
    lastFile,
    sizeBytes,
    backupCount,
  };
}
