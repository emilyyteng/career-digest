/**
 * Mock data for F08 M5-07 streaks / achievements / flourish prototypes.
 * Numbers from R5.25 / R5.26. No API calls.
 */

export const WEEKLY_UNIT_POINTS = 20;
export const WEEKLY_MET_BONUS = 100;

export function weeklyGoalPoints(done: number, target: number): number {
  if (target <= 0) return 0;
  return done * WEEKLY_UNIT_POINTS + (done >= target ? WEEKLY_MET_BONUS : 0);
}

export function goalName(goal: "apps" | "lc"): string {
  return goal === "apps" ? "Apps" : "LC";
}

/** Daily streak length → points for that day (R5.25). */
export function dailyStreakPoints(length: number): number {
  if (length <= 0) return 0;
  return Math.min(20, 2 * length);
}

export const STREAK_MILESTONES = [5, 10, 20, 30, 50, 100] as const;

export function milestonePoints(n: number): number {
  return 5 * n;
}

export type WeeklyStreakScenario = {
  key: string;
  label: string;
  lcWeeks: number;
  appsWeeks: number;
};

/** Weekly-goal streak lengths for Q5. */
export const WEEKLY_STREAK_SCENARIOS: WeeklyStreakScenario[] = [
  { key: "fresh", label: "0 / 0", lcWeeks: 0, appsWeeks: 0 },
  { key: "start", label: "1 / 1", lcWeeks: 1, appsWeeks: 1 },
  { key: "mid", label: "3 / 2", lcWeeks: 3, appsWeeks: 2 },
  { key: "long", label: "8 / 5", lcWeeks: 8, appsWeeks: 5 },
  { key: "lc-only", label: "4 / 0", lcWeeks: 4, appsWeeks: 0 },
];

export type CongratsMet = { goal: "apps" | "lc"; done: number; target: number };

export const CONGRATS_MET_BOTH: CongratsMet[] = [
  { goal: "apps", done: 5, target: 5 },
  { goal: "lc", done: 12, target: 10 },
];

export const CONGRATS_MET_LC: CongratsMet[] = [{ goal: "lc", done: 10, target: 10 }];

export const LAST_WEEK_LABEL = "Week of Oct 6";

/** Progress weekly block mock (A2 layout). */
export const PROGRESS_LC = { done: 7, target: 10, label: "Grind 75 Week 4" };
export const PROGRESS_APPS = {
  done: 2,
  total: 5,
  members: [
    { id: "1", name: "Figma · SWE Intern", done: true },
    { id: "2", name: "Stripe · Backend Intern", done: true },
    { id: "3", name: "Notion · Product Eng Intern", done: false },
    { id: "4", name: "Datadog · SWE Intern", done: false },
    { id: "5", name: "Ramp · SWE Intern", done: false },
  ],
};

export type TodayStripScenario = {
  key: string;
  label: string;
  appsStreak: number;
  lcStreak: number;
  appsToday: boolean;
  lcToday: boolean;
  /** Today's unit counts (apps marked / LC solves) — for “streak vs today” compare. */
  appsTodayCount: number;
  lcTodayCount: number;
  reflectionLanes: Array<"app" | "tech" | "other">;
};

/** Daily streak strip scenarios (R5.25 / R5.27). */
export const TODAY_STRIP_SCENARIOS: TodayStripScenario[] = [
  {
    key: "both-done",
    label: "Both done",
    appsStreak: 5,
    lcStreak: 12,
    appsToday: true,
    lcToday: true,
    appsTodayCount: 2,
    lcTodayCount: 3,
    reflectionLanes: ["app", "tech"],
  },
  {
    key: "pending",
    label: "Neither yet",
    appsStreak: 4,
    lcStreak: 11,
    appsToday: false,
    lcToday: false,
    appsTodayCount: 0,
    lcTodayCount: 0,
    reflectionLanes: [],
  },
  {
    key: "apps-only",
    label: "Apps done",
    appsStreak: 5,
    lcStreak: 11,
    appsToday: true,
    lcToday: false,
    appsTodayCount: 1,
    lcTodayCount: 0,
    reflectionLanes: ["app"],
  },
  {
    key: "lc-only",
    label: "LC done",
    appsStreak: 4,
    lcStreak: 12,
    appsToday: false,
    lcToday: true,
    appsTodayCount: 0,
    lcTodayCount: 2,
    reflectionLanes: ["tech"],
  },
  {
    key: "fresh",
    label: "Day 1",
    appsStreak: 1,
    lcStreak: 1,
    appsToday: true,
    lcToday: true,
    appsTodayCount: 1,
    lcTodayCount: 1,
    reflectionLanes: ["other"],
  },
  {
    key: "zero",
    label: "0 streaks",
    appsStreak: 0,
    lcStreak: 0,
    appsToday: false,
    lcToday: false,
    appsTodayCount: 0,
    lcTodayCount: 0,
    reflectionLanes: [],
  },
];

export type AchievementKind = "apps" | "lc" | "interview";

export type Achievement = {
  id: string;
  kind: AchievementKind;
  label: string;
  threshold: number;
  points: number;
  current: number;
  unlocked: boolean;
  /** Unlocked at launch with no points (R5.26). */
  launchUnlock?: boolean;
};

/** Sample achievement catalog for Q2/Q3 (subset of R5.26). */
export const ACHIEVEMENTS: Achievement[] = [
  {
    id: "apps-10",
    kind: "apps",
    label: "10 applications",
    threshold: 10,
    points: 30,
    current: 10,
    unlocked: true,
    launchUnlock: true,
  },
  {
    id: "apps-25",
    kind: "apps",
    label: "25 applications",
    threshold: 25,
    points: 75,
    current: 18,
    unlocked: false,
  },
  {
    id: "apps-50",
    kind: "apps",
    label: "50 applications",
    threshold: 50,
    points: 150,
    current: 18,
    unlocked: false,
  },
  {
    id: "lc-25",
    kind: "lc",
    label: "25 LC solves",
    threshold: 25,
    points: 125,
    current: 25,
    unlocked: true,
  },
  {
    id: "lc-50",
    kind: "lc",
    label: "50 LC solves",
    threshold: 50,
    points: 250,
    current: 41,
    unlocked: false,
  },
  {
    id: "lc-100",
    kind: "lc",
    label: "100 LC solves",
    threshold: 100,
    points: 500,
    current: 41,
    unlocked: false,
  },
  {
    id: "phone-5",
    kind: "interview",
    label: "5 phone screens",
    threshold: 5,
    points: 250,
    current: 3,
    unlocked: false,
  },
  {
    id: "tech-3",
    kind: "interview",
    label: "3 technicals",
    threshold: 3,
    points: 240,
    current: 1,
    unlocked: false,
  },
];

export const DAILY_STREAKS_MOCK = {
  apps: { length: 5, todayCounts: true },
  lc: { length: 12, todayCounts: true },
};

export type UnlockKind = "achievement" | "streak-milestone";

export const UNLOCK_SAMPLES: Record<
  UnlockKind,
  { title: string; detail: string; points: number }
> = {
  achievement: {
    title: "Achievement unlocked",
    detail: "50 LC solves",
    points: 250,
  },
  "streak-milestone": {
    title: "Streak milestone",
    detail: "LC · 10 days",
    points: 50,
  },
};

export type FlourishEvent = "task" | "applied" | "lc" | "interview";

export const FLOURISH_EVENTS: Array<{ key: FlourishEvent; label: string }> = [
  { key: "task", label: "Misc complete" },
  { key: "applied", label: "Mark applied" },
  { key: "lc", label: "LC +" },
  { key: "interview", label: "Finish step" },
];
