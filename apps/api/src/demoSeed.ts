import { randomUUID } from "node:crypto";
import type { Pool } from "pg";
import { isDemoMode } from "./demoMode.js";

/** Stable fictional employers — never real ATS brands. */
const COMPANIES = [
  "Nebula Hatch",
  "Copper Lantern Labs",
  "Mistwood Robotics",
  "Parcel Grove",
  "Lumen Quill",
  "Brightkettle Systems",
  "Cedar Orbit",
  "Fathom Pixel",
  "Northyarn Softworks",
  "Tideglass Analytics",
  "Paperkite Health",
  "Sable Circuit",
  "Willow Gauge",
  "Ambernest Tools",
  "Skyloft Mobility",
  "Riverbind Security",
  "Mossline Data",
  "Quartz Harbor",
  "Fieldnote AI",
  "Needlestack Ledger",
] as const;

const TITLES = [
  "Software Engineer Intern",
  "Backend Intern",
  "Frontend Intern",
  "Full-Stack Intern — Summer",
  "Platform Engineering Intern",
  "Data Engineering Intern",
  "ML Engineering Intern",
  "Infrastructure Intern",
  "Product Engineering Intern",
  "Security Engineering Intern",
] as const;

const LOCATIONS = [
  "Remote — US",
  "San Francisco, CA",
  "New York, NY",
  "Seattle, WA",
  "Austin, TX",
  "Chicago, IL",
  "Boston, MA",
] as const;

const DESC = `<p>Fictional demo role for Career Digest portfolio. Build product features with mentorship, code review, and a summer project.</p>`;

export type DemoSeedSummary = {
  companies: number;
  postings: number;
  ranked: number;
  mismatches: number;
  applications: number;
  tasks: number;
  interviewThreads: number;
  leetcodeDays: number;
  reflections: number;
};

async function wipeDemoTables(db: Pool): Promise<void> {
  await db.query(`
    TRUNCATE TABLE
      reflection_logs,
      leetcode_daily,
      tasks,
      application_steps,
      application_thread_members,
      interview_threads,
      application_documents,
      posting_feedback,
      applications,
      postings,
      companies,
      rank_profile
    RESTART IDENTITY CASCADE
  `);
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setUTCHours(12, 0, 0, 0);
  d.setUTCDate(d.getUTCDate() - n);
  return d;
}

function localDateDaysAgo(n: number): string {
  return daysAgo(n).toISOString().slice(0, 10);
}

export async function resetDemoDatabase(db: Pool): Promise<DemoSeedSummary> {
  if (!isDemoMode()) {
    throw new Error("Demo database reset is only allowed when DEMO_MODE is enabled");
  }

  await wipeDemoTables(db);

  await db.query(
    `INSERT INTO rank_profile (id, memo, updated_at)
     VALUES (
       1,
       $1,
       now()
     )
     ON CONFLICT (id) DO UPDATE SET memo = EXCLUDED.memo, updated_at = now()`,
    [
      "Demo portfolio profile (fictional): rising junior SWE seeking summer internships. Prefers systems, backend, and product engineering with mentorship. Bay Area / remote-US OK. Not a real applicant memo.",
    ],
  );

  const companyIds: string[] = [];
  for (const [i, name] of COMPANIES.entries()) {
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO companies (name, source, board_token)
       VALUES ($1, 'greenhouse', $2)
       RETURNING id`,
      [name, `demo-${i}-${name.toLowerCase().replace(/\s+/g, "-")}`],
    );
    companyIds.push(rows[0]!.id);
  }

  let ranked = 0;
  let mismatches = 0;
  const postingIds: string[] = [];

  // ~50 ranked + ~10 mismatches
  for (let i = 0; i < 60; i += 1) {
    const companyId = companyIds[i % companyIds.length]!;
    const company = COMPANIES[i % COMPANIES.length]!;
    const title = TITLES[i % TITLES.length]!;
    const eligible = i < 50;
    if (eligible) ranked += 1;
    else mismatches += 1;
    const score = eligible ? 55 + (i % 40) : 20 + (i % 15);
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO postings (
         source, external_id, company_id, title, location, department, url, description_html,
         first_published_at, rank_score, rank_eligible, rank_reason, rank_location_fit, ranked_at,
         rank_model, rank_prompt_version, raw
       ) VALUES (
         'greenhouse', $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12, $13,
         'demo-seed', 'demo', $14::jsonb
       ) RETURNING id`,
      [
        `demo-job-${i}`,
        companyId,
        title,
        LOCATIONS[i % LOCATIONS.length],
        company,
        `https://demo.career-digest.invalid/${company.toLowerCase().replace(/\s+/g, "-")}/jobs/${i}`,
        DESC,
        daysAgo(3 + (i % 25)),
        score,
        eligible,
        eligible
          ? "Strong internship fit for a systems-minded SWE (demo seed)."
          : "Mismatch for this demo profile — wrong stack focus.",
        eligible ? "bay" : "weak",
        daysAgo(2 + (i % 20)),
        JSON.stringify({ demo: true, index: i }),
      ],
    );
    postingIds.push(rows[0]!.id);
  }

  // Feedback: likes on a few ranked jobs; teaching dismissals on mismatches; quiet hide sample
  for (let i = 0; i < 5; i += 1) {
    await db.query(
      `INSERT INTO posting_feedback (posting_id, kind, note, teach)
       VALUES ($1, 'like', 'Demo like — strong team fit.', true)`,
      [postingIds[i]!],
    );
  }
  for (let i = 50; i < 60; i += 1) {
    await db.query(
      `INSERT INTO posting_feedback (posting_id, kind, note, teach)
       VALUES ($1, 'dismiss', $2, $3)`,
      [
        postingIds[i]!,
        i === 55 ? "Quiet hide sample (does not teach)." : "Demo mismatch feedback.",
        i !== 55,
      ],
    );
  }

  // Applications across pipeline
  const appStatuses = [
    "applied",
    "applied",
    "applied",
    "interviewing",
    "interviewing",
    "accepted",
    "declined",
    "applied",
  ] as const;
  const applicationIds: string[] = [];
  for (let i = 0; i < appStatuses.length; i += 1) {
    const status = appStatuses[i]!;
    const postingId = postingIds[i]!;
    const company = COMPANIES[i % COMPANIES.length]!;
    const title = TITLES[i % TITLES.length]!;
    const { rows } = await db.query<{ id: string }>(
      `INSERT INTO applications (
         posting_id, status, notes, company_name, title, location, url, applied_at, status_changed_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
       RETURNING id`,
      [
        postingId,
        status,
        status === "interviewing" ? "Demo: phone screen scheduled." : "Demo application notes.",
        company,
        title,
        LOCATIONS[i % LOCATIONS.length],
        `https://demo.career-digest.invalid/apply/${i}`,
        daysAgo(5 + i),
      ],
    );
    applicationIds.push(rows[0]!.id);
  }

  // Open application tasks for a few ranked postings not yet applied
  let todoApps = 0;
  for (let i = 10; i < 18; i += 1) {
    const postingId = postingIds[i]!;
    const company = COMPANIES[i % COMPANIES.length]!;
    const title = TITLES[i % TITLES.length]!;
    const { rows: appRows } = await db.query<{ id: string }>(
      `INSERT INTO applications (
         posting_id, status, company_name, title, location, url, status_changed_at
       ) VALUES ($1, 'todo', $2, $3, $4, $5, now())
       RETURNING id`,
      [
        postingId,
        company,
        title,
        LOCATIONS[i % LOCATIONS.length],
        `https://demo.career-digest.invalid/apply/${i}`,
      ],
    );
    todoApps += 1;
    await db.query(
      `INSERT INTO tasks (
         category, status, title, organization, url, posting_id, application_id
       ) VALUES (
         'application', 'open', $1, $2, $3, $4, $5
       )`,
      [
        title,
        company,
        `https://demo.career-digest.invalid/apply/${i}`,
        postingId,
        appRows[0]!.id,
      ],
    );
  }

  await db.query(
    `INSERT INTO tasks (category, status, title, organization, notes, due_at)
     VALUES
       ('school', 'open', 'Finish networks problem set', 'Campus University', 'Chapters 4–5', $1),
       ('school', 'open', 'Office hours — compilers', 'Campus University', NULL, $2),
       ('personal', 'open', 'Book dentist cleaning', NULL, NULL, $3),
       ('personal', 'open', 'Update resume bullet for Parcel Grove', NULL, 'Demo personal task', NULL),
       ('school', 'completed', 'Submit systems lab', 'Campus University', NULL, NULL)`,
    [daysAgo(-2), daysAgo(-1), daysAgo(-3)],
  );
  await db.query(
    `UPDATE tasks SET completed_at = now() - interval '3 days'
     WHERE category = 'school' AND status = 'completed'`,
  );

  // Interview threads (schema: primary_application_id, label, status — no company_name columns)
  let interviewThreads = 0;
  for (const [idx, appId] of applicationIds.slice(3, 6).entries()) {
    const { rows: threadRows } = await db.query<{ id: string }>(
      `INSERT INTO interview_threads (primary_application_id, label, status)
       VALUES ($1, $2, 'active')
       RETURNING id`,
      [appId, `Demo loop ${idx + 1}`],
    );
    const threadId = threadRows[0]?.id;
    if (!threadId) continue;
    interviewThreads += 1;
    await db.query(
      `INSERT INTO application_thread_members (thread_id, application_id) VALUES ($1, $2)`,
      [threadId, appId],
    );
    await db.query(
      `INSERT INTO application_steps (
         thread_id, kind, title, status, due_at, notes, sort_order, completed_at
       ) VALUES
         ($1, 'phone', 'Recruiter screen', 'completed', $2, 'Demo step', 0, $2),
         ($1, 'technical', 'Coding interview', 'scheduled', $3, 'Prep graphs', 1, NULL),
         ($1, 'onsite', 'Final round', 'pending', $4, NULL, 2, NULL)`,
      [threadId, daysAgo(2), daysAgo(-4), daysAgo(-10)],
    );
  }

  // Progress: ~60 days of LC + reflections
  let leetcodeDays = 0;
  for (let d = 0; d < 60; d += 1) {
    if (d % 3 === 0) continue;
    const count = 1 + (d % 4);
    await db.query(
      `INSERT INTO leetcode_daily (local_date, count) VALUES ($1::date, $2)
       ON CONFLICT (local_date) DO UPDATE SET count = EXCLUDED.count`,
      [localDateDaysAgo(d), count],
    );
    leetcodeDays += 1;
  }

  let reflections = 0;
  for (let d = 0; d < 40; d += 2) {
    const lane = d % 4 === 0 ? "application" : "technical";
    await db.query(
      `INSERT INTO reflection_logs (lane, body, created_at)
       VALUES ($1, $2, $3)`,
      [
        lane,
        lane === "application"
          ? "Demo reflection: researched company values and tailored bullets."
          : "Demo reflection: worked through a tricky DP pattern.",
        daysAgo(d),
      ],
    );
    reflections += 1;
  }

  // Fake document metadata (no durable file required for UI list)
  if (applicationIds[0]) {
    await db.query(
      `INSERT INTO application_documents (application_id, original_name, stored_name, mime_type)
       VALUES
         ($1, 'demo-resume.pdf', $2, 'application/pdf'),
         ($1, 'demo-cover-letter.pdf', $3, 'application/pdf')`,
      [applicationIds[0], randomUUID(), randomUUID()],
    );
  }

  const taskCount = await db.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM tasks WHERE status = 'open'`,
  );

  return {
    companies: COMPANIES.length,
    postings: postingIds.length,
    ranked,
    mismatches,
    applications: applicationIds.length + todoApps,
    tasks: Number(taskCount.rows[0]?.n ?? 0) || 0,
    interviewThreads,
    leetcodeDays,
    reflections,
  };
}

export const DEMO_FICTIONAL_COMPANY_NAMES: readonly string[] = COMPANIES;
