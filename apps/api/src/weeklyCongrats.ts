/**
 * Last week's met weekly goals for the Home congrats banner (R5.18 / M5-02).
 */
import type { Pool, PoolClient } from "pg";
import { addCivilDays } from "./homeUpcoming.js";
import { isValidTimezone } from "./progress.js";
import {
  closeDueWeeks,
  metWeeksStreaks,
  mondayOfLocalWeek,
  weekLabel,
  type WeeklyGoalSlot,
} from "./weeklyGoals.js";

type Queryable = Pool | PoolClient;

export type WeeklyCongratsGoal = {
  slot: WeeklyGoalSlot;
  done: number;
  target: number;
  points: number;
  /** Consecutive met weeks ending with this closed week (R5.28). */
  metWeeksStreak: number;
};

export type WeeklyCongrats = {
  weekStart: string;
  weekLabel: string;
  goals: WeeklyCongratsGoal[];
};

/** Met goals from the closed week before the current one, or null if none. */
export async function getWeeklyCongrats(
  db: Queryable,
  tz: string,
  now = new Date(),
): Promise<WeeklyCongrats | null> {
  if (!isValidTimezone(tz)) return null;
  await closeDueWeeks(db, tz, now);
  const lastWeek = addCivilDays(mondayOfLocalWeek(now, tz), -7);
  const { rows } = await db.query<{
    slot: WeeklyGoalSlot;
    done: number;
    target: number;
    points: number;
  }>(
    `SELECT slot, done, target, points
     FROM weekly_goal_records
     WHERE week_start = $1::date AND met
     ORDER BY CASE slot WHEN 'lc' THEN 0 ELSE 1 END`,
    [lastWeek],
  );
  if (rows.length === 0) return null;
  const streaks = await metWeeksStreaks(db);
  return {
    weekStart: lastWeek,
    weekLabel: weekLabel(lastWeek),
    goals: rows.map((r) => ({
      slot: r.slot,
      done: r.done,
      target: r.target,
      points: r.points,
      metWeeksStreak: streaks[r.slot] ?? 0,
    })),
  };
}
