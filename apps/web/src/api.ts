export type JobCard = {
  id: string;
  source: string;
  company: string;
  title: string;
  location: string | null;
  department: string | null;
  url: string;
  cycleStatus: string | null;
  firstSeenAt: string;
  applicationId: string | null;
  applicationStatus: string | null;
};

export type JobDetail = JobCard & {
  descriptionHtml: string | null;
  applicationNotes: string | null;
};

export type ApplicationRow = {
  id: string;
  postingId: string | null;
  status: string;
  notes: string | null;
  company: string | null;
  title: string | null;
  location: string | null;
  url: string | null;
  source: string | null;
  cycleStatus: string | null;
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

export const getJobs = (q = "") =>
  parse<{ count: number; jobs: JobCard[] }>(
    api(`/api/jobs${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  );

export const getJob = (id: string) =>
  parse<JobDetail>(api(`/api/jobs/${id}`));

export const getApplications = (status = "all") =>
  parse<{ count: number; applications: ApplicationRow[] }>(
    api(`/api/applications?status=${encodeURIComponent(status)}`),
  );

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
