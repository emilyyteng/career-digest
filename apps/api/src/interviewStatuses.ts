export const THREAD_STATUSES = ["active", "resolved"] as const;
export type ThreadStatus = (typeof THREAD_STATUSES)[number];

export const THREAD_RESOLUTIONS = ["accepted", "declined", "withdrew"] as const;
export type ThreadResolution = (typeof THREAD_RESOLUTIONS)[number];

export const STEP_KINDS = [
  "assessment",
  "phone",
  "technical",
  "onsite",
  "offer",
  "custom",
] as const;
export type StepKind = (typeof STEP_KINDS)[number];

/**
 * Step lifecycle:
 * - pending: you need to act (deadline, link, or open task) — not a booked meeting
 * - scheduled: booked appointment (use scheduled_at)
 * - awaiting_employer: you finished your part; waiting on them
 * - completed: round closed (done or superseded)
 * - skipped: round cancelled / won't happen
 */
export const STEP_STATUSES = [
  "pending",
  "scheduled",
  "awaiting_employer",
  "completed",
  "skipped",
] as const;
export type StepStatus = (typeof STEP_STATUSES)[number];

export const ACTIONABLE_STEP_STATUSES: StepStatus[] = ["pending", "scheduled"];

/** Step still in the pipeline (not closed). Only one may be open at a time. */
export const OPEN_STEP_STATUSES: StepStatus[] = [
  "pending",
  "scheduled",
  "awaiting_employer",
];

export function isOpenStepStatus(value: string): boolean {
  return (OPEN_STEP_STATUSES as readonly string[]).includes(value);
}

export function isThreadStatus(value: string): value is ThreadStatus {
  return (THREAD_STATUSES as readonly string[]).includes(value);
}

export function isThreadResolution(value: string): value is ThreadResolution {
  return (THREAD_RESOLUTIONS as readonly string[]).includes(value);
}

export function isStepKind(value: string): value is StepKind {
  return (STEP_KINDS as readonly string[]).includes(value);
}

export function isStepStatus(value: string): value is StepStatus {
  return (STEP_STATUSES as readonly string[]).includes(value);
}

export function applicationResolutionFromStatus(
  status: string,
): ThreadResolution | null {
  if (status === "accepted") return "accepted";
  if (status === "declined") return "declined";
  return null;
}
