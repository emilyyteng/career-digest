import { pool } from "./db.js";
import { getBoardRefresh } from "./boardRefresh.js";
import { listInterviewThreads } from "./interviews.js";
import { listOpenTasksForHome } from "./tasks.js";

const JOBS_LIST_BASE = `
  p.removed_from_board_at IS NULL
  AND (a.id IS NULL OR a.status = 'todo')
`;
const HAS_DESCRIPTION = `p.description_html IS NOT NULL AND btrim(p.description_html) <> ''`;

export type HomeJobPick = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  rankScore: number | null;
  rankReason: string | null;
  rankedAt: string | null;
  firstSeenAt: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
  pickKind: "top" | "newly_ranked" | "new_to_digest";
};

export type HomeInterviewAttention = {
  threadId: string;
  company: string | null;
  primaryTitle: string | null;
  nextStepTitle: string | null;
  deadlineLabel: string | null;
  deadlineIso: string | null;
};

export type HomeTaskAttention = {
  id: string;
  title: string;
  organization: string | null;
  category: string;
  dueLabel: string | null;
  dueIso: string | null;
};

function taskDueLabel(dueAt: string | null): string | null {
  if (!dueAt) return null;
  const formatted = formatDeadlineLong(dueAt);
  if (!formatted) return null;
  return `Due: ${formatted}`;
}

function formatDeadlineLong(value: string): string | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function interviewDeadlineIso(
  step: { dueAt: string | null; scheduledAt: string | null; status: string } | null | undefined,
): string | null {
  if (!step) return null;
  if (step.status === "scheduled" && step.scheduledAt) return step.scheduledAt;
  return step.dueAt;
}

function interviewDeadlineLabel(
  step: { dueAt: string | null; scheduledAt: string | null; status: string } | null | undefined,
): string | null {
  const at = interviewDeadlineIso(step);
  if (!at) return null;
  const formatted = formatDeadlineLong(at);
  if (!formatted) return null;
  const prefix = step?.status === "scheduled" ? "Scheduled" : "Due";
  return `${prefix}: ${formatted}`;
}

export type HomeDashboard = {
  greetingName: string;
  lastDigest: {
    status: string;
    finishedAt: string | null;
    lastOkAt: string | null;
    error: string | null;
  };
  newAndTopPicks: {
    topRanked: HomeJobPick[];
    newlyRanked: HomeJobPick[];
    newToDigest: HomeJobPick[];
  };
  needsAttention: {
    interviews: HomeInterviewAttention[];
    interviewActionCount: number;
    tasks: HomeTaskAttention[];
    taskTotal: number;
  };
};

type JobRow = {
  id: string;
  company: string;
  title: string;
  location: string | null;
  rankScore: number | null;
  rankReason: string | null;
  rankedAt: string | null;
  firstSeenAt: string | null;
  applicationId: string | null;
  applicationStatus: string | null;
};

function mapPick(row: JobRow, pickKind: HomeJobPick["pickKind"]): HomeJobPick {
  return {
    id: row.id,
    company: row.company,
    title: row.title,
    location: row.location,
    rankScore: row.rankScore,
    rankReason: row.rankReason,
    rankedAt: row.rankedAt,
    firstSeenAt: row.firstSeenAt,
    applicationId: row.applicationId,
    applicationStatus: row.applicationStatus,
    pickKind,
  };
}

const HOME_ATTENTION_LIMIT = 4;

async function loadJobRows(
  whereExtra: string,
  orderBy: string,
  limit = HOME_ATTENTION_LIMIT,
  excludeIds: string[] = [],
): Promise<JobRow[]> {
  const params: unknown[] = [];
  let excludeClause = "";
  if (excludeIds.length > 0) {
    params.push(excludeIds);
    excludeClause = `AND p.id <> ALL($${params.length}::uuid[])`;
  }
  params.push(limit);
  const limitParam = `$${params.length}`;
  const result = await pool.query<JobRow>(
    `SELECT
       p.id,
       COALESCE(
         CASE WHEN p.source = 'simplify' THEN NULLIF(p.department, '') END,
         c.name
       ) AS company,
       p.title,
       p.location,
       p.rank_score AS "rankScore",
       p.rank_reason AS "rankReason",
       p.ranked_at AS "rankedAt",
       p.first_seen_at AS "firstSeenAt",
       a.id AS "applicationId",
       a.status AS "applicationStatus"
     FROM postings p
     JOIN companies c ON c.id = p.company_id
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}
       AND ${HAS_DESCRIPTION}
       AND p.rank_eligible IS NOT FALSE
       ${whereExtra}
       ${excludeClause}
     ORDER BY ${orderBy}
     LIMIT ${limitParam}`,
    params,
  );
  return result.rows;
}

export async function getHomeDashboard(): Promise<HomeDashboard> {
  const board = await getBoardRefresh();

  const topRankedRows = await loadJobRows(
    `AND p.ranked_at IS NOT NULL`,
    `p.rank_score DESC NULLS LAST, p.ranked_at DESC`,
    HOME_ATTENTION_LIMIT,
  );
  const topIds = topRankedRows.map((r) => r.id);

  const newlyRankedRows = await loadJobRows(
    `AND p.ranked_at IS NOT NULL AND p.ranked_at > now() - interval '7 days'`,
    `p.ranked_at DESC`,
    HOME_ATTENTION_LIMIT,
    topIds,
  );
  const excludeNew = [...topIds, ...newlyRankedRows.map((r) => r.id)];

  const newToDigestRows = await loadJobRows(
    `AND p.first_seen_at > now() - interval '14 days'`,
    `p.first_seen_at DESC`,
    HOME_ATTENTION_LIMIT,
    excludeNew,
  );

  const interviewData = await listInterviewThreads(pool, "active");
  const interviews: HomeInterviewAttention[] = interviewData.actionRequired
    .slice(0, HOME_ATTENTION_LIMIT)
    .map((row) => ({
      threadId: row.id,
      company: row.company,
      primaryTitle: row.primaryTitle,
      nextStepTitle: row.nextStep?.title ?? null,
      deadlineLabel: interviewDeadlineLabel(row.nextStep),
      deadlineIso: interviewDeadlineIso(row.nextStep),
    }));

  const openTasks = await listOpenTasksForHome(pool, HOME_ATTENTION_LIMIT);
  const tasks: HomeTaskAttention[] = openTasks.tasks.map((row) => ({
    id: row.id,
    title: row.title,
    organization: row.organization,
    category: row.category,
    dueLabel: taskDueLabel(row.dueAt),
    dueIso: row.dueAt,
  }));

  const greetingName =
    process.env.DIGEST_GREETING_NAME?.trim() || "Emily";

  return {
    greetingName,
    lastDigest: {
      status: board.status,
      finishedAt: board.finishedAt,
      lastOkAt: board.lastOkAt,
      error: board.error,
    },
    newAndTopPicks: {
      topRanked: topRankedRows.map((r) => mapPick(r, "top")),
      newlyRanked: newlyRankedRows.map((r) => mapPick(r, "newly_ranked")),
      newToDigest: newToDigestRows.map((r) => mapPick(r, "new_to_digest")),
    },
    needsAttention: {
      interviews,
      interviewActionCount: interviewData.actionRequired.length,
      tasks,
      taskTotal: openTasks.total,
    },
  };
}
