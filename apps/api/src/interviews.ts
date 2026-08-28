import type { Pool, PoolClient } from "pg";
import {
  ACTIONABLE_STEP_STATUSES,
  applicationResolutionFromStatus,
  isOpenStepStatus,
  isStepKind,
  isStepStatus,
  isThreadResolution,
  type StepKind,
  type StepStatus,
  type ThreadResolution,
} from "./interviewStatuses.js";

type Queryable = Pool | PoolClient;

export type InterviewApplicationSummary = {
  id: string;
  postingId: string | null;
  status: string;
  company: string | null;
  title: string | null;
  location: string | null;
  appliedAt: string | null;
};

export type InterviewStepRow = {
  id: string;
  kind: StepKind;
  title: string;
  status: StepStatus;
  dueAt: string | null;
  scheduledAt: string | null;
  url: string | null;
  notes: string | null;
  prepNotes: string | null;
  sortOrder: number;
  completedAt: string | null;
};

export type InterviewThreadListItem = {
  id: string;
  status: string;
  resolution: string | null;
  label: string | null;
  resolvedAt: string | null;
  primaryApplicationId: string;
  company: string | null;
  primaryTitle: string | null;
  memberCount: number;
  members: InterviewApplicationSummary[];
  nextStep: InterviewStepRow | null;
  canAddStep: boolean;
  updatedAt: string;
};

export type InterviewThreadDetail = InterviewThreadListItem & {
  steps: InterviewStepRow[];
};

const applicationSummarySelect = `
  SELECT
    a.id,
    a.posting_id AS "postingId",
    a.status,
    COALESCE(
      a.company_name,
      CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
      c.name
    ) AS company,
    COALESCE(a.title, p.title) AS title,
    COALESCE(a.location, p.location) AS location,
    a.applied_at AS "appliedAt"
  FROM applications a
  LEFT JOIN postings p ON p.id = a.posting_id
  LEFT JOIN companies c ON c.id = p.company_id
`;

function parseOptionalTimestamp(value: unknown): Date | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") return null;
  const d = new Date(value.trim());
  return Number.isFinite(d.getTime()) ? d : null;
}

async function loadMembers(
  db: Queryable,
  threadId: string,
): Promise<InterviewApplicationSummary[]> {
  const result = await db.query<InterviewApplicationSummary>(
    `${applicationSummarySelect}
     JOIN application_thread_members m ON m.application_id = a.id
     WHERE m.thread_id = $1
     ORDER BY
       CASE WHEN a.id = (SELECT primary_application_id FROM interview_threads WHERE id = $1) THEN 0 ELSE 1 END,
       a.applied_at DESC NULLS LAST,
       a.created_at DESC`,
    [threadId],
  );
  return result.rows;
}

async function loadSteps(db: Queryable, threadId: string): Promise<InterviewStepRow[]> {
  const result = await db.query<InterviewStepRow>(
    `SELECT
       id,
       kind,
       title,
       status,
       due_at AS "dueAt",
       scheduled_at AS "scheduledAt",
       url,
       notes,
       prep_notes AS "prepNotes",
       sort_order AS "sortOrder",
       completed_at AS "completedAt"
     FROM application_steps
     WHERE thread_id = $1
     ORDER BY sort_order ASC, created_at ASC`,
    [threadId],
  );
  return result.rows;
}

function pickNextStep(steps: InterviewStepRow[]): InterviewStepRow | null {
  const actionable = steps.filter((s) =>
    ACTIONABLE_STEP_STATUSES.includes(s.status as StepStatus),
  );
  if (actionable.length === 0) return null;
  const sorted = [...actionable].sort((a, b) => {
    const aDue = a.dueAt ? new Date(a.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bDue = b.dueAt ? new Date(b.dueAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aDue !== bDue) return aDue - bDue;
    const aSched = a.scheduledAt ? new Date(a.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    const bSched = b.scheduledAt ? new Date(b.scheduledAt).getTime() : Number.MAX_SAFE_INTEGER;
    if (aSched !== bSched) return aSched - bSched;
    return a.sortOrder - b.sortOrder;
  });
  return sorted[0] ?? null;
}

function threadProgressScore(steps: InterviewStepRow[]): number {
  const completed = steps.filter((s) => s.status === "completed").length;
  const awaiting = steps.filter((s) => s.status === "awaiting_employer").length;
  return completed * 10 + awaiting * 5;
}

async function loadThreadListItem(
  db: Queryable,
  threadId: string,
): Promise<InterviewThreadListItem | null> {
  const head = await db.query<{
    id: string;
    status: string;
    resolution: string | null;
    label: string | null;
    resolvedAt: string | null;
    primaryApplicationId: string;
    updatedAt: string;
    company: string | null;
    primaryTitle: string | null;
    memberCount: string;
  }>(
    `SELECT
       t.id,
       t.status,
       t.resolution,
       t.label,
       t.resolved_at AS "resolvedAt",
       t.primary_application_id AS "primaryApplicationId",
       t.updated_at AS "updatedAt",
       COALESCE(
         pa.company_name,
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       COALESCE(pa.title, p.title) AS "primaryTitle",
       (SELECT COUNT(*)::text FROM application_thread_members m WHERE m.thread_id = t.id) AS "memberCount"
     FROM interview_threads t
     JOIN applications pa ON pa.id = t.primary_application_id
     LEFT JOIN postings p ON p.id = pa.posting_id
     LEFT JOIN companies c ON c.id = p.company_id
     WHERE t.id = $1`,
    [threadId],
  );
  if (!head.rows[0]) return null;
  const members = await loadMembers(db, threadId);
  const steps = await loadSteps(db, threadId);
  const row = head.rows[0];
  return {
    id: row.id,
    status: row.status,
    resolution: row.resolution,
    label: row.label,
    resolvedAt: row.resolvedAt,
    primaryApplicationId: row.primaryApplicationId,
    company: row.company,
    primaryTitle: row.primaryTitle,
    memberCount: Number(row.memberCount) || members.length,
    members,
    nextStep: pickNextStep(steps),
    canAddStep: !steps.some((s) => isOpenStepStatus(s.status)),
    updatedAt: row.updatedAt,
  };
}

function hasActionRequired(steps: InterviewStepRow[]): boolean {
  return steps.some((s) => ACTIONABLE_STEP_STATUSES.includes(s.status as StepStatus));
}

export async function listInterviewThreads(
  db: Queryable,
  view: "active" | "past",
): Promise<{
  actionRequired: InterviewThreadListItem[];
  awaiting: InterviewThreadListItem[];
  past: InterviewThreadListItem[];
}> {
  const statusFilter = view === "past" ? "resolved" : "active";
  const threads = await db.query<{ id: string }>(
    `SELECT id FROM interview_threads WHERE status = $1 ORDER BY updated_at DESC`,
    [statusFilter],
  );

  const items: InterviewThreadListItem[] = [];
  for (const row of threads.rows) {
    const item = await loadThreadListItem(db, row.id);
    if (item) items.push(item);
  }

  if (view === "past") {
    items.sort(
      (a, b) =>
        new Date(b.resolvedAt ?? b.updatedAt).getTime() -
        new Date(a.resolvedAt ?? a.updatedAt).getTime(),
    );
    return { actionRequired: [], awaiting: [], past: items };
  }

  const actionRequired: InterviewThreadListItem[] = [];
  const awaiting: InterviewThreadListItem[] = [];

  for (const item of items) {
    const steps = await loadSteps(db, item.id);
    if (hasActionRequired(steps)) {
      actionRequired.push(item);
    } else {
      awaiting.push(item);
    }
  }

  const urgency = (item: InterviewThreadListItem) => {
    const step = item.nextStep;
    if (!step) return Number.MAX_SAFE_INTEGER;
    if (step.dueAt) return new Date(step.dueAt).getTime();
    if (step.scheduledAt) return new Date(step.scheduledAt).getTime();
    return Number.MAX_SAFE_INTEGER;
  };

  actionRequired.sort((a, b) => urgency(a) - urgency(b));

  const awaitingWithScore = await Promise.all(
    awaiting.map(async (item) => ({
      item,
      steps: await loadSteps(db, item.id),
    })),
  );
  awaitingWithScore.sort((a, b) => {
    const prog = threadProgressScore(b.steps) - threadProgressScore(a.steps);
    if (prog !== 0) return prog;
    return new Date(b.item.updatedAt).getTime() - new Date(a.item.updatedAt).getTime();
  });

  return {
    actionRequired,
    awaiting: awaitingWithScore.map((x) => x.item),
    past: [],
  };
}

export async function getInterviewThread(
  db: Queryable,
  threadId: string,
): Promise<InterviewThreadDetail | null> {
  const item = await loadThreadListItem(db, threadId);
  if (!item) return null;
  const steps = await loadSteps(db, threadId);
  return { ...item, steps };
}

export async function listPickerApplications(db: Queryable): Promise<InterviewApplicationSummary[]> {
  const result = await db.query<InterviewApplicationSummary>(
    `${applicationSummarySelect}
     WHERE a.status IN ('interviewing', 'applied')
       AND a.id NOT IN (SELECT application_id FROM application_thread_members)
     ORDER BY
       CASE a.status WHEN 'interviewing' THEN 0 WHEN 'applied' THEN 1 ELSE 2 END,
       a.applied_at DESC NULLS LAST,
       a.created_at DESC`,
  );
  return result.rows;
}

export async function resolveThreadsForApplication(
  db: Queryable,
  applicationId: string,
  resolution: ThreadResolution,
): Promise<void> {
  await db.query(
    `UPDATE interview_threads t
     SET status = 'resolved',
         resolution = $2,
         resolved_at = now(),
         updated_at = now()
     FROM application_thread_members m
     WHERE m.application_id = $1
       AND m.thread_id = t.id
       AND t.status = 'active'`,
    [applicationId, resolution],
  );
}

export async function createInterviewThread(
  db: Queryable,
  body: {
    applicationIds: string[];
    primaryApplicationId?: string;
    label?: string | null;
    step: {
      kind?: string;
      title: string;
      status?: string;
      dueAt?: string | null;
      scheduledAt?: string | null;
      url?: string | null;
      notes?: string | null;
    };
  },
): Promise<string> {
  const appIds = [...new Set(body.applicationIds)];
  if (appIds.length === 0) {
    throw new Error("Select at least one application");
  }

  const apps = await db.query<{ id: string; status: string }>(
    `SELECT id, status FROM applications WHERE id = ANY($1::uuid[])`,
    [appIds],
  );
  if (apps.rows.length !== appIds.length) {
    throw new Error("One or more applications not found");
  }
  for (const row of apps.rows) {
    if (row.status !== "applied" && row.status !== "interviewing") {
      throw new Error("Only applied or interviewing applications can be linked");
    }
  }

  const existing = await db.query(
    `SELECT application_id FROM application_thread_members WHERE application_id = ANY($1::uuid[])`,
    [appIds],
  );
  if (existing.rows.length > 0) {
    throw new Error("One or more applications already belong to an interview thread");
  }

  const primaryId =
    body.primaryApplicationId && appIds.includes(body.primaryApplicationId)
      ? body.primaryApplicationId
      : appIds[0];

  const kind = body.step.kind && isStepKind(body.step.kind) ? body.step.kind : "custom";
  if (!body.step.title?.trim()) {
    throw new Error("Step title is required");
  }

  let stepStatus: StepStatus = "pending";
  if (body.step.status && isStepStatus(body.step.status)) {
    stepStatus = body.step.status;
  } else if (body.step.scheduledAt) {
    stepStatus = "scheduled";
  }

  const dueAt = parseOptionalTimestamp(body.step.dueAt);
  const scheduledAt = parseOptionalTimestamp(body.step.scheduledAt);

  const thread = await db.query<{ id: string }>(
    `INSERT INTO interview_threads (primary_application_id, label)
     VALUES ($1, $2)
     RETURNING id`,
    [primaryId, body.label?.trim() || null],
  );
  const threadId = thread.rows[0].id;

  for (const appId of appIds) {
    await db.query(
      `INSERT INTO application_thread_members (thread_id, application_id) VALUES ($1, $2)`,
      [threadId, appId],
    );
  }

  await db.query(
    `UPDATE applications SET status = 'interviewing', status_changed_at = now(), updated_at = now()
     WHERE id = ANY($1::uuid[]) AND status = 'applied'`,
    [appIds],
  );

  await db.query(
    `INSERT INTO application_steps (
       thread_id, kind, title, status, due_at, scheduled_at, url, notes, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 0)`,
    [
      threadId,
      kind,
      body.step.title.trim(),
      stepStatus,
      dueAt ?? null,
      scheduledAt ?? null,
      body.step.url?.trim() || null,
      body.step.notes?.trim() || null,
    ],
  );

  await db.query(`UPDATE interview_threads SET updated_at = now() WHERE id = $1`, [threadId]);

  return threadId;
}

export async function addThreadMembers(
  db: Queryable,
  threadId: string,
  applicationIds: string[],
): Promise<void> {
  const appIds = [...new Set(applicationIds)];
  if (appIds.length === 0) return;

  const thread = await db.query(`SELECT id FROM interview_threads WHERE id = $1`, [threadId]);
  if (thread.rows.length === 0) throw new Error("Interview thread not found");

  const apps = await db.query<{ id: string; status: string }>(
    `SELECT id, status FROM applications WHERE id = ANY($1::uuid[])`,
    [appIds],
  );
  if (apps.rows.length !== appIds.length) {
    throw new Error("One or more applications not found");
  }
  for (const row of apps.rows) {
    if (row.status !== "applied" && row.status !== "interviewing") {
      throw new Error("Only applied or interviewing applications can be linked");
    }
  }
  const existing = await db.query(
    `SELECT application_id FROM application_thread_members WHERE application_id = ANY($1::uuid[])`,
    [appIds],
  );
  if (existing.rows.length > 0) {
    throw new Error("One or more applications already belong to an interview thread");
  }

  for (const appId of appIds) {
    await db.query(
      `INSERT INTO application_thread_members (thread_id, application_id) VALUES ($1, $2)`,
      [threadId, appId],
    );
  }
  await db.query(
    `UPDATE applications SET status = 'interviewing', status_changed_at = now(), updated_at = now()
     WHERE id = ANY($1::uuid[]) AND status = 'applied'`,
    [appIds],
  );
  await db.query(`UPDATE interview_threads SET updated_at = now() WHERE id = $1`, [threadId]);
}

export async function patchInterviewThread(
  db: Queryable,
  threadId: string,
  body: {
    primaryApplicationId?: string;
    label?: string | null;
    status?: string;
    resolution?: string | null;
  },
): Promise<void> {
  const current = await db.query<{ status: string }>(
    `SELECT status FROM interview_threads WHERE id = $1`,
    [threadId],
  );
  if (!current.rows[0]) throw new Error("Interview thread not found");

  if (body.primaryApplicationId) {
    const member = await db.query(
      `SELECT 1 FROM application_thread_members WHERE thread_id = $1 AND application_id = $2`,
      [threadId, body.primaryApplicationId],
    );
    if (member.rows.length === 0) {
      throw new Error("Primary application must be a member of this thread");
    }
  }

  let resolution: string | null | undefined = undefined;
  if (body.status === "resolved") {
    if (body.resolution && isThreadResolution(body.resolution)) {
      resolution = body.resolution;
    } else if (body.resolution === null) {
      resolution = null;
    }
  } else if (body.resolution !== undefined) {
    resolution =
      body.resolution && isThreadResolution(body.resolution) ? body.resolution : null;
  }

  await db.query(
    `UPDATE interview_threads SET
       primary_application_id = COALESCE($2, primary_application_id),
       label = CASE WHEN $3::boolean THEN $4 ELSE label END,
       status = COALESCE($5, status),
       resolution = CASE
         WHEN $6::boolean THEN $7
         WHEN $5 = 'resolved' AND resolution IS NULL THEN resolution
         WHEN $5 = 'active' THEN NULL
         ELSE resolution
       END,
       resolved_at = CASE
         WHEN $5 = 'resolved' THEN COALESCE(resolved_at, now())
         WHEN $5 = 'active' THEN NULL
         ELSE resolved_at
       END,
       updated_at = now()
     WHERE id = $1`,
    [
      threadId,
      body.primaryApplicationId ?? null,
      body.label !== undefined,
      body.label?.trim() || null,
      body.status ?? null,
      resolution !== undefined,
      resolution,
    ],
  );
}

export async function addInterviewStep(
  db: Queryable,
  threadId: string,
  body: {
    kind?: string;
    title: string;
    status?: string;
    dueAt?: string | null;
    scheduledAt?: string | null;
    url?: string | null;
    notes?: string | null;
    prepNotes?: string | null;
  },
): Promise<string> {
  const thread = await db.query(`SELECT id FROM interview_threads WHERE id = $1`, [threadId]);
  if (thread.rows.length === 0) throw new Error("Interview thread not found");

  if (!body.title?.trim()) throw new Error("Step title is required");

  const existingSteps = await loadSteps(db, threadId);
  if (existingSteps.some((s) => isOpenStepStatus(s.status))) {
    throw new Error("Close the current step before adding another.");
  }

  const kind = body.kind && isStepKind(body.kind) ? body.kind : "custom";
  let stepStatus: StepStatus = "pending";
  if (body.status && isStepStatus(body.status)) {
    stepStatus = body.status;
  } else if (body.scheduledAt) {
    stepStatus = "scheduled";
  }

  const order = await db.query<{ max: number }>(
    `SELECT COALESCE(MAX(sort_order), -1) + 1 AS max FROM application_steps WHERE thread_id = $1`,
    [threadId],
  );

  const dueAt = parseOptionalTimestamp(body.dueAt);
  const scheduledAt = parseOptionalTimestamp(body.scheduledAt);

  const inserted = await db.query<{ id: string }>(
    `INSERT INTO application_steps (
       thread_id, kind, title, status, due_at, scheduled_at, url, notes, prep_notes, sort_order
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id`,
    [
      threadId,
      kind,
      body.title.trim(),
      stepStatus,
      dueAt ?? null,
      scheduledAt ?? null,
      body.url?.trim() || null,
      body.notes?.trim() || null,
      body.prepNotes?.trim() || null,
      order.rows[0]?.max ?? 0,
    ],
  );

  await db.query(`UPDATE interview_threads SET updated_at = now() WHERE id = $1`, [threadId]);

  return inserted.rows[0].id;
}

export async function patchInterviewStep(
  db: Queryable,
  threadId: string,
  stepId: string,
  body: {
    kind?: string;
    title?: string;
    status?: string;
    dueAt?: string | null;
    scheduledAt?: string | null;
    url?: string | null;
    notes?: string | null;
    prepNotes?: string | null;
  },
): Promise<void> {
  const current = await db.query<{ status: string }>(
    `SELECT status FROM application_steps WHERE id = $1 AND thread_id = $2`,
    [stepId, threadId],
  );
  if (!current.rows[0]) throw new Error("Step not found");

  let status = current.rows[0].status;
  if (body.status && isStepStatus(body.status)) {
    status = body.status;
  }

  const dueProvided = body.dueAt !== undefined;
  const schedProvided = body.scheduledAt !== undefined;
  const dueAt = dueProvided ? parseOptionalTimestamp(body.dueAt) : undefined;
  const scheduledAt = schedProvided ? parseOptionalTimestamp(body.scheduledAt) : undefined;

  await db.query(
    `UPDATE application_steps SET
       kind = COALESCE($3, kind),
       title = COALESCE($4, title),
       status = $5,
       due_at = CASE WHEN $6::boolean THEN $7 ELSE due_at END,
       scheduled_at = CASE WHEN $8::boolean THEN $9 ELSE scheduled_at END,
       url = CASE WHEN $10::boolean THEN $11 ELSE url END,
       notes = CASE WHEN $12::boolean THEN $13 ELSE notes END,
       prep_notes = CASE WHEN $14::boolean THEN $15 ELSE prep_notes END,
       completed_at = CASE
         WHEN $5 IN ('completed', 'skipped', 'awaiting_employer') AND completed_at IS NULL THEN now()
         WHEN $5 IN ('pending', 'scheduled') THEN NULL
         ELSE completed_at
       END,
       updated_at = now()
     WHERE id = $1 AND thread_id = $2`,
    [
      stepId,
      threadId,
      body.kind && isStepKind(body.kind) ? body.kind : null,
      body.title?.trim() || null,
      status,
      dueProvided,
      dueAt ?? null,
      schedProvided,
      scheduledAt ?? null,
      body.url !== undefined,
      body.url?.trim() || null,
      body.notes !== undefined,
      body.notes?.trim() || null,
      body.prepNotes !== undefined,
      body.prepNotes?.trim() || null,
    ],
  );

  await db.query(`UPDATE interview_threads SET updated_at = now() WHERE id = $1`, [threadId]);
}

export { applicationResolutionFromStatus };
