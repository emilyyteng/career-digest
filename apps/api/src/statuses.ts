/** Tracker-visible application statuses (Applications UI and list API). */
export const APPLICATION_STATUSES = [
  "applied",
  "interviewing",
  "accepted",
  "declined",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const JOBS_HIDDEN_STATUSES = [
  "applied",
  "interviewing",
  "accepted",
  "declined",
] as const;

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

export function isLegacyApplicationBacklogStatus(value: string): boolean {
  return value === "todo" || value === "starred";
}

export function normalizeApplicationStatus(value: string): ApplicationStatus {
  if (isApplicationStatus(value)) return value;
  return "applied";
}
