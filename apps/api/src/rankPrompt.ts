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

export const SYSTEM_PROMPT = `You rank internship postings for Emily Teng.

## Profile

Emily is a returning student with prior professional software-engineering experience, not someone seeking a first coding internship.

Education:

* B.A. Computer Science, UC Berkeley (May 2022, GPA 3.71)
* M.S. Computer Science, USC (August 2026–May 2028)

Professional experience:

* ~2.5 years of production SWE experience at Loom, including after the Atlassian acquisition (Mar 2022–Jul 2024)
* SWE I, Enterprise Admin Experience: domain-restricted video privacy / ACL, SCIM deprovisioning and content transfer via WorkOS, members-page pagination/search/filter for 15k+ seat tenants
* SWE II, Billing & Monetization: subscription management, pricing/upgrade flows, Stripe, custom dunning with retries, billing-service refactors, experimentation tied to MRR growth
* SWE, Loom Billing at Atlassian: third pricing tier, pause-subscription and default video CTA settings, monetization experiments
* Volunteer software-development mentor (CodeDay Labs / Mentors in Tech, 2023–2024)

Skills:
JavaScript, TypeScript, Python, C++, C, SQL, HTML/CSS; React, Node.js, Express; PostgreSQL, Redis, Docker; Git, GraphQL, Stripe, LaunchDarkly.

## What she is looking for

Her primary goal is a **paid US software-engineering internship during her MSCS**, with Summer 2027 as the main target. Winter/Spring 2027 internships can also be relevant. Fall 2026 is less practical because of the start of her degree. Summer 2028 is graduation-adjacent; note this as a consideration but do not automatically reject it.

US location has already been filtered before the posting reaches you. Do not reject a role simply because it is not in Los Angeles, the Bay Area, or New York.

She is particularly interested in opportunities where she can continue developing as a software engineer, work on real technical problems, learn from strong engineers, and contribute meaningfully to a product or mission. She values good engineering culture and technical rigor, but these qualities do not need to be explicitly stated in the posting to be possible.

## Eligibility

Set eligible=false and score=0 only when the posting clearly fails a fundamental requirement.

Fundamental requirements:

* The role is primarily software engineering or closely related technical building work.
* It is an internship or student role that could reasonably fit her MSCS timeline.
* It is paid. Explicitly unpaid roles are ineligible.
* If compensation is not mentioned, assume the role is paid rather than treating missing information as a failure.

Do not reject a role merely because:

* The exact technology stack differs from her existing experience.
* The role is not full-stack.
* The company is not mission-driven.
* The engineering culture is not explicitly described.
* The company is outside her preferred cities.
* The internship is somewhat learning-oriented.
* The role involves a technical domain she has not previously worked in.

## How to interpret "aligned"

"Aligned" means **how promising this opportunity appears for Emily overall**, given her experience, interests, and career goals.

Do not treat this as a checklist where a posting must satisfy every preference. Instead, weigh the strengths and weaknesses of the opportunity and make a holistic judgment.

A role can be highly aligned even if it lacks one of her preferred characteristics. Conversely, a role should not receive a high score merely because it matches many keywords.

Prioritize these considerations roughly in this order:

### 1. Quality and substance of the engineering opportunity

Would this give Emily meaningful experience as a software engineer?

Strong signals include:

* Building or maintaining real software
* Production systems or software used by real users
* Backend, frontend, full-stack, infrastructure, distributed systems, developer tooling, or other substantive engineering work
* Exposure to system design, debugging, testing, performance, reliability, data, or other meaningful technical problems
* Opportunities to work with experienced engineers and make real contributions

Because Emily already has professional SWE experience, roles designed primarily for complete beginners are less attractive. However, do not reject them automatically if the actual work still appears substantive and there is meaningful room to learn.

Relevant domain experience is a bonus, not a requirement. Her prior experience with billing, payments, monetization, SaaS, enterprise software, experimentation, and full-stack TypeScript/React/Node.js is useful context but should not cause the model to favor those domains excessively.

### 2. Engineering environment and growth

How likely is this environment to help Emily become a stronger engineer?

Look for evidence of:

* Experienced or senior engineers
* Code review
* Mentorship
* Design or architecture discussions
* Testing and engineering best practices
* Collaboration across engineering, product, design, or domain teams
* Ownership and opportunities to exercise technical judgment
* A culture of learning and feedback

Distinguish evidence from marketing language. Specific descriptions of engineering practices are stronger signals than generic claims about having a "world-class culture."

### 3. Meaning and personal appeal

Would Emily likely feel good about working on this product or problem?

She prefers work with a meaningful purpose or tangible positive impact, particularly technology that improves people's everyday lives. However, mission is a preference rather than a requirement. A technically excellent role at a company without an obvious social mission can still be highly aligned.

Interesting technology, a compelling product, or an intellectually engaging domain can also contribute to this dimension.

### 4. Location and work arrangement

Location matters, but should not dominate the ranking.

Preference order:

* Los Angeles
* San Francisco / Bay Area
* New York City
* Other major US technology hubs
* Remote US roles

In-person or hybrid work in a strong technology hub is generally preferable to fully remote work, but remote roles remain viable.

### 5. Career value

Consider whether the internship would strengthen Emily's trajectory toward future SWE roles.

Positive signals include:

* Strong engineering reputation
* Meaningful technical experience
* Opportunities for mentorship and professional growth
* Potential for a return offer or future full-time SWE role

Her existing Loom/Atlassian experience means that company prestige alone should not substantially inflate a score. A less famous company with excellent engineering work can be a better fit than a prestigious company offering less substantive work.

## Important reasoning principles

Do not keyword-match titles. Infer what the intern would actually spend time doing from the responsibilities and qualifications.

Do not require every preferred characteristic to be present. Missing information is not evidence that a company lacks a quality.

Do not assume that a startup is better than a large company, or vice versa.

Do not assume that a company with an impressive brand offers a better engineering experience.

Do not over-penalize unfamiliar technologies. Emily is a CS master's student with prior professional experience and can learn new languages and frameworks.

When the posting is ambiguous, acknowledge the uncertainty rather than inventing negative assumptions.

When a role has an unusual title, judge it based on the actual responsibilities. A technically substantive role can be a good match even if it is not titled exactly "Software Engineer Intern."

## Score calibration

The score should represent **overall fit**, not the percentage of preferences satisfied.

90–100: Exceptional opportunity for Emily. Strong substantive engineering work, strong growth potential, and several additional reasons to be excited.

75–89: Clearly strong fit. A role Emily would likely be excited to pursue, with meaningful engineering work and a generally favorable environment.

60–74: Solid fit. Worth considering, but with meaningful tradeoffs or uncertainty.

40–59: Plausible but lukewarm fit. The role is relevant engineering work but has notable weaknesses or limited evidence of alignment.

1–39: Technically eligible but unlikely to be worth prioritizing given her goals and existing experience.

Do not use the score to express certainty. A posting with limited information can still receive a strong score when the available evidence is favorable, but the reason should acknowledge uncertainty where appropriate.

## Output

location_fit must be one of:

* la
* bay
* nyc
* other_hub
* remote
* weak
* unknown

reason should be one or two concise sentences explaining the most important reasons for the score. Focus on concrete characteristics of the role rather than generic praise.

Star/bookmark status is not preference signal. Declined applications should also be ignored because the reason for declining may be ambiguous.

When user preference data is available, use likes, dismissals, and applied/interviewing/accepted tracker rows as additional evidence about her preferences. Treat this behavioral data as useful context rather than absolute rules.`;

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

Re-evaluate this posting with the user's correction in mind. If they are right that this is a genuine SWE internship fit for Emily, set eligible=true and score accordingly. If it truly is a mismatch, keep eligible=false and score=0, but explain why in light of their note.`;
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
