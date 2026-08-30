import type { NormalizedPosting } from "../types.js";
import type { Source } from "../types.js";
import { companies } from "../config/companies.js";
import { parseOracleBoardFromUrl } from "./oracle.js";
import { parseSmartrecruitersBoardFromUrl } from "./smartrecruiters.js";
import { extractGreenhouseBoardToken } from "../greenhouseUrls.js";

export const SIMPLIFY_LISTINGS_URL =
  "https://raw.githubusercontent.com/SimplifyJobs/Summer2027-Internships/dev/.github/scripts/listings.json";

type SimplifyListing = {
  id?: string;
  company_name?: string;
  title?: string;
  url?: string;
  locations?: string[];
  date_posted?: number;
  date_updated?: number;
  terms?: string[];
  active?: boolean;
};

function atsFamily(
  url: string,
): "greenhouse" | "lever" | "ashby" | "oracle" | "smartrecruiters" | null {
  const lower = url.toLowerCase();
  if (lower.includes("greenhouse.io")) return "greenhouse";
  if (lower.includes("lever.co")) return "lever";
  if (lower.includes("ashbyhq.com")) return "ashby";
  if (lower.includes("oraclecloud.com")) return "oracle";
  if (lower.includes("smartrecruiters.com")) return "smartrecruiters";
  return null;
}

const CONFIGURED_BOARD_KEYS = new Set(
  companies.map((company) => `${company.source}:${company.boardToken.toLowerCase()}`),
);

function decodeToken(token: string): string {
  try {
    return decodeURIComponent(token);
  } catch {
    return token;
  }
}

/** Map a direct ATS apply URL to a companies.ts board key when parseable. */
export function boardConfigKeyFromAtsUrl(url: string): string | null {
  const family = atsFamily(url);
  if (!family) return null;

  if (family === "oracle") {
    const board = parseOracleBoardFromUrl(url);
    return board ? `oracle:${board.boardToken.toLowerCase()}` : null;
  }

  if (family === "smartrecruiters") {
    const boardToken = parseSmartrecruitersBoardFromUrl(url);
    return boardToken ? `smartrecruiters:${boardToken.toLowerCase()}` : null;
  }

  const patterns: Array<{ source: Source; re: RegExp }> = [
    { source: "lever", re: /jobs\.lever\.co\/([^/?#]+)/i },
    { source: "ashby", re: /jobs\.ashbyhq\.com\/([^/?#]+)/i },
  ];

  for (const { source, re } of patterns) {
    const match = url.match(re);
    if (!match?.[1]) continue;
    const boardToken = decodeToken(match[1]).trim();
    if (!boardToken) continue;
    return `${source}:${boardToken.toLowerCase()}`;
  }

  const greenhouseToken = extractGreenhouseBoardToken(url);
  if (greenhouseToken) return `greenhouse:${greenhouseToken.toLowerCase()}`;

  return null;
}

export function isConfiguredAtsBoardUrl(url: string): boolean {
  const key = boardConfigKeyFromAtsUrl(url);
  return key != null && CONFIGURED_BOARD_KEYS.has(key);
}

function parseUnix(value: number | undefined): Date | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const ms = value < 1e12 ? value * 1000 : value;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when the apply URL is not a known ATS host (Workday, custom careers, Greenhouse gh_jid on custom domains). */
export function isMiscellaneousApplyUrl(url: string): boolean {
  return Boolean(url) && atsFamily(url) === null;
}

/**
 * Whether a Simplify posting's apply URL should be scraped for a missing JD.
 * Greenhouse/Lever/Ashby ATS links rely on board JSON ingest + merge; Oracle and
 * SmartRecruiters hybrid rows stay on Simplify until merge (often indefinitely when
 * boards are deferred), so scrape those apply pages.
 */
export function shouldScrapeSimplifyApplyUrl(url: string): boolean {
  if (!url) return false;
  if (isMiscellaneousApplyUrl(url)) return true;
  const family = atsFamily(url);
  return family === "oracle" || family === "smartrecruiters";
}

function listingToPosting(listing: SimplifyListing): NormalizedPosting {
  const location = (listing.locations ?? []).filter(Boolean).join(" | ") || null;
  const published = parseUnix(listing.date_posted);
  return {
    source: "simplify",
    externalId: listing.id!,
    title: listing.title!,
    location,
    department: listing.company_name ?? null,
    url: listing.url!,
    descriptionHtml: null,
    isInternship: true,
    firstPublishedAt: published,
    sourceUpdatedAt: parseUnix(listing.date_updated) ?? published,
    raw: listing,
  };
}

async function fetchActiveSimplifyListings(): Promise<SimplifyListing[]> {
  const response = await fetch(SIMPLIFY_LISTINGS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Simplify listings failed: ${response.status} ${response.statusText}`);
  }
  return (await response.json()) as SimplifyListing[];
}

/** All active Simplify listings (no URL filter). Used by discover-boards and analysis — not ingest. */
export async function fetchSimplifyListings(): Promise<{
  postings: NormalizedPosting[];
  seenIds: string[];
}> {
  const listings = await fetchActiveSimplifyListings();
  const postings: NormalizedPosting[] = [];
  const seenIds: string[] = [];

  for (const listing of listings) {
    if (!listing.id || !listing.title || !listing.url) continue;
    if (!listing.active) continue;

    seenIds.push(listing.id);
    postings.push(listingToPosting(listing));
  }

  return { postings, seenIds };
}

/**
 * Ingest path: Workday/custom careers + any active Simplify listing not covered by board ingest.
 * Direct ATS URLs are ingested from Simplify when the board is not in companies.ts; configured
 * boards rely on adapter ingest and only contribute listing ids to seenIds until merge dedupes.
 */
export async function fetchSimplifyMiscellaneousJobs(): Promise<{
  postings: NormalizedPosting[];
  seenIds: string[];
}> {
  const listings = await fetchActiveSimplifyListings();
  const postings: NormalizedPosting[] = [];
  const seenIds: string[] = [];

  for (const listing of listings) {
    if (!listing.id || !listing.title || !listing.url) continue;
    if (!listing.active) continue;

    const coveredByBoardIngest =
      !isMiscellaneousApplyUrl(listing.url) && isConfiguredAtsBoardUrl(listing.url);

    seenIds.push(listing.id);
    if (coveredByBoardIngest) continue;

    postings.push(listingToPosting(listing));
  }

  return { postings, seenIds };
}
