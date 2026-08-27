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
  rankScore: number | null;
  rankEligible: boolean | null;
  rankReason: string | null;
  rankLocationFit: string | null;
  feedbackKind: "like" | "dismiss" | null;
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

export type JobsPage = {
  count: number;
  page: number;
  pageSize: number;
  jobs: JobCard[];
};

export const getJobs = (
  q = "",
  page = 1,
  pageSize = 25,
  opts?: { mismatches?: boolean; unranked?: boolean; sort?: "rank" | "published" | "updated" },
) => {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  params.set("page", String(page));
  params.set("pageSize", String(pageSize));
  if (opts?.mismatches) params.set("mismatches", "1");
  if (opts?.unranked === false) params.set("unranked", "0");
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
