import type { NormalizedPosting } from "../types.js";
import { classifyInternship, looksLikeInternship } from "../filter.js";

type AshbyJob = {
  id?: string;
  title?: string;
  department?: string;
  team?: string;
  location?: string;
  publishedAt?: string;
  updatedAt?: string;
  jobUrl?: string;
  applyUrl?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
};

type AshbyBoardResponse = {
  jobs?: AshbyJob[];
};

function parseTimestamp(value: string | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNormalized(job: AshbyJob): NormalizedPosting | null {
  if (!job.id || !job.title) return null;
  const published = parseTimestamp(job.publishedAt);
  const html = job.descriptionHtml ?? job.descriptionPlain ?? null;

  return {
    source: "ashby",
    externalId: String(job.id),
    title: job.title,
    location: job.location ?? null,
    department: job.department || job.team || null,
    url: job.jobUrl || job.applyUrl || `https://jobs.ashbyhq.com/${job.id}`,
    descriptionHtml: html,
    isInternship: looksLikeInternship(job.title),
    cycleStatus: classifyInternship(job.title, published),
    firstPublishedAt: published,
    sourceUpdatedAt: parseTimestamp(job.updatedAt) ?? published,
    raw: job,
  };
}

export async function fetchAshbyJobs(boardToken: string): Promise<NormalizedPosting[]> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(boardToken)}`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Ashby ${boardToken} failed: ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as AshbyBoardResponse;
  return (body.jobs ?? [])
    .map(toNormalized)
    .filter((row): row is NormalizedPosting => row !== null);
}
