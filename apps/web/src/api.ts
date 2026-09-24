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
  locationCounts?: Record<string, number>;
  jobs: JobCard[];
};

export const getJobs = (
  q = "",
  page = 1,
  pageSize = 25,
  opts?: {
    view?: JobView;
    sort?: "rank" | "published" | "updated";
    loc?: string | null;
    source?: string | null;
  },
) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (opts?.view && opts.view !== "ranked") params.set("view", opts.view);
  if (opts?.sort && opts.sort !== "rank") params.set("sort", opts.sort);
  if (opts?.loc) params.set("loc", opts.loc);
  if (opts?.source) params.set("source", opts.source);
  return parse<JobsPage>(api(`/api/jobs?${params}`));
};

export type BoardRefreshLastRun = {
  leftBoard: number;
  leftBoardDeleted: number;
  leftBoardRetained: number;
  mergeDeduped: number;
  rankedProcessed: number;
};

export type BoardRefreshStatus = {
  status: "idle" | "running" | "ok" | "error";
  phase: "ingest" | "scrape" | "rank" | null;
  startedAt: string | null;
  finishedAt: string | null;
  lastOkAt: string | null;
  error: string | null;
  lastRun: BoardRefreshLastRun | null;
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
  backupJob: {
    status: "idle" | "running" | "ok" | "error";
    startedAt: string | null;
    finishedAt: string | null;
    lastOkAt: string | null;
    error: string | null;
  };
  liveRankBacklog: {
    status: "idle" | "running" | "ok" | "error";
    startedAt: string | null;
    finishedAt: string | null;
    lastOkAt: string | null;
    error: string | null;
    rankedOk: number | null;
    rankedError: number | null;
    halted: boolean | null;
  };
  demo?: {
    enabled: boolean;
    resetsDailyAt: string;
  };
};

export const getOpsStatus = () => parse<OpsStatus>(api("/api/ops"));

export const startBackup = async () => {
  const response = await api("/api/backup", { method: "POST" });
  const body = (await response.json().catch(() => ({}))) as OpsStatus["backupJob"] & {
    error?: string;
  };
  if (!response.ok && response.status !== 409) {
    throw new Error(body.error || response.statusText);
  }
  return body;
};

export const startLiveRankBacklog = async () => {
  const response = await api("/api/rank/live-backlog", { method: "POST" });
  const body = (await response.json().catch(() => ({}))) as OpsStatus["liveRankBacklog"] & {
    error?: string;
  };
  if (!response.ok && response.status !== 409) {
    throw new Error(body.error || response.statusText);
  }
  return body;
};

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

export type TaskPriority = 0 | 1 | 2;
export type TaskDueKind = "deadline" | "target";

export type HomeUpcomingItem =
  | {
      kind: "interview";
      at: string;
      deadlineLabel: string;
      dueKind: TaskDueKind;
      priority: TaskPriority | null;
      estimateMinutes: number | null;
      threadId: string;
      stepId: string;
      company: string | null;
      primaryTitle: string | null;
      stepTitle: string | null;
    }
  | {
      kind: "task";
      at: string;
      deadlineLabel: string;
      dueKind: TaskDueKind;
      priority: TaskPriority | null;
      estimateMinutes: number | null;
      id: string;
      title: string;
      organization: string | null;
      categoryName: string;
    }
  | {
      kind: "subtask";
      at: string;
      deadlineLabel: string;
      dueKind: TaskDueKind;
      priority: TaskPriority | null;
      estimateMinutes: number | null;
      id: string;
      parentId: string;
      parentTitle: string;
      subtaskId: string;
      title: string;
      organization: string | null;
      categoryName: string;
    };

export type WeeklyPaceLabel = "on_track" | "ahead" | "behind";

export type WeeklyGoalMember = {
  taskId: string;
  title: string;
  organization: string | null;
  status: "open" | "completed";
  url: string | null;
};

export type WeeklyGoalView = {
  id: string;
  weekStart: string;
  slot: "lc" | "apps";
  kind: "count" | "task_set";
  title: string;
  targetCount: number | null;
  progressCount: number;
  done: number;
  total: number;
  pace: {
    label: WeeklyPaceLabel;
    amount: number;
    expected: number;
    fractionElapsed: number;
  };
  members: WeeklyGoalMember[];
};

export type WeeklyGoalsSnapshot = {
  tz: string;
  weekStart: string;
  weekEnd: string;
  goals: WeeklyGoalView[];
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
  upcomingThisWeek: {
    groups: Array<{
      key: string;
      label: string;
      items: HomeUpcomingItem[];
    }>;
    sections: Array<{
      key: "deadlines" | "targets";
      label: string;
      layout?: "flat" | "by_day";
      items: HomeUpcomingItem[];
      dayGroups?: Array<{
        key: string;
        label: string;
        items: HomeUpcomingItem[];
      }>;
    }>;
  };
  weeklyGoals: WeeklyGoalsSnapshot | null;
};

export const getHomeDashboard = (tz?: string) => {
  const query = tz ? `?tz=${encodeURIComponent(tz)}` : "";
  return parse<HomeDashboard>(api(`/api/home${query}`));
};

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

export const sendJobFeedback = (
  jobId: string,
  kind: "like" | "dismiss",
  note = "",
  teach = true,
) =>
  parse<{ id: string; kind: string; note: string | null; teach: boolean }>(
    api(`/api/jobs/${jobId}/feedback`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ kind, note: note || null, teach }),
    }),
  );

export type BoardSibling = {
  id: string;
  title: string;
  company: string;
  feedbackKind: string | null;
};

export const getBoardSiblings = (jobId: string) =>
  parse<{ employer: string; jobs: BoardSibling[] }>(
    api(`/api/jobs/${jobId}/board-siblings`),
  );

export const hideJobsFromBoard = (postingIds: string[]) =>
  parse<{ hidden: number }>(
    api(`/api/jobs/hide-from-board`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ postingIds }),
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
  awaitingStep: InterviewStep | null;
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

export type TaskKind = "application" | "misc";
/** @deprecated use TaskKind */
export type TaskCategory = TaskKind;
export type TaskView = "open" | "completed";

export type TaskCategoryRow = {
  id: string;
  name: string;
  kind: TaskKind;
  system: boolean;
  sortOrder: number;
  openCount: number;
};

export type TaskSubtaskRow = {
  id: string;
  taskId: string;
  title: string;
  status: "open" | "completed";
  dueAt: string | null;
  dueKind: TaskDueKind | null;
  estimateMinutes: number | null;
  priorityOverride: TaskPriority | null;
  priority: TaskPriority | null;
  sortOrder: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskRow = {
  id: string;
  category: TaskKind;
  categoryId: string;
  categoryName: string;
  status: "open" | "completed";
  title: string;
  organization: string | null;
  url: string | null;
  notes: string | null;
  dueAt: string | null;
  dueKind: TaskDueKind | null;
  priority: TaskPriority | null;
  estimateMinutes: number | null;
  postingId: string | null;
  applicationId: string | null;
  location: string | null;
  source: string | null;
  descriptionHtml: string | null;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
  subtasks: TaskSubtaskRow[];
  subtaskProgress: { completed: number; total: number } | null;
};

export type TasksPage = {
  view: TaskView;
  count: number;
  counts: { open: number; completed: number };
  categories: TaskCategoryRow[];
  tasks: TaskRow[];
};

export const getTasks = (view: TaskView = "open") =>
  parse<TasksPage>(api(`/api/tasks?view=${encodeURIComponent(view)}`));

export const getTaskCategories = () =>
  parse<{ categories: TaskCategoryRow[] }>(api("/api/task-categories"));

export const createTaskCategory = (name: string) =>
  parse<TaskCategoryRow>(
    api("/api/task-categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );

export const renameTaskCategory = (id: string, name: string) =>
  parse<TaskCategoryRow>(
    api(`/api/task-categories/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    }),
  );

export const deleteTaskCategory = (id: string) =>
  parse<{ ok: boolean }>(api(`/api/task-categories/${id}`, { method: "DELETE" }));

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

export const duplicateTask = (id: string) =>
  parse<TaskRow>(api(`/api/tasks/${id}/duplicate`, { method: "POST" }));

export const reopenTask = (id: string) =>
  parse<TaskRow>(api(`/api/tasks/${id}/reopen`, { method: "POST" }));

export const deleteTask = (id: string) =>
  parse<{ ok: boolean }>(api(`/api/tasks/${id}`, { method: "DELETE" }));

export const createSubtask = (taskId: string, body: Record<string, unknown>) =>
  parse<TaskSubtaskRow>(
    api(`/api/tasks/${taskId}/subtasks`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const patchSubtask = (
  taskId: string,
  subtaskId: string,
  body: Record<string, unknown>,
) =>
  parse<TaskSubtaskRow>(
    api(`/api/tasks/${taskId}/subtasks/${subtaskId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const completeSubtask = (taskId: string, subtaskId: string) =>
  parse<TaskSubtaskRow>(
    api(`/api/tasks/${taskId}/subtasks/${subtaskId}/complete`, { method: "POST" }),
  );

export const reopenSubtask = (taskId: string, subtaskId: string) =>
  parse<TaskSubtaskRow>(
    api(`/api/tasks/${taskId}/subtasks/${subtaskId}/reopen`, { method: "POST" }),
  );

export const moveSubtask = (taskId: string, subtaskId: string, direction: "up" | "down") =>
  parse<{ subtasks: TaskSubtaskRow[] }>(
    api(`/api/tasks/${taskId}/subtasks/${subtaskId}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ direction }),
    }),
  );

export const reorderSubtasks = (taskId: string, orderedIds: string[]) =>
  parse<{ subtasks: TaskSubtaskRow[] }>(
    api(`/api/tasks/${taskId}/subtasks/reorder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderedIds }),
    }),
  );

export const deleteSubtask = (taskId: string, subtaskId: string) =>
  parse<{ ok: boolean }>(
    api(`/api/tasks/${taskId}/subtasks/${subtaskId}`, { method: "DELETE" }),
  );

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

export type ActivityCredit = {
  raw: number;
  earned: number;
  cap: number;
};

export type ProgressLane = "application" | "technical";
export type ProgressPeriod = "day" | "week" | "month";

export type ProgressToday = {
  tz: string;
  localDate: string;
  applications: ActivityCredit;
  leetcode: ActivityCredit;
  effortApplication: boolean;
  effortTechnical: boolean;
  deepWork: boolean;
};

export type ProgressHeatmapDay = {
  date: string;
  raw: number;
  earned: number;
  effort: boolean;
};

export type ProgressOutcome = {
  period: ProgressPeriod;
  tz: string;
  anchorDate: string;
  startDate: string;
  endDate: string;
  applicationsLogged: number;
  leetcodeSolves: number;
  deepWorkUnits: number;
};

export type ProgressReflection = {
  id: string;
  lane: ProgressLane;
  body: string;
  applicationId: string | null;
  createdAt: string;
};

export type ProgressDayDetail = {
  tz: string;
  date: string;
  applications: ActivityCredit;
  leetcode: ActivityCredit;
  effortApplication: boolean;
  effortTechnical: boolean;
  deepWork: boolean;
  applicationRows: Array<{
    id: string;
    company: string | null;
    title: string | null;
    appliedAt: string;
  }>;
  reflections: ProgressReflection[];
};

const progressTz = (tz: string) =>
  new URLSearchParams({ tz }).toString();

export const getProgressToday = (tz: string) =>
  parse<ProgressToday>(api(`/api/progress/today?${progressTz(tz)}`));

export const getWeeklyGoals = (tz: string) =>
  parse<WeeklyGoalsSnapshot>(api(`/api/weekly-goals?${progressTz(tz)}`));

export const patchWeeklyLcGoal = (
  tz: string,
  body: { targetCount?: number; progressCount?: number },
) =>
  parse<WeeklyGoalsSnapshot>(
    api(`/api/weekly-goals/lc?${progressTz(tz)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const setWeeklyAppTargetMember = (tz: string, taskId: string, member: boolean) =>
  parse<WeeklyGoalsSnapshot>(
    api(`/api/weekly-goals/apps/members/${taskId}?${progressTz(tz)}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ member }),
    }),
  );

export const getProgressHeatmap = (
  tz: string,
  lane: ProgressLane,
  days = 365,
) => {
  const params = new URLSearchParams({ tz, lane, days: String(days) });
  return parse<{
    lane: ProgressLane;
    tz: string;
    startDate: string;
    endDate: string;
    days: ProgressHeatmapDay[];
  }>(api(`/api/progress/heatmap?${params}`));
};

export const getProgressOutcome = (
  tz: string,
  period: ProgressPeriod,
  anchorDate?: string,
) => {
  const params = new URLSearchParams({ tz, period });
  if (anchorDate) params.set("date", anchorDate);
  return parse<ProgressOutcome>(api(`/api/progress/outcome?${params}`));
};

export const getProgressDay = (tz: string, date: string) =>
  parse<ProgressDayDetail>(api(`/api/progress/day/${date}?${progressTz(tz)}`));

export const patchProgressLeetcode = (
  tz: string,
  body: { count?: number; delta?: number; date?: string },
) =>
  parse<{ localDate: string; count: number }>(
    api(`/api/progress/leetcode?${progressTz(tz)}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const createProgressReflection = (body: {
  lane: ProgressLane;
  body: string;
  applicationId?: string | null;
  localDate?: string | null;
  tz?: string | null;
}) =>
  parse<ProgressReflection>(
    api("/api/progress/reflections", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }),
  );

export const patchProgressReflection = (id: string, body: string) =>
  parse<ProgressReflection>(
    api(`/api/progress/reflections/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body }),
    }),
  );
