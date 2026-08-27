import type { NormalizedPosting } from "../types.js";
import { classifyInternship, looksLikeInternship } from "../filter.js";

type GreenhouseJob = {
  id: number;
  title: string;
  absolute_url: string;
  content?: string;
  first_published?: string;
  updated_at?: string;
  location?: { name?: string };
  departments?: { name?: string }[];
};

type GreenhouseListResponse = {
  jobs?: GreenhouseJob[];
};

function parseTimestamp(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNormalized(job: GreenhouseJob): NormalizedPosting {
  const department =
    job.departments
      ?.map((d) => d.name)
      .filter((name): name is string => Boolean(name))
      .join(", ") || null;

  return {
    source: "greenhouse",
    externalId: String(job.id),
    title: job.title,
    location: job.location?.name ?? null,
    department,
    url: job.absolute_url,
    descriptionHtml: job.content ?? null,
    isInternship: looksLikeInternship(job.title),
    cycleStatus: classifyInternship(
      job.title,
      parseTimestamp(job.first_published),
    ),
    firstPublishedAt: parseTimestamp(job.first_published),
    sourceUpdatedAt: parseTimestamp(job.updated_at),
    raw: job,
  };
}

async function greenhouseJson(url: string, label: string): Promise<unknown> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`${label} failed: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

/** List endpoint without HTML bodies — enough for title + first_published. */
export async function fetchGreenhouseJobs(
  boardToken: string,
): Promise<NormalizedPosting[]> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs`;
  const body = (await greenhouseJson(
    url,
    `Greenhouse ${boardToken}`,
  )) as GreenhouseListResponse;
  return (body.jobs ?? []).map(toNormalized);
}

export async function fetchGreenhouseJobContent(
  boardToken: string,
  externalId: string,
): Promise<string | null> {
  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs/${encodeURIComponent(externalId)}`;
  const job = (await greenhouseJson(
    url,
    `Greenhouse ${boardToken} job ${externalId}`,
  )) as GreenhouseJob;
  return job.content ?? null;
}
