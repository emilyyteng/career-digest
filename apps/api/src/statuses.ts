export const APPLICATION_STATUSES = [
  "starred",
  "applied",
  "interviewing",
  "hired",
  "declined",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const JOBS_HIDDEN_STATUSES = [
  "applied",
  "interviewing",
  "hired",
  "declined",
] as const;

export function isApplicationStatus(value: string): value is ApplicationStatus {
  return (APPLICATION_STATUSES as readonly string[]).includes(value);
}
