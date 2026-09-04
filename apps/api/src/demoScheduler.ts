import type { Pool } from "pg";
import {
  demoResetHourUtc,
  demoResetMinuteUtc,
  isDemoMode,
} from "./demoMode.js";
import { resetDemoDatabase } from "./demoSeed.js";

/** UTC calendar date (YYYY-MM-DD) of the last successful demo reset in this process. */
let lastResetYmd: string | null = null;

export function utcYmd(at: Date = new Date()): string {
  return at.toISOString().slice(0, 10);
}

export function markDemoResetDone(at: Date = new Date()): void {
  lastResetYmd = utcYmd(at);
}

/** Exposed for tests — clears in-memory last-reset marker. */
export function resetDemoSchedulerStateForTests(): void {
  lastResetYmd = null;
}

export function shouldRunDailyDemoReset(
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  if (!isDemoMode(env)) return false;
  const ymd = utcYmd(now);
  if (lastResetYmd === ymd) return false;
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const target = demoResetHourUtc(env) * 60 + demoResetMinuteUtc(env);
  return minutesNow >= target;
}

export async function runDemoResetIfDue(
  db: Pool,
  now: Date = new Date(),
  env: NodeJS.ProcessEnv = process.env,
): Promise<boolean> {
  if (!shouldRunDailyDemoReset(now, env)) return false;
  await resetDemoDatabase(db);
  markDemoResetDone(now);
  console.log(`demo: daily reset completed (${utcYmd(now)} UTC)`);
  return true;
}

/**
 * Boot: wipe + seed when DEMO_MODE is on. Then poll once a minute for the daily UTC window.
 */
export async function startDemoModeLifecycle(db: Pool): Promise<void> {
  if (!isDemoMode()) return;

  console.log("demo: DEMO_MODE enabled — seeding fictional portfolio data");
  await resetDemoDatabase(db);
  // Only consume today's daily slot if we already passed the reset clock.
  // Booting before HH:MM UTC must still allow the scheduled daily wipe later.
  const now = new Date();
  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  const target = demoResetHourUtc() * 60 + demoResetMinuteUtc();
  if (minutesNow >= target) {
    markDemoResetDone(now);
  }
  console.log("demo: seed complete");

  const timer = setInterval(() => {
    void runDemoResetIfDue(db).catch((err) => {
      console.error("demo: daily reset failed", err);
    });
  }, 60_000);
  timer.unref?.();
}
