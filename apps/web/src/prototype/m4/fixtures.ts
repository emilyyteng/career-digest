/**
 * Throwaway fixtures for M4 ledger + reflection-minutes prototypes.
 */

export type ProtoCompletionKind = "task" | "application" | "interview" | "reflection";

export type ProtoCompletion = {
  id: string;
  kind: ProtoCompletionKind;
  title: string;
  subtitle?: string;
  when: string;
  dayKey: string;
  estimateMin?: number | null;
  actualMin?: number | null;
  points?: number | null;
  /** Nested reflections shown on task/app/interview rows. */
  reflections?: Array<{ id: string; preview: string; minutes?: number | null; deepWork?: boolean }>;
};

export type ProtoPointsCategory =
  | "task"
  | "application"
  | "leetcode"
  | "interview"
  | "reflection"
  | "weekly_goal";

export type ProtoPointsEvent = {
  id: string;
  message: string;
  delta: number;
  balanceAfter: number;
  category: ProtoPointsCategory;
  when: string;
  /** Optional breakdown chips under the message. */
  breakdown?: Array<{ label: string; amount: number }>;
  kind?: "earn" | "reverse" | "adjust";
};

export const completionStats = {
  week: { tasks: 4, apps: 3, interview: 2, reflections: 6 },
  month: { tasks: 11, apps: 9, interview: 5, reflections: 18 },
  allTime: { tasks: 42, apps: 67, interview: 28, reflections: 91 },
  minutesWeek: 310,
  minutesMonth: 1240,
};

export const completions: ProtoCompletion[] = [
  {
    id: "c1",
    kind: "application",
    title: "Stripe · SWE Intern",
    subtitle: "Marked applied",
    when: "Today · 4:12p",
    dayKey: "today",
    points: 35,
    reflections: [{ id: "r1", preview: "Why us bullets from payments talk.", minutes: 30, deepWork: true }],
  },
  {
    id: "c2",
    kind: "task",
    title: "Write weekly reflection essay",
    subtitle: "School",
    when: "Today · 2:40p",
    dayKey: "today",
    estimateMin: 45,
    actualMin: 52,
    points: 52,
    reflections: [{ id: "r2", preview: "Outline blocked → structure pass.", minutes: null, deepWork: true }],
  },
  {
    id: "c3",
    kind: "interview",
    title: "Notion · Technical screen",
    subtitle: "Finished · waiting on them",
    when: "Today · 11:05a",
    dayKey: "today",
    points: 100,
    reflections: [{ id: "r3", preview: "Graph Q went long; review Union-Find.", minutes: 20, deepWork: true }],
  },
  {
    id: "c4",
    kind: "reflection",
    title: "Walk + voice memo",
    subtitle: "Other · standalone",
    when: "Today · 9:15a",
    dayKey: "today",
    actualMin: 15,
    points: 15,
  },
  {
    id: "c5",
    kind: "task",
    title: "LC grind · sliding window set",
    subtitle: "Technical",
    when: "Yesterday · 8:50p",
    dayKey: "yesterday",
    estimateMin: 60,
    actualMin: 40,
    points: 40,
  },
  {
    id: "c6",
    kind: "application",
    title: "Figma · Product Design Intern",
    subtitle: "Marked applied",
    when: "Yesterday · 3:20p",
    dayKey: "yesterday",
    points: 5,
  },
  {
    id: "c7",
    kind: "interview",
    title: "Airbnb · Recruiter phone",
    subtitle: "Finished · completed",
    when: "Mon · 1:00p",
    dayKey: "mon",
    points: 50,
  },
  {
    id: "c8",
    kind: "reflection",
    title: "Company values skim",
    subtitle: "Application · linked later (no pts on link)",
    when: "Mon · 10:20a",
    dayKey: "mon",
    actualMin: null,
    points: 20,
  },
];

export const categoryTotals: Array<{ key: ProtoPointsCategory; label: string; points: number }> = [
  { key: "task", label: "Tasks", points: 420 },
  { key: "leetcode", label: "LC", points: 360 },
  { key: "interview", label: "Interview", points: 310 },
  { key: "application", label: "Apps", points: 185 },
  { key: "reflection", label: "Reflection", points: 160 },
  { key: "weekly_goal", label: "Weekly goals", points: 200 },
];

export const balance = categoryTotals.reduce((sum, row) => sum + row.points, 0);

export const pointsEvents: ProtoPointsEvent[] = [
  {
    id: "e1",
    message: "Stripe application complete! +35 points",
    delta: 35,
    balanceAfter: balance,
    category: "application",
    when: "Today · 4:12p",
    breakdown: [
      { label: "app", amount: 5 },
      { label: "reflection", amount: 30 },
    ],
    kind: "earn",
  },
  {
    id: "e2",
    message: "Write weekly reflection essay complete! +52 points",
    delta: 52,
    balanceAfter: balance - 35,
    category: "task",
    when: "Today · 2:40p",
    kind: "earn",
  },
  {
    id: "e3",
    message: "Notion technical step finished! +100 points",
    delta: 100,
    balanceAfter: balance - 35 - 52,
    category: "interview",
    when: "Today · 11:05a",
    breakdown: [
      { label: "technical", amount: 80 },
      { label: "reflection", amount: 20 },
    ],
    kind: "earn",
  },
  {
    id: "e4",
    message: "LC +1 · +30 points",
    delta: 30,
    balanceAfter: balance - 35 - 52 - 100,
    category: "leetcode",
    when: "Today · 10:02a",
    kind: "earn",
  },
  {
    id: "e5",
    message: "Actual time adjusted · −12 available of 20",
    delta: -12,
    balanceAfter: balance - 35 - 52 - 100 - 30,
    category: "task",
    when: "Yesterday · 9:10p",
    kind: "adjust",
  },
  {
    id: "e6",
    message: "Weekly LC target met! +100 points",
    delta: 100,
    balanceAfter: balance - 35 - 52 - 100 - 30 + 12,
    category: "weekly_goal",
    when: "Sun · 11:58p",
    kind: "earn",
  },
  {
    id: "e7",
    message: "LC −1 · −30 points",
    delta: -30,
    balanceAfter: 980,
    category: "leetcode",
    when: "Sun · 8:14p",
    kind: "reverse",
  },
];
