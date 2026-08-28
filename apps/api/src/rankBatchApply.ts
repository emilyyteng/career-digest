import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI from "openai";
import { pool } from "./db.js";
import {
  clearBatchState,
  isBatchStateStale,
  loadBatchState,
  patchBatchProgress,
  recordRankBatchSuccess,
} from "./rankBatchStatus.js";
import { RANK_PROMPT_VERSION, parseRankResult, type RankResult } from "./rankPrompt.js";

const root = path.resolve(fileURLToPath(new URL(".", import.meta.url)), "../../..");

type BatchOutputLine = {
  custom_id?: string;
  response?: {
    status_code?: number;
    body?: {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
  };
  error?: { message?: string } | null;
};

export type BatchFiles = {
  status: string;
  output_file_id?: string | null;
  error_file_id?: string | null;
};

export async function applyScore(id: string, result: RankResult, model: string): Promise<void> {
  await pool.query(
    `UPDATE postings
     SET rank_score = $2,
         rank_eligible = $3,
         rank_reason = $4,
         rank_location_fit = $5,
         ranked_at = now(),
         rank_model = $6,
         rank_prompt_version = $7
     WHERE id = $1`,
    [id, result.score, result.eligible, result.reason, result.location_fit, model, RANK_PROMPT_VERSION],
  );
}

export async function applyBatchOutput(
  client: OpenAI,
  fileId: string,
  model: string,
): Promise<{ ok: number; error: number }> {
  const response = await client.files.content(fileId);
  const text = await response.text();
  let ok = 0;
  let error = 0;
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    let parsed: BatchOutputLine;
    try {
      parsed = JSON.parse(line) as BatchOutputLine;
    } catch {
      error += 1;
      continue;
    }
    const id = parsed.custom_id;
    const content = parsed.response?.body?.choices?.[0]?.message?.content;
    if (!id || parsed.response?.status_code !== 200 || !content) {
      error += 1;
      const message = parsed.error?.message ?? `HTTP ${parsed.response?.status_code ?? "?"}`;
      console.error(`rank failed ${id ?? "unknown"}: ${message}`);
      continue;
    }
    try {
      await applyScore(id, parseRankResult(content), model);
      ok += 1;
    } catch (err) {
      error += 1;
      const message = err instanceof Error ? err.message : String(err);
      console.error(`rank failed ${id}: ${message}`);
    }
  }
  return { ok, error };
}

export async function applyBatchFiles(
  client: OpenAI,
  batch: BatchFiles,
  model: string,
): Promise<{ ok: number; error: number }> {
  let ok = 0;
  let error = 0;
  if (batch.output_file_id) {
    await patchBatchProgress({ phase: "applying", openaiStatus: batch.status });
    const applied = await applyBatchOutput(client, batch.output_file_id, model);
    ok += applied.ok;
    error += applied.error;
  }
  if (batch.error_file_id) {
    const extra = await applyBatchOutput(client, batch.error_file_id, model);
    error += extra.error;
  }
  return { ok, error };
}

const TERMINAL_WITH_OUTPUT = new Set(["completed", "cancelled", "expired", "failed"]);

/**
 * If OpenAI finished (or cancelled with partial output) but the local `npm run rank`
 * CLI is no longer polling, download results and write scores to Postgres.
 * Returns null when there is nothing to do (no pending batch, CLI still alive, etc.).
 */
export async function autoApplyOrphanedBatch(): Promise<{
  batchId: string;
  status: string;
  ok: number;
  error: number;
} | null> {
  const pending = await loadBatchState();
  if (!pending) return null;
  if (pending.phase === "applying" || pending.phase === "cancelling") return null;
  if (!isBatchStateStale(pending.updatedAt)) return null;

  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;

  const client = new OpenAI({ apiKey });
  const batch = await client.batches.retrieve(pending.batchId);
  const counts = batch.request_counts
    ? {
        completed: batch.request_counts.completed ?? 0,
        failed: batch.request_counts.failed ?? 0,
        total: batch.request_counts.total ?? 0,
      }
    : null;
  await patchBatchProgress({
    openaiStatus: batch.status,
    requestCounts: counts,
  });

  if (!TERMINAL_WITH_OUTPUT.has(batch.status)) return null;
  if (!batch.output_file_id && !batch.error_file_id) return null;

  // Re-check staleness after the OpenAI round-trip in case the CLI woke up.
  const again = await loadBatchState();
  if (!again || again.batchId !== pending.batchId) return null;
  if (again.phase === "applying" || again.phase === "cancelling") return null;
  if (!isBatchStateStale(again.updatedAt)) return null;

  console.log(
    `rank auto-apply: orphaned batch ${pending.batchId} (${batch.status}) — writing scores to DB`,
  );
  const applied = await applyBatchFiles(client, batch, pending.model);
  await clearBatchState();
  await recordRankBatchSuccess({
    model: pending.model,
    appliedOk: applied.ok,
    appliedError: applied.error,
  });
  console.log(`rank auto-apply: done ok=${applied.ok} error=${applied.error}`);
  // Continue remaining chunks without requiring a manual re-run.
  spawnContinueRank();
  return {
    batchId: pending.batchId,
    status: batch.status,
    ok: applied.ok,
    error: applied.error,
  };
}

function spawnContinueRank(): void {
  try {
    const child = spawn("npm", ["run", "rank"], {
      cwd: root,
      detached: true,
      stdio: "ignore",
      env: process.env,
    });
    child.unref();
    console.log("rank auto-apply: spawned npm run rank to continue remaining work");
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`rank auto-apply: could not spawn continue rank: ${message}`);
  }
}
