import OpenAI from "openai";
import { migrate, pool } from "./db.js";
import { htmlToText, truncateText } from "./htmlToText.js";
import {
  DailyCapError,
  OpenAiRateGate,
  estimateTokens,
} from "./openaiRateLimit.js";
import { applyScore } from "./rankBatchApply.js";
import { hasPendingRankBatch } from "./rankBatchStatus.js";
import { loadRankContext } from "./rankContext.js";
import {
  RANK_JSON_SCHEMA,
  RANK_PROMPT_VERSION,
  buildRerankUserPrompt,
  parseRankResult,
  type RankContext,
} from "./rankPrompt.js";
import { getRankSystemPrompt } from "./rankProfile.js";

const JD_MAX_CHARS = 6000;
const MAX_COMPLETION_TOKENS = 400;
const RANK_ATTEMPTS = 6;

type RankRow = {
  id: string;
  title: string;
  location: string | null;
  department: string | null;
  company: string;
  description_html: string | null;
  raw: unknown;
  rank_reason: string | null;
};

type QueueItem = {
  postingId: string;
  note: string;
  status: "queued" | "running" | "ok" | "error";
  error: string | null;
  startedAt: string;
  finishedAt: string | null;
};

export type RerankQueueSnapshot = {
  items: Array<{
    postingId: string;
    status: "queued" | "running" | "ok" | "error";
    error: string | null;
  }>;
};

const queue: QueueItem[] = [];
let processing = false;
const CLEANUP_MS = 45_000;

function termsFromRaw(raw: unknown): string[] {
  if (!raw || typeof raw !== "object") return [];
  const terms = (raw as { terms?: unknown }).terms;
  if (!Array.isArray(terms)) return [];
  return terms.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function jobFromRow(row: RankRow) {
  return {
    company: row.company,
    title: row.title,
    location: row.location,
    department: row.department,
    terms: termsFromRaw(row.raw),
    description: truncateText(htmlToText(row.description_html), JD_MAX_CHARS),
  };
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
      { role: "system" as const, content: getRankSystemPrompt() },
      { role: "user" as const, content: user },
    ],
  };
}

async function loadContext(): Promise<RankContext> {
  return loadRankContext(pool);
}

async function loadRowForRerank(postingId: string): Promise<RankRow | null> {
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
       p.raw,
       p.rank_reason
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     WHERE p.id = $1
       AND p.removed_from_board_at IS NULL
       AND p.description_html IS NOT NULL AND btrim(p.description_html) <> ''`,
    [postingId],
  );
  return rows[0] ?? null;
}

async function rerankOne(
  client: OpenAI,
  model: string,
  row: RankRow,
  context: RankContext,
  note: string,
  wasUserDismissed: boolean,
  gate: OpenAiRateGate,
): Promise<void> {
  const user = buildRerankUserPrompt(jobFromRow(row), context, {
    correctionNote: note,
    priorReason: row.rank_reason,
    wasUserDismissed,
  });
  const estimated =
    estimateTokens(getRankSystemPrompt()) + estimateTokens(user) + MAX_COMPLETION_TOKENS + 400;

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
      const result = parseRankResult(content);
      await applyScore(row.id, result, model);
      if (result.eligible) {
        await pool.query(`DELETE FROM posting_feedback WHERE posting_id = $1 AND kind = 'dismiss'`, [
          row.id,
        ]);
      }
      return;
    } catch (err) {
      if (err instanceof DailyCapError) throw err;
      lastError = err;
      const action = await gate.observeError(err);
      if (action === "retry" && attempt < RANK_ATTEMPTS) continue;
      throw err;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Rerank request failed");
}

async function executeRerank(postingId: string, note: string): Promise<void> {
  await migrate();
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY is not set");
  getRankSystemPrompt();

  const trimmed = note.trim();
  if (!trimmed) throw new Error("Rerank note is required");

  const row = await loadRowForRerank(postingId);
  if (!row) throw new Error("Job not found or has no description to rank");

  const feedback = await pool.query<{ kind: string }>(
    `SELECT kind FROM posting_feedback WHERE posting_id = $1`,
    [postingId],
  );
  const wasUserDismissed = feedback.rows[0]?.kind === "dismiss";

  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const context = await loadContext();
  const client = new OpenAI({ apiKey, maxRetries: 0 });
  const gate = await OpenAiRateGate.load();

  // Wait for bulk batch apply if active — avoids double-spend on rate limits.
  for (let wait = 0; wait < 120 && (await hasPendingRankBatch()); wait += 1) {
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  console.log(`rerank: live scoring ${postingId}`);
  await rerankOne(client, model, row, context, trimmed, wasUserDismissed, gate);
  console.log(`rerank: done ${postingId}`);
}

function pruneQueue(): void {
  const now = Date.now();
  for (let i = queue.length - 1; i >= 0; i -= 1) {
    const item = queue[i];
    if (item.status === "queued" || item.status === "running") continue;
    const finished = item.finishedAt ? Date.parse(item.finishedAt) : 0;
    if (now - finished > CLEANUP_MS) queue.splice(i, 1);
  }
}

async function processQueue(): Promise<void> {
  if (processing) return;
  processing = true;
  try {
    while (true) {
      pruneQueue();
      const item = queue.find((row) => row.status === "queued");
      if (!item) break;
      item.status = "running";
      try {
        await executeRerank(item.postingId, item.note);
        item.status = "ok";
        item.finishedAt = new Date().toISOString();
      } catch (err) {
        item.status = "error";
        item.error = err instanceof Error ? err.message : String(err);
        item.finishedAt = new Date().toISOString();
        console.error(`rerank failed ${item.postingId}: ${item.error}`);
      }
    }
  } finally {
    processing = false;
  }
}

export function getRerankQueueSnapshot(): RerankQueueSnapshot {
  pruneQueue();
  return {
    items: queue.map((item) => ({
      postingId: item.postingId,
      status: item.status,
      error: item.error,
    })),
  };
}

export function queueRerank(postingId: string, note: string): {
  queued: boolean;
  alreadyQueued: boolean;
} {
  const trimmed = note.trim();
  if (!trimmed) throw new Error("Rerank note is required");

  const active = queue.find(
    (item) =>
      item.postingId === postingId && (item.status === "queued" || item.status === "running"),
  );
  if (active) return { queued: false, alreadyQueued: true };

  queue.push({
    postingId,
    note: trimmed,
    status: "queued",
    error: null,
    startedAt: new Date().toISOString(),
    finishedAt: null,
  });
  void processQueue();
  return { queued: true, alreadyQueued: false };
}
