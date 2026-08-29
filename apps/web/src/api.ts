export type JobCard = {
  id: string;
  source: string;
  company: string;
  title: string;
  location: string | null;
  department: string | null;
  url: string;
  firstPublishedAt: string | null;
  sourceUpdatedAt: string | null;
  firstSeenAt: string;
  applicationId: string | null;
  applicationStatus: string | null;
  onTasks?: boolean;
  rankScore: number | null;
  rankEligible: boolean | null;
  rankReason: string | null;
  rankLocationFit: string | null;
  feedbackKind: "like" | "dismiss" | null;
  scrapeStatus?: string | null;
};

export type JobDetail = JobCard & {
  descriptionHtml: string | null;
  applicationNotes: string | null;
  feedbackNote: string | null;
};

export type ApplicationRow = {
  id: string;
  postingId: string | null;
  status: string;
  notes: string | null;
  appliedAt: string | null;
  dueAt: string | null;
  company: string | null;
  title: string | null;
  location: string | null;
  url: string | null;
  source: string | null;
  firstPublishedAt?: string | null;
  sourceUpdatedAt?: string | null;
  descriptionHtml?: string | null;
  documents?: { id: string; originalName: string; mimeType: string | null }[];
};

async function parse<T>(res: Response | Promise<Response>): Promise<T> {
  const response = await res;
  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error || response.statusText);
  }
  return response.json() as Promise<T>;
}

export function api(path: string, init?: RequestInit) {
  return fetch(path, init);
}

export type JobView = "ranked" | "mismatches" | "unranked" | "needs-description";

export type JobsPage = {
  count: number;
  page: number;
  pageSize: number;
  view: JobView;
  counts: Record<JobView, number>;
  jobs: JobCard[];
};

export const getJobs = (
  q = "",
  page = 1,
  pageSize = 25,
  opts?: { view?: JobView; sort?: "rank" | "published" | "updated" },
) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (opts?.view && opts.view !== "ranked") params.set("view", opts.view);
  if (opts?.sort && opts.sort !== "rank") params.set("sort", opts.sort);
  return parse<JobsPage>(api(`/api/jobs?${params}`));
};

export type BoardRefreshStatus = {
  status: "idle" | "running" | "ok" | "error";
  phase: "ingest" | "scrape" | "rank" | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  error: string | null;
};

export type RankBatchStatus = {
  status: "idle" | "running" | "ready" | "ok" | "error";
  phase: "waiting" | "applying" | null;
  batchId: string | null;
  model: string | null;
  openaiStatus: string | null;
  completed: number | null;
  failed: number | null;
  total: number | null;
  chunkIndex: number | null;
  chunkTotal: number | null;
  chunkSize: number | null;
  startedAt: string | null;
  updatedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  appliedOk: number | null;
  appliedError: number | null;
  error: string | null;
  hint: string | null;
};

export const getBoardRefresh = () =>
  parse<BoardRefreshStatus>(api("/api/board/refresh"));

export const getRankBatch = () =>
  parse<RankBatchStatus>(api("/api/rank/batch"));

export type OpsStatus = {
  boardRefresh: BoardRefreshStatus;
  rankBatch: RankBatchStatus;
  rerankQueue: RerankQueueSnapshot;
  rankPromptVersion: string;
  boardRankLimit: number;
  rankingModel: string;
  jobCounts: {
    ranked: number;
    unranked: number;
    mismatches: number;
    needsDescription: number;
  };
  unrankedBlank: number;
  descriptions: {
    simplifyBlankTotal: number;
    simplifyDueNow: number;
    simplifyDeferred: number;
    bySource: Array<{ source: string; blank: number }>;
    byScrapeStatus: Array<{ status: string; count: number }>;
  };
  schedule: {
    cronInstalled: boolean;
    cronTimeLocal: string;
    nextBoardRefreshAt: string;
    steps: string[];
    scrapeRetryNote: string;
    scrapeNextRetries: Array<{
      status: string;
      count: number;
      nextRetryAt: string | null;
    }>;
  };
  backup: {
    directory: string;
    retentionDays: number;
    lastAt: string | null;
    lastFile: string | null;
    sizeBytes: number | null;
    backupCount: number;
  };
};

export const getOpsStatus = () => parse<OpsStatus>(api("/api/ops"));

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

export type HomeTodoApplication = {
  id: string;
  company: string | null;
  title: string | null;
  location: string | null;
  url: string | null;
  statusChangedAt: string | null;
  applyByLabel: string | null;
  applyByIso: string | null;
};

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
  todo: HomeTodoApplication[];
  todoTotal: number;
  needsAttention: {
    interviews: Array<{
      threadId: string;
      company: string | null;
      primaryTitle: string | null;
      nextStepTitle: string | null;
      deadlineLabel: string | null;
      deadlineIso: string | null;
    }>;
    interviewActionCount: number;
  };
};

export const getHomeDashboard = () => parse<HomeDashboard>(api("/api/home"));

export const startBoardRefresh = async () => {
  const response = await api("/api/board/refresh", { method: "POST" });
  const body = (await response.json().catch(() => ({}))) as BoardRefreshStatus & {
    error?: string;
  };
  if (!response.ok && response.status !== 409) {
    throw new Error(body.error || response.statusText);
  }
  return body as BoardRefreshStatus;
};

export const getJob = (id: string) =>
  parse<JobDetail>(api(`/api/jobs/${id}`));

export const patchJob = (id: string, body: { url: string }) =>
  parse<{ id: string; url: string }>(
    api(`/api/jobs/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const getApplications = (status = "all") =>
  parse<{
    count: number;
    counts: Record<string, number>;
    applications: ApplicationRow[];
  }>(api(`/api/applications?status=${encodeURIComponent(status)}`));

export const getApplicationLocations = (q = "") => {
  const params = new URLSearchParams();
  if (q.trim()) params.set("q", q.trim());
  const suffix = params.toString() ? `?${params}` : "";
  return parse<{ locations: string[] }>(api(`/api/applications/locations${suffix}`));
};

export const getApplication = (id: string) =>
  parse<ApplicationRow>(api(`/api/applications/${id}`));

export const createApplication = (body: Record<string, unknown>) =>
  parse<{ id: string }>(
    api("/api/applications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const patchApplication = (id: string, body: Record<string, unknown>) =>
  parse<{ id: string }>(
    api(`/api/applications/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const deleteApplication = (id: string) =>
  parse<{ ok: boolean }>(
    api(`/api/applications/${id}`, { method: "DELETE" }),
  );

export const sendJobFeedback = (jobId: string, kind: "like" | "dismiss", note = "") =>
  parse<{ id: string; kind: string; note: string | null }>(
    api(`/api/jobs/${jobId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, note: note || null }),
    }),
  );

export const clearJobFeedback = (jobId: string) =>
  parse<{ ok: boolean }>(api(`/api/jobs/${jobId}/feedback`, { method: "DELETE" }));

export type RerankQueueSnapshot = {
  items: Array<{
    postingId: string;
    status: "queued" | "running" | "ok" | "error";
    error: string | null;
  }>;
};

export const getRerankQueue = () =>
  parse<RerankQueueSnapshot>(api("/api/jobs/rerank-queue"));

export const queueJobRerank = async (jobId: string, note: string) => {
  const response = await api(`/api/jobs/${jobId}/rerank`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ note }),
  });
  const body = (await response.json().catch(() => ({}))) as {
    queued?: boolean;
    alreadyQueued?: boolean;
    error?: string;
  };
  if (!response.ok && response.status !== 409) {
    throw new Error(body.error || response.statusText);
  }
  return body;
};

export const uploadDocument = (applicationId: string, file: File) => {
  const data = new FormData();
  data.append("file", file);
  return parse<unknown>(
    api(`/api/applications/${applicationId}/documents`, {
      method: "POST",
      body: data,
    }),
  );
};

export type InterviewPickerApplication = {
  id: string;
  postingId: string | null;
  status: string;
  company: string | null;
  title: string | null;
  location: string | null;
  appliedAt: string | null;
};

export type InterviewStep = {
  id: string;
  kind: string;
  title: string;
  status: string;
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
  members: InterviewPickerApplication[];
  nextStep: InterviewStep | null;
  canAddStep: boolean;
  updatedAt: string;
};

export type InterviewThreadDetail = InterviewThreadListItem & {
  steps: InterviewStep[];
};

export const getInterviewPickerApplications = () =>
  parse<{ applications: InterviewPickerApplication[] }>(
    api("/api/interviews/picker-applications"),
  );

export const getInterviews = (view: "active" | "past" = "active") =>
  parse<{
    actionRequired: InterviewThreadListItem[];
    awaiting: InterviewThreadListItem[];
    past: InterviewThreadListItem[];
  }>(api(`/api/interviews?view=${view}`));

export const getInterviewThread = (threadId: string) =>
  parse<InterviewThreadDetail>(api(`/api/interviews/${threadId}`));

export const createInterview = (body: Record<string, unknown>) =>
  parse<{ id: string }>(
    api("/api/interviews", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const patchInterviewThread = (threadId: string, body: Record<string, unknown>) =>
  parse<{ ok: boolean }>(
    api(`/api/interviews/${threadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const addInterviewStep = (threadId: string, body: Record<string, unknown>) =>
  parse<{ id: string }>(
    api(`/api/interviews/${threadId}/steps`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const patchInterviewStep = (
  threadId: string,
  stepId: string,
  body: Record<string, unknown>,
) =>
  parse<{ ok: boolean }>(
    api(`/api/interviews/${threadId}/steps/${stepId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export type TaskCategory = "application" | "school" | "personal";
export type TaskView = "open" | "completed";

export type TaskRow = {
  id: string;
  category: TaskCategory;
  status: "open" | "completed";
  title: string;
  organization: string | null;
  url: string | null;
  notes: string | null;
  dueAt: string | null;
  postingId: string | null;
  applicationId: string | null;
  location: string | null;
  source: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TasksPage = {
  view: TaskView;
  count: number;
  counts: { open: number; completed: number };
  tasks: TaskRow[];
};

export const getTasks = (view: TaskView = "open") =>
  parse<TasksPage>(api(`/api/tasks?view=${encodeURIComponent(view)}`));

export const createTask = (body: Record<string, unknown>) =>
  parse<TaskRow>(
    api("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const patchTask = (id: string, body: Record<string, unknown>) =>
  parse<TaskRow>(
    api(`/api/tasks/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const completeTask = (id: string) =>
  parse<TaskRow>(api(`/api/tasks/${id}/complete`, { method: "POST" }));

export const deleteTask = (id: string) =>
  parse<{ ok: boolean }>(api(`/api/tasks/${id}`, { method: "DELETE" }));

export const addPostingToTasks = (postingId: string) =>
  parse<TaskRow>(
    api("/api/tasks/from-posting", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postingId }),
    }),
  );

export const removePostingFromTasks = (postingId: string) =>
  parse<{ ok: boolean }>(
    api(`/api/tasks/from-posting/${postingId}`, { method: "DELETE" }),
  );
