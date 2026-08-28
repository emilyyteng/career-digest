import type { NormalizedPosting } from "../types.js";

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

function atsFamily(url: string): "greenhouse" | "lever" | "ashby" | null {
  const lower = url.toLowerCase();
  if (lower.includes("greenhouse.io")) return "greenhouse";
  if (lower.includes("lever.co")) return "lever";
  if (lower.includes("ashbyhq.com")) return "ashby";
  return null;
}

function parseUnix(value: number | undefined): Date | null {
  if (typeof value !== "number" || Number.isNaN(value)) return null;
  const ms = value < 1e12 ? value * 1000 : value;
  const date = new Date(ms);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** True when the apply URL is not a known ATS host (Workday, custom careers pages, etc.). */
export function isMiscellaneousApplyUrl(url: string): boolean {
  return Boolean(url) && atsFamily(url) === null;
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
 * Ingest path: non-ATS apply URLs only (Workday, custom careers, Greenhouse gh_jid on custom domains).
 * Direct greenhouse.io / lever.co / ashbyhq.com links are skipped here; those jobs come from ATS board ingest.
 * Merge collapses gh_jid embed duplicates after ATS ingest.
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
    if (!isMiscellaneousApplyUrl(listing.url)) continue;

    seenIds.push(listing.id);
    postings.push(listingToPosting(listing));
  }

  return { postings, seenIds };
}
