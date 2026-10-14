/**
 * Local-calendar range windows for Rewards Earnings (F08 M7-08 / R7.8).
 * Kept out of pointsLedger to avoid importing weeklyGoals (which imports the ledger).
 */
import { addCivilDays } from "./homeUpcoming.js";
import { isValidTimezone, localDateInTimezone } from "./progress.js";
import type { EarningsRange } from "./pointsLedger.js";
import { mondayOfLocalWeek, zonedMidnightUtc } from "./weeklyGoals.js";

export function resolveEarningsRangeBounds(
  range: EarningsRange,
  now: Date,
  tz: string,
): { from: Date | null; to: Date | null } {
  if (!isValidTimezone(tz)) {
    throw new Error("Invalid timezone");
  }
  if (range === "all") return { from: null, to: null };

  const today = localDateInTimezone(now, tz);
  if (range === "today") {
    return {
      from: zonedMidnightUtc(today, tz),
      to: zonedMidnightUtc(addCivilDays(today, 1), tz),
    };
  }
  if (range === "this_week") {
    const monday = mondayOfLocalWeek(now, tz);
    return {
      from: zonedMidnightUtc(monday, tz),
      to: zonedMidnightUtc(addCivilDays(monday, 7), tz),
    };
  }
  if (range === "last_7_days") {
    // Inclusive of today: today-6 .. tomorrow.
    return {
      from: zonedMidnightUtc(addCivilDays(today, -6), tz),
      to: zonedMidnightUtc(addCivilDays(today, 1), tz),
    };
  }
  // this_month
  const monthStart = `${today.slice(0, 7)}-01`;
  const [y, m] = monthStart.split("-").map(Number);
  const nextMonth =
    m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return {
    from: zonedMidnightUtc(monthStart, tz),
    to: zonedMidnightUtc(nextMonth, tz),
  };
}
