import type { NormalizedPosting } from "../types.js";

const SIMPLIFY_LISTINGS_URL =
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

export function isMiscellaneousApplyUrl(url: string): boolean {
  return Boolean(url) && atsFamily(url) === null;
}

export async function fetchSimplifyMiscellaneousJobs(): Promise<{
  postings: NormalizedPosting[];
  seenIds: string[];
}> {
  const response = await fetch(SIMPLIFY_LISTINGS_URL, {
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`Simplify listings failed: ${response.status} ${response.statusText}`);
  }

  const listings = (await response.json()) as SimplifyListing[];
  const postings: NormalizedPosting[] = [];
  const seenIds: string[] = [];

  for (const listing of listings) {
    if (!listing.id || !listing.title || !listing.url) continue;
    if (!listing.active) continue;
    if (!isMiscellaneousApplyUrl(listing.url)) continue;

    seenIds.push(listing.id);
    const location = (listing.locations ?? []).filter(Boolean).join(" | ") || null;
    const published = parseUnix(listing.date_posted);

    postings.push({
      source: "simplify",
      externalId: listing.id,
      title: listing.title,
      location,
      department: listing.company_name ?? null,
      url: listing.url,
      descriptionHtml: null,
      isInternship: true,
      firstPublishedAt: published,
      sourceUpdatedAt: parseUnix(listing.date_updated) ?? published,
      raw: listing,
    });
  }

  return { postings, seenIds };
}
