import type { NormalizedPosting } from "../types.js";
import { looksLikeInternship } from "../filter.js";

type LeverJob = {
  id?: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  description?: string;
  descriptionPlain?: string;
  categories?: {
    location?: string;
    team?: string;
    department?: string;
    commitment?: string;
  };
  workplaceType?: string;
};

function parseCreatedAt(value: number | undefined): Date | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toNormalized(job: LeverJob): NormalizedPosting | null {
  if (!job.id || !job.text) return null;
  const published = parseCreatedAt(job.createdAt);
  const department =
    job.categories?.team || job.categories?.department || null;
  const html = job.description ?? job.descriptionPlain ?? null;

  return {
    source: "lever",
    externalId: String(job.id),
    title: job.text,
    location: job.categories?.location ?? null,
    department,
    url: job.hostedUrl || job.applyUrl || `https://jobs.lever.co/${job.id}`,
    descriptionHtml: html,
    isInternship: looksLikeInternship(job.text),
    firstPublishedAt: published,
    sourceUpdatedAt: published,
    raw: job,
  };
}

export async function fetchLeverJobs(boardToken: string): Promise<NormalizedPosting[]> {
  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(boardToken)}?mode=json`;
  const response = await fetch(url, { headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Lever ${boardToken} failed: ${response.status} ${response.statusText}`);
  }
  const body = (await response.json()) as LeverJob[];
  if (!Array.isArray(body)) return [];
  return body.map(toNormalized).filter((row): row is NormalizedPosting => row !== null);
}
