/**
 * Throwaway fixtures for M5 celebration + weekly goals + Home targets prototypes.
 */

export type ProtoPace = { label: "ahead" | "behind" | "on-track"; amount: number };

export type ProtoWeeklyMember = {
  taskId: string;
  title: string;
  organization?: string;
  status: "open" | "completed";
};

export type ProtoWeeklyGoal = {
  id: string;
  slot: "lc" | "apps";
  title: string;
  done: number;
  total: number;
  progressCount: number;
  targetCount: number;
  /** Optional Progress note → Home subtitle when set. */
  label?: string | null;
  pace: ProtoPace;
  members: ProtoWeeklyMember[];
};

export const weeklyGoalsFixture: ProtoWeeklyGoal[] = [
  {
    id: "wg-lc",
    slot: "lc",
    title: "Weekly LC",
    done: 6,
    total: 10,
    progressCount: 6,
    targetCount: 10,
    label: "Grind 75 · Week 4",
    pace: { label: "on-track", amount: 0 },
    members: [],
  },
  {
    id: "wg-apps",
    slot: "apps",
    title: "Weekly applications",
    done: 2,
    total: 4,
    progressCount: 0,
    targetCount: 4,
    label: null,
    pace: { label: "behind", amount: 1 },
    members: [
      {
        taskId: "t1",
        organization: "Stripe",
        title: "Apply · SWE intern",
        status: "completed",
      },
      {
        taskId: "t2",
        organization: "Notion",
        title: "Apply · Product eng",
        status: "completed",
      },
      {
        taskId: "t3",
        organization: "Figma",
        title: "Apply · Frontend",
        status: "open",
      },
      {
        taskId: "t4",
        organization: "Linear",
        title: "Apply · Full stack",
        status: "open",
      },
    ],
  },
];

export type ProtoHomeWeeklyTarget = {
  id: string;
  kind: "weekly_lc" | "weekly_apps";
  primary: string;
  secondary: string;
  /** Shown on Sunday Targets column only; hide row when met. */
  met: boolean;
};

/** Sunday bucket in Home → Targets (not Deadlines). */
export const homeSundayTargets: ProtoHomeWeeklyTarget[] = [
  {
    id: "ht-lc",
    kind: "weekly_lc",
    primary: "Weekly LC goal",
    secondary: "Grind 75 · Week 4 · 6/10 · on track",
    met: false,
  },
  {
    id: "ht-apps",
    kind: "weekly_apps",
    primary: "Weekly applications goal",
    secondary: "2/4 tagged · 1 behind",
    met: false,
  },
];

export const homeSundayTargetsMetLc: ProtoHomeWeeklyTarget[] = [
  { ...homeSundayTargets[0]!, met: true },
  homeSundayTargets[1]!,
];

export type ProtoTaskCompleteDemo = {
  id: string;
  title: string;
  estimateMin: number;
};

export const completeDemoTasks: ProtoTaskCompleteDemo[] = [
  { id: "c1", title: "Revise systems design notes", estimateMin: 45 },
  { id: "c2", title: "Apply · Anthropic SWE intern", estimateMin: 25 },
  { id: "c3", title: "LC · Binary search variants", estimateMin: 35 },
];

export const weeklyHitEarn = {
  amount: 100,
  message: "+100 · Weekly LC target hit",
  balanceAfter: 1248,
} as const;

export const routineEarn = {
  amount: 12,
  message: "+12 · Task complete",
  balanceAfter: 1148,
} as const;
