/**
 * Mock data for the F08 M5-06 weekly-surface prototypes. No API calls.
 * Dates are computed from today so Sunday targets are always upcoming (R5.7).
 */

export type Tier = "easy" | "medium" | "hard";
export type LcType = "weekly" | "misc";

export const TIERS: Tier[] = ["easy", "medium", "hard"];
export const TIER_LABEL: Record<Tier, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
export const TIER_SHORT: Record<Tier, string> = { easy: "E", medium: "M", hard: "H" };

/** Tier points (spec R5.20, Q32); medium matches the pre-tier +30. */
export const TIER_POINTS: Record<Tier, number> = { easy: 20, medium: 30, hard: 50 };

export const WEEKLY_UNIT_POINTS = 20;
export const WEEKLY_MET_BONUS = 100;
export const LC_LABEL_MAX = 50;

/** R5.15: +20 per unit, +100 once when met; past the target keeps +20 each. 0/0 earns nothing (R5.12). */
export function weeklyGoalPoints(done: number, target: number): number {
  if (target <= 0) return 0;
  return done * WEEKLY_UNIT_POINTS + (done >= target ? WEEKLY_MET_BONUS : 0);
}

export type DayCounts = Record<Tier, number>;

export function dayTotal(day: DayCounts): number {
  return day.easy + day.medium + day.hard;
}

function startOfLocalDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function mondayOf(d: Date): Date {
  const day = startOfLocalDay(d);
  const offset = (day.getDay() + 6) % 7;
  day.setDate(day.getDate() - offset);
  return day;
}

const NOW = new Date();
export const THIS_MONDAY = mondayOf(NOW);
export const LAST_MONDAY = new Date(THIS_MONDAY.getFullYear(), THIS_MONDAY.getMonth(), THIS_MONDAY.getDate() - 7);
export const THIS_SUNDAY = new Date(THIS_MONDAY.getFullYear(), THIS_MONDAY.getMonth(), THIS_MONDAY.getDate() + 6);
export const THIS_SUNDAY_END_ISO = new Date(
  THIS_SUNDAY.getFullYear(),
  THIS_SUNDAY.getMonth(),
  THIS_SUNDAY.getDate(),
  23,
  59,
  59,
).toISOString();

export function weekOfLabel(monday: Date): string {
  return `Week of ${monday.toLocaleDateString(undefined, { month: "short", day: "numeric" })}`;
}

export function dayLabel(d: Date): string {
  const wd = d.toLocaleDateString(undefined, { weekday: "short" });
  const md = d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${wd} · ${md}`;
}

export const SUNDAY_LABEL = dayLabel(THIS_SUNDAY);
export const LAST_WEEK_LABEL = weekOfLabel(LAST_MONDAY);

/** Fraction of the week elapsed, matching `computePace` in `apps/api/src/weeklyGoals.ts`. */
export const FRACTION_ELAPSED = Math.min(
  1,
  Math.max(0, (NOW.getTime() - THIS_MONDAY.getTime()) / (7 * 24 * 60 * 60 * 1000)),
);

export type Pace = { label: "ahead" | "behind" | "on_track"; amount: number; met: boolean };

export function computePace(done: number, total: number): Pace {
  if (total <= 0 || done >= total) return { label: "on_track", amount: 0, met: total > 0 };
  const delta = Math.floor(done - FRACTION_ELAPSED * total);
  if (delta > 0) return { label: "ahead", amount: delta, met: false };
  if (delta < 0) return { label: "behind", amount: -delta, met: false };
  return { label: "on_track", amount: 0, met: false };
}

export type AppMember = {
  taskId: string;
  organization: string;
  title: string;
  status: "open" | "completed";
};

export const APP_MEMBERS: AppMember[] = [
  { taskId: "t1", organization: "Figma", title: "Software Engineer Intern", status: "completed" },
  { taskId: "t2", organization: "Stripe", title: "Backend Intern, Payments", status: "completed" },
  { taskId: "t3", organization: "Notion", title: "Product Engineering Intern", status: "open" },
  { taskId: "t4", organization: "Datadog", title: "SWE Intern, Summer", status: "open" },
  { taskId: "t5", organization: "Ramp", title: "Software Engineer Intern", status: "open" },
];

export const LC_LABEL_SAMPLE = "Grind 75 Week 4";
export const LC_TARGET = 10;

export type LcScenario = "behind" | "met" | "over";
export const LC_SCENARIOS: Array<{ key: LcScenario; label: string; progress: number }> = [
  { key: "behind", label: "4/10", progress: 4 },
  { key: "met", label: "10/10", progress: 10 },
  { key: "over", label: "12/10", progress: 12 },
];

export const LC_STREAK_WEEKS = 3;
export const APPS_STREAK_WEEKS = 1;

export type LastWeekGoal = { goal: "apps" | "lc"; done: number; target: number };

export type CongratsScenario = "both" | "lc" | "apps" | "neither";
export const CONGRATS_SCENARIOS: Array<{ key: CongratsScenario; label: string; goals: LastWeekGoal[] }> = [
  {
    key: "both",
    label: "Both met",
    goals: [
      { goal: "apps", done: 5, target: 5 },
      { goal: "lc", done: 12, target: 10 },
    ],
  },
  {
    key: "lc",
    label: "LC only",
    goals: [
      { goal: "apps", done: 3, target: 6 },
      { goal: "lc", done: 10, target: 10 },
    ],
  },
  {
    key: "apps",
    label: "Apps only",
    goals: [
      { goal: "apps", done: 4, target: 4 },
      { goal: "lc", done: 6, target: 10 },
    ],
  },
  {
    key: "neither",
    label: "Neither met",
    goals: [
      { goal: "apps", done: 2, target: 5 },
      { goal: "lc", done: 7, target: 10 },
    ],
  },
];

export function goalName(goal: "apps" | "lc"): string {
  return goal === "apps" ? "Apps" : "LC";
}

export function streakFor(goal: "apps" | "lc"): number {
  return goal === "lc" ? LC_STREAK_WEEKS : APPS_STREAK_WEEKS;
}
