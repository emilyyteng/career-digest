import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");
const defaultProfilePath = path.join(root, "config", "rank-profile.md");

export class RankProfileError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RankProfileError";
  }
}

let cachedPrompt: string | null = null;

/** Clear cached profile (for tests). */
export function resetRankProfileCache(): void {
  cachedPrompt = null;
}

export function resolveRankProfilePath(): string {
  const override = process.env.RANK_PROFILE_PATH?.trim();
  if (override) return path.resolve(override);
  return defaultProfilePath;
}

/** Load the rank system prompt from disk (cached after first read). */
export function getRankSystemPrompt(): string {
  if (cachedPrompt !== null) return cachedPrompt;

  const profilePath = resolveRankProfilePath();
  try {
    const raw = readFileSync(profilePath, "utf8");
    const trimmed = raw.trim();
    if (!trimmed) {
      throw new RankProfileError(`Rank profile is empty: ${profilePath}`);
    }
    cachedPrompt = trimmed;
    return cachedPrompt;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code;
    if (code === "ENOENT") {
      throw new RankProfileError(
        `Rank profile not found at ${profilePath}. Copy config/rank-profile.example.md to config/rank-profile.md and customize it (or set RANK_PROFILE_PATH).`,
      );
    }
    if (err instanceof RankProfileError) throw err;
    const message = err instanceof Error ? err.message : String(err);
    throw new RankProfileError(`Failed to read rank profile at ${profilePath}: ${message}`);
  }
}
