/** Portfolio Demo mode: fictional seed only; gate expensive ranking side effects. */

export type DemoStatus = {
  enabled: boolean;
  /** Human-readable daily reset time, e.g. "08:00 UTC". */
  resetsDailyAt: string;
};

export function isDemoMode(env: NodeJS.ProcessEnv = process.env): boolean {
  const raw = env.DEMO_MODE?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function demoResetHourUtc(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.DEMO_RESET_HOUR_UTC);
  if (Number.isFinite(n) && n >= 0 && n <= 23) return Math.floor(n);
  return 8;
}

export function demoResetMinuteUtc(env: NodeJS.ProcessEnv = process.env): number {
  const n = Number(env.DEMO_RESET_MINUTE_UTC);
  if (Number.isFinite(n) && n >= 0 && n <= 59) return Math.floor(n);
  return 0;
}

export function getDemoStatus(env: NodeJS.ProcessEnv = process.env): DemoStatus {
  const hour = demoResetHourUtc(env);
  const minute = demoResetMinuteUtc(env);
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return {
    enabled: isDemoMode(env),
    resetsDailyAt: `${hh}:${mm} UTC`,
  };
}

export const DEMO_GATED_MESSAGE =
  "This action is unavailable in Demo mode (live ranking and board refresh are gated).";

export function assertDemoAllowsMutation(): void {
  if (isDemoMode()) {
    throw new DemoGatedError(DEMO_GATED_MESSAGE);
  }
}

export class DemoGatedError extends Error {
  readonly status = 403;
  constructor(message: string) {
    super(message);
    this.name = "DemoGatedError";
  }
}
