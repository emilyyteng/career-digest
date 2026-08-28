export const APPLICATION_STATUSES = [
  "todo",
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
  if (value === "starred") return true; // legacy URLs / payloads
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}

/** Normalize legacy starred status to todo. */
export function normalizeApplicationStatus(value: string): ApplicationStatus {
  if (value === "starred") return "todo";
  if (isApplicationStatus(value)) return value;
  return "applied";
}
