import { access, readFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

export const DAILY_BOARD_CRON_LABEL = "com.career-digest.daily-board";
export const DEFAULT_DAILY_BOARD_HOUR = 17;
export const DEFAULT_DAILY_BOARD_MINUTE = 0;

export type DailyBoardSchedule = {
  installed: boolean;
  hour: number;
  minute: number;
};

/** Next wall-clock occurrence of hour:minute in the local timezone. */
export function nextDailyLocalTime(
  hour: number,
  minute: number,
  now = new Date(),
): Date {
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next.getTime() <= now.getTime()) {
    next.setDate(next.getDate() + 1);
  }
  return next;
}

/** Today's scheduled board-refresh instant (local), even if already past. */
export function todaysDailyLocalTime(
  hour: number,
  minute: number,
  now = new Date(),
): Date {
  const today = new Date(now);
  today.setHours(hour, minute, 0, 0);
  return today;
}

export function localCivilDate(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export async function readDailyBoardSchedule(): Promise<DailyBoardSchedule> {
  const plistPath = path.join(
    os.homedir(),
    "Library/LaunchAgents",
    `${DAILY_BOARD_CRON_LABEL}.plist`,
  );
  try {
    await access(plistPath);
    const raw = await readFile(plistPath, "utf8");
    const hourMatch = raw.match(/<key>Hour<\/key>\s*<integer>(\d+)<\/integer>/);
    const minuteMatch = raw.match(/<key>Minute<\/key>\s*<integer>(\d+)<\/integer>/);
    const hour = hourMatch ? Number(hourMatch[1]) : DEFAULT_DAILY_BOARD_HOUR;
    const minute = minuteMatch ? Number(minuteMatch[1]) : DEFAULT_DAILY_BOARD_MINUTE;
    return { installed: true, hour, minute };
  } catch {
    return {
      installed: false,
      hour: DEFAULT_DAILY_BOARD_HOUR,
      minute: DEFAULT_DAILY_BOARD_MINUTE,
    };
  }
}

export function formatLocalTime(hour: number, minute: number): string {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

/**
 * After an interrupted refresh: catch up once if today's scheduled time has
 * passed and there has been no successful run since that time.
 */
export function shouldCatchUpInterruptedBoardRefresh(input: {
  status: string;
  error: string | null;
  lastOkAt: string | null;
  catchUpOn: string | null;
  interruptedMessage: string;
  hour: number;
  minute: number;
  now?: Date;
}): boolean {
  const now = input.now ?? new Date();
  if (input.status !== "error" || input.error !== input.interruptedMessage) {
    return false;
  }
  if (input.catchUpOn === localCivilDate(now)) {
    return false;
  }
  const scheduledToday = todaysDailyLocalTime(input.hour, input.minute, now);
  if (now.getTime() < scheduledToday.getTime()) {
    return false;
  }
  const lastOkMs = input.lastOkAt ? Date.parse(input.lastOkAt) : Number.NaN;
  if (Number.isFinite(lastOkMs) && lastOkMs >= scheduledToday.getTime()) {
    return false;
  }
  return true;
}
