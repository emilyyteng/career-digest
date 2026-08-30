import { randomUUID } from "node:crypto";
import type { PoolClient } from "pg";
import { pool } from "../db.js";
import { assertTestDatabaseMutationAllowed } from "./testDatabaseGuards.js";

export type SeedCompanyInput = {
  name?: string;
  source?: string;
  boardToken?: string;
};

export type SeedPostingInput = {
  id?: string;
  source: string;
  externalId: string;
  companyId: string;
  title?: string;
  url: string;
  location?: string | null;
  department?: string | null;
  descriptionHtml?: string | null;
  rankScore?: number | null;
  rankEligible?: boolean | null;
  rankReason?: string | null;
  rankLocationFit?: string | null;
  rankedAt?: Date | null;
  rankModel?: string | null;
  rankPromptVersion?: string | null;
  raw?: Record<string, unknown>;
};

export type SeedApplicationInput = {
  postingId: string;
  status?: string;
  notes?: string | null;
  appliedAt?: Date | null;
};

export type SeedFeedbackInput = {
  postingId: string;
  kind?: "like" | "dismiss";
  note?: string | null;
};

/** Remove all application data between integration tests. */
export async function truncateAll(client?: PoolClient): Promise<void> {
  assertTestDatabaseMutationAllowed();
  const sql = `
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
  `;
  if (client) {
    await client.query(sql);
  } else {
    await pool.query(sql);
  }
}

export async function seedCompany(input: SeedCompanyInput = {}): Promise<{
  id: string;
  name: string;
  source: string;
  boardToken: string;
}> {
  const name = input.name ?? "Test Company";
  const source = input.source ?? "greenhouse";
  const boardToken = input.boardToken ?? `board-${randomUUID().slice(0, 8)}`;
  const { rows } = await pool.query<{
    id: string;
    name: string;
    source: string;
    board_token: string;
  }>(
    `INSERT INTO companies (name, source, board_token)
     VALUES ($1, $2, $3)
     RETURNING id, name, source, board_token`,
    [name, source, boardToken],
  );
  const row = rows[0]!;
  return {
    id: row.id,
    name: row.name,
    source: row.source,
    boardToken: row.board_token,
  };
}

export async function seedPosting(input: SeedPostingInput): Promise<{ id: string }> {
  const id = input.id ?? randomUUID();
  const title = input.title ?? "Software Engineer Intern";
  const raw = input.raw ?? { test: true };
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO postings (
       id, source, external_id, company_id, title, location, department,
       url, description_html, rank_score, rank_eligible, rank_reason,
       rank_location_fit, ranked_at, rank_model, rank_prompt_version, raw
     )
     VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12,
       $13, $14, $15, $16, $17::jsonb
     )
     RETURNING id`,
    [
      id,
      input.source,
      input.externalId,
      input.companyId,
      title,
      input.location ?? null,
      input.department ?? null,
      input.url,
      input.descriptionHtml ?? null,
      input.rankScore ?? null,
      input.rankEligible ?? null,
      input.rankReason ?? null,
      input.rankLocationFit ?? null,
      input.rankedAt ?? null,
      input.rankModel ?? null,
      input.rankPromptVersion ?? null,
      JSON.stringify(raw),
    ],
  );
  return { id: rows[0]!.id };
}

export async function seedApplication(input: SeedApplicationInput): Promise<{ id: string }> {
  const status = input.status ?? "applied";
  const appliedAt =
    input.appliedAt !== undefined
      ? input.appliedAt
      : status !== "todo"
        ? new Date()
        : null;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO applications (posting_id, status, notes, applied_at, status_changed_at)
     VALUES ($1, $2, $3, $4, now())
     RETURNING id`,
    [input.postingId, status, input.notes ?? null, appliedAt],
  );
  return { id: rows[0]!.id };
}

export async function seedFeedback(input: SeedFeedbackInput): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO posting_feedback (posting_id, kind, note)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [input.postingId, input.kind ?? "like", input.note ?? null],
  );
  return { id: rows[0]!.id };
}

/** Posting that appears on the ranked jobs tab. */
export async function seedRankedPosting(
  input: SeedPostingInput & {
    rankScore?: number;
    rankReason?: string | null;
  },
): Promise<{ id: string }> {
  return seedPosting({
    ...input,
    descriptionHtml: input.descriptionHtml ?? "<p>Job description</p>",
    rankScore: input.rankScore ?? 90,
    rankEligible: input.rankEligible ?? true,
    rankReason: input.rankReason ?? "Strong internship fit",
    rankedAt: input.rankedAt ?? new Date("2025-06-01T12:00:00Z"),
  });
}

export async function seedManualApplication(input: {
  status?: string;
  company?: string;
  title?: string;
  notes?: string | null;
  dueAt?: Date | null;
  appliedAt?: Date | null;
} = {}): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO applications (
       status, notes, company_name, title, due_at, applied_at, status_changed_at
     )
     VALUES ($1, $2, $3, $4, $5, $6, now())
     RETURNING id`,
    [
      input.status ?? "applied",
      input.notes ?? null,
      input.company ?? "Manual Co",
      input.title ?? "Analyst Intern",
      input.dueAt ?? null,
      input.appliedAt ?? (input.status === "todo" ? null : new Date()),
    ],
  );
  return { id: rows[0]!.id };
}

export async function getPosting(id: string): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query(`SELECT * FROM postings WHERE id = $1`, [id]);
  return rows[0] ?? null;
}

export async function postingExists(id: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM postings WHERE id = $1) AS exists`,
    [id],
  );
  return rows[0]?.exists ?? false;
}

export async function getApplicationByPosting(postingId: string): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query(`SELECT * FROM applications WHERE posting_id = $1`, [postingId]);
  return rows[0] ?? null;
}

export async function getFeedbackByPosting(postingId: string): Promise<Record<string, unknown> | null> {
  const { rows } = await pool.query(`SELECT * FROM posting_feedback WHERE posting_id = $1`, [postingId]);
  return rows[0] ?? null;
}

export async function markPostingRemovedFromBoard(postingId: string): Promise<void> {
  await pool.query(
    `UPDATE postings SET removed_from_board_at = now() WHERE id = $1`,
    [postingId],
  );
}

export async function seedApplicationDocument(input: {
  applicationId: string;
  originalName?: string;
  storedName?: string;
}): Promise<{ id: string }> {
  const storedName = input.storedName ?? randomUUID();
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO application_documents (application_id, original_name, stored_name, mime_type)
     VALUES ($1, $2, $3, 'application/pdf')
     RETURNING id`,
    [input.applicationId, input.originalName ?? "resume.pdf", storedName],
  );
  return { id: rows[0]!.id };
}

export async function seedTask(input: {
  category?: "school" | "personal" | "application";
  status?: "open" | "completed";
  title?: string;
  organization?: string | null;
  url?: string | null;
  notes?: string | null;
  dueAt?: Date | null;
  completedAt?: Date | null;
  createdAt?: Date;
  postingId?: string | null;
  applicationId?: string | null;
} = {}): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO tasks (
       category, status, title, organization, url, notes,
       due_at, completed_at, created_at, posting_id, application_id
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, COALESCE($9, now()), $10, $11)
     RETURNING id`,
    [
      input.category ?? "school",
      input.status ?? "open",
      input.title ?? "Read chapter 3",
      input.organization ?? null,
      input.url ?? null,
      input.notes ?? null,
      input.dueAt ?? null,
      input.completedAt ?? null,
      input.createdAt ?? null,
      input.postingId ?? null,
      input.applicationId ?? null,
    ],
  );
  return { id: rows[0]!.id };
}

export async function seedInterviewThread(input: {
  primaryApplicationId: string;
  stepTitle?: string;
}): Promise<{ threadId: string; stepId: string }> {
  const { rows: threadRows } = await pool.query<{ id: string }>(
    `INSERT INTO interview_threads (primary_application_id) VALUES ($1) RETURNING id`,
    [input.primaryApplicationId],
  );
  const threadId = threadRows[0]!.id;
  await pool.query(
    `INSERT INTO application_thread_members (thread_id, application_id) VALUES ($1, $2)`,
    [threadId, input.primaryApplicationId],
  );
  const { rows: stepRows } = await pool.query<{ id: string }>(
    `INSERT INTO application_steps (thread_id, title, sort_order) VALUES ($1, $2, 0) RETURNING id`,
    [threadId, input.stepTitle ?? "Phone screen"],
  );
  return { threadId, stepId: stepRows[0]!.id };
}

export async function countApplicationDocuments(applicationId: string): Promise<number> {
  const { rows } = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count FROM application_documents WHERE application_id = $1`,
    [applicationId],
  );
  return Number(rows[0]?.count ?? 0);
}

export async function interviewThreadExists(threadId: string): Promise<boolean> {
  const { rows } = await pool.query<{ exists: boolean }>(
    `SELECT EXISTS(SELECT 1 FROM interview_threads WHERE id = $1) AS exists`,
    [threadId],
  );
  return rows[0]?.exists ?? false;
}

export async function seedLeetcodeDaily(
  localDate: string,
  count: number,
): Promise<void> {
  await pool.query(
    `INSERT INTO leetcode_daily (local_date, count) VALUES ($1::date, $2)
     ON CONFLICT (local_date) DO UPDATE SET count = EXCLUDED.count`,
    [localDate, count],
  );
}

export async function seedReflectionLog(input: {
  lane: "application" | "technical";
  body: string;
  applicationId?: string | null;
  createdAt?: Date;
}): Promise<{ id: string }> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO reflection_logs (lane, body, application_id, created_at)
     VALUES ($1, $2, $3, COALESCE($4, now()))
     RETURNING id`,
    [
      input.lane,
      input.body,
      input.applicationId ?? null,
      input.createdAt ?? null,
    ],
  );
  return { id: rows[0]!.id };
}
