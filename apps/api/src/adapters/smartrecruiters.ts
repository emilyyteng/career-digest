import type { NormalizedPosting } from "../types.js";
import { looksLikeInternship } from "../filter.js";

const LIST_BASE = "https://api.smartrecruiters.com/v1/companies";
const PAGE_SIZE = 100;
const DEFAULT_MAX_FULL_BOARD_JOBS = 250;
const REQUEST_TIMEOUT_MS = 30_000;

type SmartRecruitersLocation = {
  city?: string;
  region?: string;
  country?: string;
  fullLocation?: string;
};

type SmartRecruitersListItem = {
  id?: string;
  name?: string;
  refNumber?: string;
  releasedDate?: string;
  location?: SmartRecruitersLocation;
  postingUrl?: string;
};

type SmartRecruitersListResponse = {
  content?: SmartRecruitersListItem[];
  totalFound?: number;
};

type SmartRecruitersSection = string | { title?: string; text?: string };

type SmartRecruitersDetail = SmartRecruitersListItem & {
  jobAd?: {
    sections?: Record<string, SmartRecruitersSection>;
  };
};

function smartrecruitersMaxFullBoardJobs(): number {
  const n = Number(process.env.SMARTRECRUITERS_MAX_FULL_JOBS);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_MAX_FULL_BOARD_JOBS;
}

function parseTimestamp(value: string | undefined): Date | null {
  if (!value?.trim()) return null;
  const date = new Date(value.trim());
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatLocation(location: SmartRecruitersLocation | undefined): string | null {
  if (!location) return null;
  const full = location.fullLocation?.trim();
  if (full) return full;
  const parts = [location.city, location.region, location.country]
    .map((part) => part?.trim())
    .filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

function buildPostingUrl(boardToken: string, externalId: string): string {
  return `https://jobs.smartrecruiters.com/${encodeURIComponent(boardToken)}/${encodeURIComponent(externalId)}`;
}

function sectionText(section: SmartRecruitersSection | undefined): string | null {
  if (section == null) return null;
  if (typeof section === "string") {
    const trimmed = section.trim();
    return trimmed || null;
  }
  const text = section.text?.trim();
  return text || null;
}

function mergeDescriptionSections(
  sections: Record<string, SmartRecruitersSection> | undefined,
): string | null {
  if (!sections) return null;
  const chunks = Object.values(sections)
    .map((part) => sectionText(part))
    .filter((part): part is string => Boolean(part));
  if (chunks.length === 0) return null;
  return chunks.join("\n\n");
}

function toNormalized(boardToken: string, job: SmartRecruitersListItem): NormalizedPosting | null {
  if (!job.id || !job.name) return null;
  const published = parseTimestamp(job.releasedDate);
  return {
    source: "smartrecruiters",
    externalId: String(job.id),
    title: job.name,
    location: formatLocation(job.location),
    department: null,
    url: job.postingUrl?.trim() || buildPostingUrl(boardToken, job.id),
    descriptionHtml: null,
    isInternship: looksLikeInternship(job.name),
    firstPublishedAt: published,
    sourceUpdatedAt: published,
    raw: job,
  };
}

async function smartrecruitersFetch(url: string): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, {
      signal: controller.signal,
      headers: { Accept: "application/json" },
    });
  } finally {
    clearTimeout(timer);
  }
}

function listUrl(boardToken: string, offset: number, searchQuery: string | null): string {
  const params = new URLSearchParams({
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  if (searchQuery) params.set("q", searchQuery);
  return `${LIST_BASE}/${encodeURIComponent(boardToken)}/postings?${params.toString()}`;
}

/** Company board token from a SmartRecruiters apply URL. */
export function parseSmartrecruitersBoardFromUrl(url: string): string | null {
  const match = url.match(/smartrecruiters\.com\/([^/?#]+)/i);
  if (!match?.[1]) return null;
  const token = decodeURIComponent(match[1]).trim();
  if (!token || INVALID_BOARD_TOKENS.has(token.toLowerCase())) return null;
  return token;
}

export function isSmartrecruitersAtsUrl(url: string): boolean {
  return /smartrecruiters\.com/i.test(url);
}

const INVALID_BOARD_TOKENS = new Set(["embed", "jobs", "job-board", "job_app"]);

/** Probe open job count (one list request). Used by discover-boards sizing. */
export async function probeSmartrecruitersBoardJobCount(boardToken: string): Promise<number | null> {
  try {
    const response = await smartrecruitersFetch(listUrl(boardToken, 0, null));
    if (!response.ok) return null;
    const body = (await response.json()) as SmartRecruitersListResponse;
    const total = body.totalFound;
    return typeof total === "number" && Number.isFinite(total) ? total : null;
  } catch {
    return null;
  }
}

async function fetchPostingPage(
  boardToken: string,
  offset: number,
  searchQuery: string | null,
): Promise<SmartRecruitersListResponse> {
  const response = await smartrecruitersFetch(listUrl(boardToken, offset, searchQuery));
  if (!response.ok) {
    throw new Error(
      `SmartRecruiters ${boardToken} failed: ${response.status} ${response.statusText}`,
    );
  }
  return (await response.json()) as SmartRecruitersListResponse;
}

/**
 * List open postings for a company board.
 * Boards over SMARTRECRUITERS_MAX_FULL_JOBS (default 250) use q=intern to limit scan size.
 */
export async function fetchSmartrecruitersJobs(boardToken: string): Promise<NormalizedPosting[]> {
  const probe = await fetchPostingPage(boardToken, 0, null);
  const total = probe.totalFound ?? probe.content?.length ?? 0;
  const searchQuery = total > smartrecruitersMaxFullBoardJobs() ? "intern" : null;

  const postings: NormalizedPosting[] = [];
  let offset = 0;
  let totalFound = total;

  while (offset < totalFound) {
    const body =
      offset === 0 && !searchQuery ? probe : await fetchPostingPage(boardToken, offset, searchQuery);
    const items = body.content ?? [];
    totalFound = body.totalFound ?? totalFound;
    for (const item of items) {
      const row = toNormalized(boardToken, item);
      if (row) postings.push(row);
    }
    if (items.length === 0) break;
    offset += items.length;
    if (offset >= totalFound) break;
  }

  return postings;
}

export async function fetchSmartrecruitersJobContent(
  boardToken: string,
  externalId: string,
): Promise<string | null> {
  const url = `${LIST_BASE}/${encodeURIComponent(boardToken)}/postings/${encodeURIComponent(externalId)}`;
  const response = await smartrecruitersFetch(url);
  if (!response.ok) {
    throw new Error(
      `SmartRecruiters ${boardToken} job ${externalId} failed: ${response.status} ${response.statusText}`,
    );
  }
  const job = (await response.json()) as SmartRecruitersDetail;
  return mergeDescriptionSections(job.jobAd?.sections);
}
