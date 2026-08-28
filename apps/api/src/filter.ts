import { isAllowedUsLocation } from "./location.js";

/** Cheap title-only intern filter. Avoids matching "internal" / "international". */
export function looksLikeInternship(title: string): boolean {
  return /\bintern(?:ship)?s?\b|\bco-?ops?\b/i.test(title);
}

export const TARGET_YEAR = 2027;

type Season = "spring" | "summer" | "fall" | "winter";

export function yearsInTitle(title: string): number[] {
  return [...title.matchAll(/\b(20\d{2})\b/g)].map((m) => Number(m[1]));
}

function seasonsInTitle(title: string): Season[] {
  const found: Season[] = [];
  const re = /\b(spring|summer|fall|autumn|winter)\b/gi;
  for (const match of title.matchAll(re)) {
    const raw = match[1].toLowerCase();
    found.push(raw === "autumn" ? "fall" : (raw as Season));
  }
  return found;
}

type InternTerm = "target" | "optional" | "expired" | "unspecified";

function internTermFromTitle(title: string): InternTerm {
  const years = yearsInTitle(title);
  const seasons = seasonsInTitle(title);

  if (years.some((year) => year >= TARGET_YEAR)) {
    return "target";
  }

  if (years.length === 0) {
    return "unspecified";
  }

  const staleSeason = seasons.some(
    (season) => season === "summer" || season === "spring",
  );
  const optionalSeason = seasons.some(
    (season) => season === "fall" || season === "winter",
  );
  if (staleSeason && !optionalSeason) return "expired";
  return "optional";
}

/** Summer/Spring prior-year terms we do not want in the live digest. */
export function isExpiredInternTerm(title: string): boolean {
  return internTermFromTitle(title) === "expired";
}

/**
 * Whether to insert an intern posting from ingest.
 * ATS boards only return open roles; Simplify misc uses active: true — presence
 * on those feeds is the freshness signal, not first_published age.
 */
export function shouldInsertPosting(
  title: string,
  location: string | null,
): boolean {
  if (!looksLikeInternship(title)) return false;
  if (isExpiredInternTerm(title)) return false;
  return isAllowedUsLocation(location);
}

export function shouldKeepExistingOnBoard(
  title: string,
  location?: string | null,
): boolean {
  return (
    looksLikeInternship(title) &&
    !isExpiredInternTerm(title) &&
    isAllowedUsLocation(location)
  );
}
