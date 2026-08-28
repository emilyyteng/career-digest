import path from "node:path";
import { fileURLToPath } from "node:url";
import OpenAI, { toFile } from "openai";
import { migrate, pool } from "./db.js";
import { htmlToText, truncateText } from "./htmlToText.js";
import {
  DailyCapError,
  OpenAiRateGate,
  estimateTokens,
} from "./openaiRateLimit.js";
import { applyBatchFiles, applyScore } from "./rankBatchApply.js";
import {
  clearBatchState,
  hasPendingRankBatch,
  loadBatchState,
  patchBatchProgress,
  recordRankBatchError,
  recordRankBatchSuccess,
  saveBatchState,
} from "./rankBatchStatus.js";
import {
  RANK_JSON_SCHEMA,
  RANK_PROMPT_VERSION,
  SYSTEM_PROMPT,
  buildUserPrompt,
  parseRankResult,
  type RankContext,
  type RankExample,
} from "./rankPrompt.js";

export { getRankBatchStatus, hasPendingRankBatch } from "./rankBatchStatus.js";

const JD_MAX_CHARS = 6000;
const MAX_COMPLETION_TOKENS = 400;
const EXAMPLE_LIMIT = 12;
const RANK_ATTEMPTS = 6;
const BATCH_PROMPT_TOKEN_BUDGET = 1_700_000;
const BATCH_POLL_MS = 20_000;
const DEFAULT_BATCH_STALL_HOURS = 12;
const DEFAULT_LIVE_FALLBACK_MAX = 50;

function batchStallHours(): number {
  const n = Number(process.env.BATCH_STALL_HOURS);
  return Number.isFinite(n) && n > 0 ? n : DEFAULT_BATCH_STALL_HOURS;
}

function liveFallbackMax(): number {
  const n = Number(process.env.BATCH_LIVE_FALLBACK_MAX);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : DEFAULT_LIVE_FALLBACK_MAX;
}

type RankRow = {
  id: string;
  title: string;
  location: string | null;
  department: string | null;
  company: string;
  description_html: string | null;
  raw: unknown;
};

type ChunkMeta = {
  chunkIndex: number;
  chunkTotal: number;
  chunkSize: number;
  startedAt?: string;
};

function termsFromRaw(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const terms = (raw as { terms?: unknown }).terms;
  if (!Array.isArray(terms)) return [];
  return terms.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function loadContext(): Promise<RankContext> {
  const memo = await pool.query<{ memo: string }>(
    `SELECT memo FROM rank_profile WHERE id = 1`,
  );
  const likes = await pool.query<RankExample>(
    `SELECT
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.title,
       f.note
     FROM posting_feedback f
     JOIN postings p ON p.id = f.posting_id
     JOIN companies c ON c.id = p.company_id
     WHERE f.kind = 'like'
     ORDER BY f.created_at DESC
     LIMIT $1`,
    [EXAMPLE_LIMIT],
  );
  const dismissals = await pool.query<RankExample>(
    `SELECT
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.title,
       f.note
     FROM posting_feedback f
     JOIN postings p ON p.id = f.posting_id
     JOIN companies c ON c.id = p.company_id
     WHERE f.kind = 'dismiss'
     ORDER BY f.created_at DESC
     LIMIT $1`,
    [EXAMPLE_LIMIT],
  );
  const tracker = await pool.query<{
    status: string;
    company: string;
    title: string;
    notes: string | null;
    description_html: string | null;
  }>(
    `SELECT
       a.status,
       COALESCE(
         a.company_name,
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name,
         'Unknown'
       ) AS company,
       COALESCE(a.title, p.title, 'Untitled') AS title,
       a.notes,
       COALESCE(a.description_html, p.description_html) AS description_html
     FROM applications a
     LEFT JOIN postings p ON p.id = a.posting_id
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE a.status NOT IN ('starred', 'declined')
     ORDER BY a.updated_at DESC
     LIMIT $1`,
    [EXAMPLE_LIMIT],
  );
  return {
    memo: memo.rows[0]?.memo ?? "",
    likes: likes.rows,
    dismissals: dismissals.rows,
    tracker: tracker.rows.map((row) => ({
      status: row.status,
      company: row.company,
      title: row.title,
      notes: row.notes,
      description: truncateText(htmlToText(row.description_html), 200) || null,
    })),
  };
}

function promptFor(row: RankRow, context: RankContext): string {
  return buildUserPrompt(
    {
      company: row.company,
      title: row.title,
      location: row.location,
      department: row.department,
      terms: termsFromRaw(row.raw),
      description: truncateText(htmlToText(row.description_html), JD_MAX_CHARS),
    },
    context,
  );
}

function completionBody(model: string, user: string) {
  return {
    model,
    temperature: 0.2,
    max_completion_tokens: MAX_COMPLETION_TOKENS,
    response_format: {
      type: "json_schema" as const,
      json_schema: RANK_JSON_SCHEMA,
    },
    messages: [
      { role: "system" as const, content: SYSTEM_PROMPT },
      { role: "user" as const, content: user },
    ],
  };
}

async function loadRows(
  force: boolean,
  limit: number,
  phase: "any" | "unranked" | "outdated" = "any",
): Promise<RankRow[]> {
  const params: unknown[] = [];
  let versionFilter = "";
  let phaseFilter = "";
  if (phase === "unranked") {
    phaseFilter = "AND p.ranked_at IS NULL";
  } else if (phase === "outdated") {
    params.push(RANK_PROMPT_VERSION);
    phaseFilter = `AND p.ranked_at IS NOT NULL AND p.rank_prompt_version IS DISTINCT FROM $${params.length}`;
  } else if (!force) {
    params.push(RANK_PROMPT_VERSION);
    versionFilter = `AND (p.rank_prompt_version IS DISTINCT FROM $1 OR p.ranked_at IS NULL)`;
  }
  // Skip blank JDs — ranking them wastes tokens on near-empty prompts.
  const descriptionFilter = `AND p.description_html IS NOT NULL AND btrim(p.description_html) <> ''`;
  let limitClause = "";
  if (Number.isFinite(limit) && limit > 0) {
    params.push(Math.floor(limit));
    limitClause = `LIMIT $${params.length}`;
  }
  const { rows } = await pool.query<RankRow>(
    `SELECT
       p.id,
       p.title,
       p.location,
       p.department,
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.description_html,
       p.raw
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.removed_from_board_at IS NULL
       ${descriptionFilter}
       ${versionFilter}
       ${phaseFilter}
       AND NOT EXISTS (
         SELECT 1 FROM posting_feedback fb
         WHERE fb.posting_id = p.id AND fb.kind = 'dismiss'
       )
     ORDER BY p.last_seen_at DESC
     ${limitClause}`,
    params,
  );
  return rows;
}

async function countSkippedBlankDescriptions(force: boolean): Promise<number> {
  const params: unknown[] = [];
  let versionFilter = "";
  if (!force) {
    params.push(RANK_PROMPT_VERSION);
    versionFilter = `AND (p.rank_prompt_version IS DISTINCT FROM $1 OR p.ranked_at IS NULL)`;
  }
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM postings p
     WHERE p.removed_from_board_at IS NULL
       AND (p.description_html IS NULL OR btrim(p.description_html) = '')
       ${versionFilter}`,
    params,
  );
  return Number(rows[0]?.count ?? 0) || 0;
}

async function rankOne(
  client: OpenAI,
  model: string,
  row: RankRow,
  context: RankContext,
  gate: OpenAiRateGate,
): Promise<void> {
  const user = promptFor(row, context);
  const estimated =
    estimateTokens(SYSTEM_PROMPT) + estimateTokens(user) + MAX_COMPLETION_TOKENS + 400;

  let lastError: unknown;
  for (let attempt = 1; attempt <= RANK_ATTEMPTS; attempt++) {
    await gate.acquire(estimated);
    try {
      const { data, response } = await client.chat.completions
        .create(completionBody(model, user), { maxRetries: 0 })
        .withResponse();
      await gate.observeSuccess(response.headers, data.usage);
      const content = data.choices[0]?.message?.content;
      if (!content) throw new Error("Empty model response");
      await applyScore(row.id, parseRankResult(content), model);
      return;
    } catch (err) {
      if (err instanceof DailyCapError) throw err;
      lastError = err;
      const action = await gate.observeError(err);
      if (action === "retry" && attempt < RANK_ATTEMPTS) continue;
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Rank request failed");
}

async function mapPool(
  items: RankRow[],
  worker: (item: RankRow) => Promise<void>,
  concurrency: number,
): Promise<{ ok: number; error: number; halted: DailyCapError | null }> {
  let ok = 0;
  let error = 0;
  let next = 0;
  let halted: DailyCapError | null = null;
  async function run(): Promise<void> {
    while (!halted) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      try {
        await worker(items[index]);
        ok += 1;
      } catch (err) {
        if (err instanceof DailyCapError) {
          halted = err;
          return;
        }
        error += 1;
        const message = err instanceof Error ? err.message : String(err);
        console.error(`rank failed ${items[index].id}: ${message}`);
      }
      const done = ok + error;
      if (done % 25 === 0 || done === items.length || halted) {
        console.log(`rank ${done}/${items.length} ok=${ok} error=${error}`);
      }
    }
  }
  const size = Math.min(concurrency, Math.max(1, items.length));
  await Promise.all(Array.from({ length: size }, () => run()));
  return { ok, error, halted };
}

function chunkRows(rows: RankRow[], context: RankContext): RankRow[][] {
  const chunks: RankRow[][] = [];
  let current: RankRow[] = [];
  let tokens = 0;
  for (const row of rows) {
    const promptTokens = estimateTokens(SYSTEM_PROMPT) + estimateTokens(promptFor(row, context));
    if (
      current.length > 0 &&
      (tokens + promptTokens > BATCH_PROMPT_TOKEN_BUDGET || current.length >= 50_000)
    ) {
      chunks.push(current);
      current = [];
      tokens = 0;
    }
    current.push(row);
    tokens += promptTokens;
  }
  if (current.length > 0) chunks.push(current);
  return chunks;
}

async function loadRowsByIds(ids: string[]): Promise<RankRow[]> {
  if (ids.length === 0) return [];
  const { rows } = await pool.query<RankRow>(
    `SELECT
       p.id,
       p.title,
       p.location,
       p.department,
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.description_html,
       p.raw
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.id = ANY($1::uuid[])
       AND p.removed_from_board_at IS NULL
       AND p.description_html IS NOT NULL AND btrim(p.description_html) <> ''
       AND (p.rank_prompt_version IS DISTINCT FROM $2 OR p.ranked_at IS NULL)
       AND NOT EXISTS (
         SELECT 1 FROM posting_feedback fb
         WHERE fb.posting_id = p.id AND fb.kind = 'dismiss'
       )`,
    [ids, RANK_PROMPT_VERSION],
  );
  return rows;
}

async function loadSubmittedIdsFromBatch(
  client: OpenAI,
  batch: { input_file_id?: string | null },
): Promise<string[]> {
  if (!batch.input_file_id) return [];
  try {
    const response = await client.files.content(batch.input_file_id);
    const text = await response.text();
    const ids: string[] = [];
    for (const line of text.split("\n")) {
      if (!line.trim()) continue;
      try {
        const parsed = JSON.parse(line) as { custom_id?: string };
        if (parsed.custom_id) ids.push(parsed.custom_id);
      } catch {
        // skip malformed lines
      }
    }
    return ids;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Could not read batch input file: ${message}`);
    return [];
  }
}

async function liveRankLeftovers(
  apiKey: string,
  model: string,
  context: RankContext,
  rows: RankRow[],
  label: string,
): Promise<{ ok: number; error: number }> {
  if (rows.length === 0) return { ok: 0, error: 0 };
  const max = liveFallbackMax();
  if (rows.length > max) {
    console.log(
      `${rows.length} unfinished ${label} exceed live fallback max (${max}); will use Batch for the rest.`,
    );
    return { ok: 0, error: 0 };
  }
  console.log(
    `Live-ranking ${rows.length} unfinished ${label} (≤${max}; same path as npm run rank:live).`,
  );
  const result = await rankLive(apiKey, model, rows, context);
  return { ok: result.ok, error: result.error };
}

function progressKey(counts: { completed: number; failed: number; total: number } | null): string {
  if (!counts) return "unknown";
  return `${counts.completed}/${counts.failed}/${counts.total}`;
}

async function waitForBatch(
  client: OpenAI,
  batchId: string,
  meta?: ChunkMeta,
): Promise<{ batch: Awaited<ReturnType<OpenAI["batches"]["retrieve"]>>; stalled: boolean }> {
  const stallMs = batchStallHours() * 60 * 60 * 1000;
  let cancelRequested = false;

  for (;;) {
    const batch = await client.batches.retrieve(batchId);
    const counts = batch.request_counts
      ? {
          completed: batch.request_counts.completed ?? 0,
          failed: batch.request_counts.failed ?? 0,
          total: batch.request_counts.total ?? 0,
        }
      : null;
    const progress = counts ? `${counts.completed + counts.failed}/${counts.total}` : "?";
    const key = progressKey(counts);
    const state = await loadBatchState();
    const createdAtIso = batch.created_at
      ? new Date(batch.created_at * 1000).toISOString()
      : state?.startedAt;
    const nowIso = new Date().toISOString();

    let lastProgressAt = state?.lastProgressAt ?? null;
    let lastProgressKey = state?.lastProgressKey ?? null;
    if (!lastProgressKey) {
      // First observation (or upgraded state file): don't treat current counts as "fresh progress".
      lastProgressAt = lastProgressAt ?? createdAtIso ?? nowIso;
      lastProgressKey = key;
    } else if (lastProgressKey !== key) {
      lastProgressAt = nowIso;
      lastProgressKey = key;
    } else if (!lastProgressAt) {
      lastProgressAt = createdAtIso ?? nowIso;
    }

    console.log(
      `batch ${batchId} ${batch.status} ${progress}${cancelRequested ? " (cancelling)" : ""}`,
    );
    await patchBatchProgress({
      phase: cancelRequested ? "cancelling" : "waiting",
      openaiStatus: batch.status,
      requestCounts: counts,
      chunkIndex: meta?.chunkIndex,
      chunkTotal: meta?.chunkTotal,
      chunkSize: meta?.chunkSize,
      lastProgressAt,
      lastProgressKey,
      startedAt: state?.startedAt ?? createdAtIso ?? nowIso,
    });

    if (batch.status === "completed") return { batch, stalled: false };
    if (
      batch.status === "cancelled" ||
      batch.status === "expired" ||
      batch.status === "failed"
    ) {
      return { batch, stalled: cancelRequested };
    }

    const unfinished = counts ? counts.total - counts.completed - counts.failed : 0;
    const hungMs = Date.now() - new Date(lastProgressAt).getTime();
    if (
      !cancelRequested &&
      unfinished > 0 &&
      Number.isFinite(hungMs) &&
      hungMs >= stallMs
    ) {
      const hours = (hungMs / 3_600_000).toFixed(1);
      console.warn(
        `Batch ${batchId} stalled ${hours}h with ${unfinished} hanging request(s) at ${progress}. Cancelling to apply partial results…`,
      );
      cancelRequested = true;
      await patchBatchProgress({ phase: "cancelling", openaiStatus: "cancelling" });
      try {
        await client.batches.cancel(batchId);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn(`Cancel request for ${batchId}: ${message}`);
      }
    }

    await wait(BATCH_POLL_MS);
  }
}

async function runOneBatch(
  client: OpenAI,
  apiKey: string,
  model: string,
  rows: RankRow[],
  context: RankContext,
  meta: ChunkMeta,
): Promise<{ ok: number; error: number }> {
  const jsonl = rows
    .map((row) =>
      JSON.stringify({
        custom_id: row.id,
        method: "POST",
        url: "/v1/chat/completions",
        body: completionBody(model, promptFor(row, context)),
      }),
    )
    .join("\n");
  const file = await client.files.create({
    file: await toFile(Buffer.from(jsonl, "utf8"), "rank-batch.jsonl"),
    purpose: "batch",
  });
  const created = await client.batches.create({
    input_file_id: file.id,
    endpoint: "/v1/chat/completions",
    completion_window: "24h",
    metadata: { source: "career-digest", prompt: RANK_PROMPT_VERSION },
  });
  console.log(`Submitted batch ${created.id} (${rows.length} posting(s)).`);
  const startedAt = meta.startedAt ?? new Date().toISOString();
  const nowIso = new Date().toISOString();
  await saveBatchState({
    batchId: created.id,
    model,
    phase: "waiting",
    openaiStatus: created.status ?? "validating",
    requestCounts: { completed: 0, failed: 0, total: rows.length },
    chunkIndex: meta.chunkIndex,
    chunkTotal: meta.chunkTotal,
    chunkSize: meta.chunkSize,
    postingIds: rows.map((row) => row.id),
    lastProgressAt: nowIso,
    lastProgressKey: `0/0/${rows.length}`,
    startedAt,
    updatedAt: nowIso,
  });
  const { batch: finished, stalled } = await waitForBatch(client, created.id, meta);
  const applied = await applyBatchFiles(client, finished, model);
  await clearBatchState();

  if (
    finished.status === "failed" &&
    !finished.output_file_id &&
    !stalled
  ) {
    const detail = finished.errors?.data?.map((item) => item.message).filter(Boolean).join("; ");
    throw new Error(`Batch ${created.id} failed${detail ? `: ${detail}` : ""}`);
  }

  console.log(
    `Batch ${created.id} ${finished.status} applied ok=${applied.ok} error=${applied.error}${stalled ? " (after stall cancel)" : ""}.`,
  );

  const leftovers = await loadRowsByIds(rows.map((row) => row.id));
  const live = await liveRankLeftovers(
    apiKey,
    model,
    context,
    leftovers,
    stalled ? "after stall cancel" : "from this chunk",
  );
  return { ok: applied.ok + live.ok, error: applied.error + live.error };
}

async function rankLive(
  apiKey: string,
  model: string,
  rows: RankRow[],
  context: RankContext,
): Promise<{ ok: number; error: number; halted: DailyCapError | null }> {
  const concurrency = Math.max(1, Number(process.env.RANK_CONCURRENCY) || 1);
  const gate = await OpenAiRateGate.load();
  const live = new OpenAI({ apiKey, maxRetries: 0 });
  const result = await mapPool(
    rows,
    (row) => rankOne(live, model, row, context, gate),
    concurrency,
  );
  if (result.halted) {
    console.error(result.halted.message);
    console.log(`Stopped early. Ranked ${result.ok}, failed ${result.error}.`);
  } else {
    console.log(`Done. Ranked ${result.ok}, failed ${result.error}.`);
  }
  return result;
}

/** Live ranking for a capped drip of unranked / outdated-prompt postings. */
export async function runLiveRank(opts?: {
  limit?: number;
  force?: boolean;
  phase?: "any" | "unranked" | "outdated";
}): Promise<{ ok: number; error: number; halted: boolean }> {
  await migrate();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const force = opts?.force === true;
  const phase = opts?.phase ?? "any";
  const envLimit = Number(process.env.RANK_LIMIT);
  const limit =
    opts?.limit ??
    (Number.isFinite(envLimit) && envLimit > 0 ? Math.floor(envLimit) : undefined);
  const rows = await loadRows(force, limit ?? Number.NaN, phase);

  const phaseLabel =
    phase === "unranked" ? ", unranked only" : phase === "outdated" ? ", rerank outdated" : "";
  console.log(
    `Live ranking ${rows.length} posting(s) with ${model} (${RANK_PROMPT_VERSION}${force ? ", --all" : ""}${phaseLabel}${limit ? `, limit=${limit}` : ""}).`,
  );
  const skippedBlank = await countSkippedBlankDescriptions(force);
  if (skippedBlank > 0) {
    console.log(
      `Skipping ${skippedBlank} posting(s) with empty job descriptions (fill via scrape first — saves rank tokens).`,
    );
  }
  if (rows.length === 0) {
    console.log("Nothing to rank.");
    return { ok: 0, error: 0, halted: false };
  }

  const context = await loadContext();
  const result = await rankLive(apiKey, model, rows, context);
  return { ok: result.ok, error: result.error, halted: Boolean(result.halted) };
}

async function abandonPendingBatch(client: OpenAI): Promise<void> {
  const pending = await loadBatchState();
  if (!pending) return;
  console.log(`Abandoning pending batch ${pending.batchId} for live backlog.`);
  try {
    await client.batches.cancel(pending.batchId);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.warn(`Batch cancel request: ${message}`);
  }
  await clearBatchState();
}

/**
 * One-shot live backlog: unranked postings first, then rerank prior scores with the
 * current prompt version. Skips blank JDs and user-dismissed mismatches.
 */
export async function runLiveRankBacklog(): Promise<{
  ok: number;
  error: number;
  halted: boolean;
}> {
  await migrate();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const client = new OpenAI({ apiKey });
  await abandonPendingBatch(client);

  const skippedBlank = await countSkippedBlankDescriptions(false);
  if (skippedBlank > 0) {
    console.log(
      `Skipping ${skippedBlank} posting(s) with empty job descriptions (not ranked).`,
    );
  }

  let ok = 0;
  let error = 0;
  const context = await loadContext();

  const unranked = await loadRows(false, Number.NaN, "unranked");
  console.log(
    `Backlog phase 1: ${unranked.length} unranked posting(s) (${RANK_PROMPT_VERSION}).`,
  );
  if (unranked.length > 0) {
    const phase1 = await rankLive(apiKey, model, unranked, context);
    ok += phase1.ok;
    error += phase1.error;
    if (phase1.halted) {
      console.log(`Stopped after phase 1. Ranked ${ok}, failed ${error}.`);
      return { ok, error, halted: true };
    }
  }

  const outdated = await loadRows(false, Number.NaN, "outdated");
  console.log(
    `Backlog phase 2: ${outdated.length} prior ranking(s) to refresh (${RANK_PROMPT_VERSION}).`,
  );
  if (outdated.length > 0) {
    const phase2 = await rankLive(apiKey, model, outdated, context);
    ok += phase2.ok;
    error += phase2.error;
    if (phase2.halted) {
      console.log(`Stopped after phase 2. Ranked ${ok}, failed ${error}.`);
      return { ok, error, halted: true };
    }
  }

  console.log(`Backlog done. Ranked ${ok}, failed ${error}.`);
  return { ok, error, halted: false };
}

async function rankBatch(
  client: OpenAI,
  apiKey: string,
  model: string,
  rows: RankRow[],
  context: RankContext,
): Promise<void> {
  let ok = 0;
  let error = 0;
  const runStartedAt = new Date().toISOString();
  const force = process.argv.includes("--all");
  const limit = Number(process.env.RANK_LIMIT);
  const pending = await loadBatchState();
  if (pending) {
    console.log(`Resuming batch ${pending.batchId}.`);
    try {
      const meta: ChunkMeta = {
        chunkIndex: pending.chunkIndex ?? 1,
        chunkTotal: pending.chunkTotal ?? 1,
        chunkSize: pending.chunkSize ?? 0,
        startedAt: pending.startedAt,
      };
      const { batch: finished, stalled } = await waitForBatch(client, pending.batchId, meta);
      const applied = await applyBatchFiles(client, finished, pending.model);
      ok += applied.ok;
      error += applied.error;
      let resumeIds = pending.postingIds ?? [];
      if (resumeIds.length === 0) {
        resumeIds = await loadSubmittedIdsFromBatch(client, finished);
      }
      await clearBatchState();
      console.log(
        `Batch ${pending.batchId} ${finished.status} applied ok=${applied.ok} error=${applied.error}${stalled ? " (after stall cancel)" : ""}.`,
      );
      if (
        finished.status === "failed" &&
        !finished.output_file_id &&
        !stalled
      ) {
        const detail = finished.errors?.data
          ?.map((item) => item.message)
          .filter(Boolean)
          .join("; ");
        throw new Error(`Batch ${pending.batchId} failed${detail ? `: ${detail}` : ""}`);
      }
      if (resumeIds.length > 0) {
        const leftovers = await loadRowsByIds(resumeIds);
        const live = await liveRankLeftovers(
          apiKey,
          model,
          context,
          leftovers,
          stalled ? "after stall cancel" : "from resumed chunk",
        );
        ok += live.ok;
        error += live.error;
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await recordRankBatchError(message, pending.model);
      throw err;
    }
  }

  let remaining = await loadRows(force, limit);
  if (remaining.length === 0 && rows.length && !pending) {
    remaining = rows;
  }

  try {
    while (remaining.length > 0) {
      const max = liveFallbackMax();
      if (remaining.length <= max) {
        const live = await liveRankLeftovers(
          apiKey,
          model,
          context,
          remaining,
          "remaining unranked",
        );
        ok += live.ok;
        error += live.error;
        break;
      }

      const chunks = chunkRows(remaining, context);
      console.log(
        `Batch ranking ${remaining.length} posting(s); next file ${chunks[0].length} of ${chunks.length} chunk(s).`,
      );
      const applied = await runOneBatch(client, apiKey, model, chunks[0], context, {
        chunkIndex: 1,
        chunkTotal: chunks.length,
        chunkSize: chunks[0].length,
        startedAt: runStartedAt,
      });
      ok += applied.ok;
      error += applied.error;
      remaining = await loadRows(force, limit);
    }

    await recordRankBatchSuccess({ model, appliedOk: ok, appliedError: error });
    console.log(`Done. Ranked ${ok}, failed ${error}.`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await recordRankBatchError(message, model);
    throw err;
  }
}

async function rank(): Promise<void> {
  await migrate();
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set. Add it to .env");
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const live = process.argv.includes("--live");
  const backlog = process.argv.includes("--backlog");
  const force = process.argv.includes("--all");
  const limit = Number(process.env.RANK_LIMIT);

  if (live && backlog) {
    const result = await runLiveRankBacklog();
    if (result.halted) process.exitCode = 1;
    return;
  }

  const rows = await loadRows(force, limit);

  console.log(
    `Ranking ${rows.length} posting(s) with ${model} (${RANK_PROMPT_VERSION}${force ? ", --all" : ""}${live ? ", live" : `, batch; stall=${batchStallHours()}h, live-fallback≤${liveFallbackMax()}`}).`,
  );
  const skippedBlank = await countSkippedBlankDescriptions(force);
  if (skippedBlank > 0) {
    console.log(
      `Skipping ${skippedBlank} posting(s) with empty job descriptions (fill via scrape first — saves rank tokens).`,
    );
  }
  if (rows.length === 0 && !(await loadBatchState())) {
    console.log("Nothing to rank.");
    return;
  }

  const context = await loadContext();
  const client = new OpenAI({ apiKey });
  if (live) {
    await rankLive(apiKey, model, rows, context);
  } else {
    await rankBatch(client, apiKey, model, rows, context);
  }
}

const isMain =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    await rank();
  } finally {
    await pool.end();
  }
}
