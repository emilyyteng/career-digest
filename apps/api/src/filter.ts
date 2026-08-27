import type { CycleStatus } from "./types.js";

/** Cheap title-only intern filter. Avoids matching "internal" / "international". */
export function looksLikeInternship(title: string): boolean {
  return /\bintern(?:ship)?s?\b|\bco-?ops?\b/i.test(title);
}

export const TARGET_YEAR = 2027;

/**
 * Rolling window from the moment ingest runs, not a fixed calendar date.
 * Only used to decide whether to INSERT an intern title with no class year.
 * Existing rows that are still on the board are updated, not deleted, even
 * after 120 days. Taken-down jobs are handled in ingest (keep if applied).
 *
 * Later: this constant (and intern vs new-grad rules) should be config so a
 * 2028 full-time search does not keep using summer-intern heuristics.
 */
export const MAX_AGE_DAYS_WITHOUT_YEAR = 120;

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

function isRecentEnough(firstPublishedAt: Date | null, now: Date): boolean {
  if (!firstPublishedAt) return false;
  const ageMs = now.getTime() - firstPublishedAt.getTime();
  return ageMs >= 0 && ageMs <= MAX_AGE_DAYS_WITHOUT_YEAR * 24 * 60 * 60 * 1000;
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

/** Summer/Spring 2026-style terms we do not want in the live digest. */
export function isExpiredInternTerm(title: string): boolean {
  return internTermFromTitle(title) === "expired";
}

/**
 * Summer 2027 (and other ≥2027 terms) → target.
 * Fall/Winter 2026 → optional (still visible).
 * Summer/Spring 2026 → stale (not inserted; deleted if never applied).
 * No year in title → optional if first_published is within 120 days (new rows)
 * or if the row is already stored and still on the board.
 */
export function classifyInternship(
  title: string,
  firstPublishedAt: Date | null,
  now = new Date(),
  alreadyStored = false,
): CycleStatus | null {
  if (!looksLikeInternship(title)) return null;

  const term = internTermFromTitle(title);
  if (term === "target") return "target";
  if (term === "optional") return "optional";
  if (term === "expired") return "stale";

  if (alreadyStored) return "optional";
  return isRecentEnough(firstPublishedAt, now) ? "optional" : "stale";
}

/** New rows only. Existing open listings use shouldKeepExistingOnBoard. */
export function shouldPersistInternship(
  title: string,
  firstPublishedAt: Date | null,
  now = new Date(),
): boolean {
  const status = classifyInternship(title, firstPublishedAt, now, false);
  return status === "target" || status === "optional";
}

export function shouldKeepExistingOnBoard(title: string): boolean {
  return looksLikeInternship(title) && !isExpiredInternTerm(title);
}
