export const RANK_PROMPT_VERSION = "2026-08-27.5";

/** Max like/dismiss rows in rank prompts (recency-ordered; oldest drop off). */
export const FEEDBACK_EXAMPLE_LIMIT = 75;

/** Max application tracker rows in rank prompts (longer rows; keep smaller). */
export const TRACKER_EXAMPLE_LIMIT = 12;

export const LOCATION_FITS = [
  "la",
  "bay",
  "nyc",
  "other_hub",
  "remote",
  "weak",
  "unknown",
] as const;

export type LocationFit = (typeof LOCATION_FITS)[number];

export type RankResult = {
  eligible: boolean;
  score: number;
  reason: string;
  location_fit: LocationFit;
};

export const RANK_JSON_SCHEMA = {
  name: "rank_result",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      eligible: { type: "boolean" },
      score: { type: "integer" },
      reason: { type: "string" },
      location_fit: { type: "string", enum: [...LOCATION_FITS] },
    },
    required: ["eligible", "score", "reason", "location_fit"],
  },
} as const;

export type RankExample = {
  company: string;
  title: string;
  note: string | null;
};

export type TrackerExample = {
  status: string;
  company: string;
  title: string;
  notes: string | null;
  description: string | null;
};

export type RankContext = {
  memo: string;
  likes: RankExample[];
  dismissals: RankExample[];
  tracker: TrackerExample[];
};

export type RankJob = {
  company: string;
  title: string;
  location: string | null;
  department: string | null;
  terms: string[];
  description: string;
};

function formatExamples(rows: RankExample[]): string {
  if (rows.length === 0) return "(none yet)";
  return rows
    .map((row) => {
      const note = row.note?.trim() ? ` — ${row.note.trim()}` : "";
      return `- ${row.company}: ${row.title}${note}`;
    })
    .join("\n");
}

export function buildUserPrompt(job: RankJob, context: RankContext): string {
  const parts: string[] = [];
  if (context.memo.trim()) {
    parts.push(`Distilled preference memo:\n${context.memo.trim()}`);
  }
  parts.push(`Liked examples (strong positives):\n${formatExamples(context.likes)}`);
  parts.push(`Dismissed examples (strong negatives):\n${formatExamples(context.dismissals)}`);
  if (context.tracker.length > 0) {
    parts.push(
      `Application tracker (applied / interviewing / accepted only; ignore to-do and declined):\n${context.tracker
        .map((row) => {
          const lines = [`- [${row.status}] ${row.company}: ${row.title}`];
          if (row.notes?.trim()) lines.push(`  Notes: ${row.notes.trim()}`);
          if (row.description?.trim()) {
            lines.push(`  Description: ${row.description.trim()}`);
          }
          return lines.join("\n");
        })
        .join("\n")}`,
    );
  }
  parts.push(
    `Posting to rank:
Company: ${job.company}
Title: ${job.title}
Location: ${job.location ?? "(unspecified)"}
Department: ${job.department ?? "(unspecified)"}
Terms: ${job.terms.length ? job.terms.join(", ") : "(none)"}
Description:
${job.description || "(no description stored)"}`,
  );
  return parts.join("\n\n");
}

/** Live rerank with user correction when a posting was marked mismatch. */
export function buildRerankUserPrompt(
  job: RankJob,
  context: RankContext,
  opts: {
    correctionNote: string;
    priorReason: string | null;
    wasUserDismissed: boolean;
  },
): string {
  const base = buildUserPrompt(job, context);
  const prior = opts.priorReason?.trim() || "Previously marked ineligible (mismatch).";
  const source = opts.wasUserDismissed
    ? "The user manually marked this as a mismatch."
    : "The model previously ranked this as a mismatch (eligible=false).";
  return `${base}

RE-EVALUATION (user requested rerank):
${source}
Prior ranking reason: ${prior}

User correction — why this is NOT a mismatch (or how to re-score):
${opts.correctionNote.trim()}

Re-evaluate this posting with the user's correction in mind. If they are right that this is a genuine SWE internship fit for the candidate, set eligible=true and score accordingly. If it truly is a mismatch, keep eligible=false and score=0, but explain why in light of their note.`;
}

export function parseRankResult(raw: string): RankResult {
  const parsed = JSON.parse(raw) as Partial<RankResult>;
  const eligible = Boolean(parsed.eligible);
  let score = Number(parsed.score);
  if (!Number.isFinite(score)) score = eligible ? 50 : 0;
  score = Math.max(0, Math.min(100, Math.round(score)));
  if (!eligible) score = 0;
  const location =
    typeof parsed.location_fit === "string" &&
    (LOCATION_FITS as readonly string[]).includes(parsed.location_fit)
      ? parsed.location_fit
      : "unknown";
  const reason =
    typeof parsed.reason === "string" && parsed.reason.trim()
      ? parsed.reason.trim().slice(0, 600)
      : eligible
        ? "Eligible, no reason returned."
        : "Does not meet hard requirements.";
  return { eligible, score, reason, location_fit: location as LocationFit };
}
