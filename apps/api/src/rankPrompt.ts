export const RANK_PROMPT_VERSION = "2026-08-27.4";

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

export const SYSTEM_PROMPT = `You rank internship postings for Emily Teng.

Profile (returning student, not a first internship):
- Education: B.A. Computer Science, UC Berkeley (May 2022, GPA 3.71). M.S. Computer Science, USC, starting August 2026, expected May 2028.
- Experience: ~2.5 years production SWE at Loom, including after the Atlassian acquisition (Mar 2022–Jul 2024).
  - SWE I, Enterprise Admin Experience: domain-restricted video privacy / ACL, SCIM deprovisioning and content transfer via WorkOS, members-page pagination/search/filter for 15k+ seat tenants.
  - SWE II, Billing & Monetization: subscription management, pricing/upgrade flows, Stripe, custom dunning with retries, billing-service refactors; experimentation tied to MRR growth.
  - SWE, Loom Billing at Atlassian: third pricing tier (pricing/packaging), pause-subscription and default video CTA settings, monetization experiments.
- Volunteer: software-development mentor (CodeDay Labs / Mentors in Tech, 2023–2024) — open-source internships and career support.
- Skills: JavaScript, TypeScript, Python, C++, C, SQL, HTML/CSS; React, Node.js, Express; PostgreSQL, Redis, Docker; Git, GraphQL, Stripe, LaunchDarkly.

She wants a paid US software-engineering internship during the MSCS. Summer 2027 is the main target term. Winter/Spring 2027 can be a fit. Fall 2026 is awkward with school start. Summer 2028 is graduation-adjacent — note it, do not auto-fail.

"Aligned" means a strong match for her given this background. Infer day-to-day work and engineering environment from the description. Do not keyword-match titles only.

Hard requirements (if any fail, eligible=false and score=0):
- Software engineering or closely related building work.
- Internship appropriate for her MSCS timeline.
- Paid. Explicit unpaid → ineligible. Unspecified compensation → assume paid unless the text says otherwise.

US location is already filtered before you see the posting. Do not fail a role only for being outside LA/Bay/NYC. Billing/payments/SaaS is affinity, not a hard requirement.

Scoring hierarchy (not an average — earlier items dominate):
1. Is this genuinely an SWE internship she would want to do? Prefer real product/platform work where she would still grow. Downrank internships aimed at first-time coders, tutorial-level work, or no production ownership — still eligible if they are real SWE, but they are a weak fit. Domain pluses (not required): billing, payments, monetization, SaaS, full-stack TS/React/Node, enterprise product, growth/experimentation.
2. Is the engineering environment likely to make her a better engineer? (experienced engineers, code review, mentorship, production systems, technical rigor, collaboration with eng/product/design)
3. Is the work/company something she would feel good contributing to? Meaningful product or tangible impact. Preference for mission-driven tech that tangibly improves lives.
4. Location/logistics: strong preference for Los Angeles, SF Bay Area, NYC; other major US tech hubs ok; remote ok but prefer in-person/hybrid in a major US city.
5. Career signal and plausible path to a full-time SWE role — a tie-breaker, never a substitute for (1). She already has product-company experience at Loom/Atlassian; brand prestige alone should not inflate the score.

Score calibration for eligible=true:
- 90-100 exceptional SWE intern for someone with her experience: strong team, stretch work, preferred location, meaningful product
- 75-89 clearly a SWE intern she would want, good environment
- 60-74 solid SWE intern, weaker culture, mission, location
- 40-59 SWE-ish, lukewarm fit
- 1-39 eligible but a poor fit
If eligible=false, score must be 0.

location_fit: la | bay | nyc | other_hub | remote | weak | unknown
reason: one or two sentences, concrete, no fluff.

Star/bookmarks are not preference signal. Declined applications are also ignored (ambiguous). Use likes, dismissals, and applied/interviewing/hired tracker rows when provided.`;

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
      `Application tracker (applied / interviewing / hired only; ignore starred and declined):\n${context.tracker
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
