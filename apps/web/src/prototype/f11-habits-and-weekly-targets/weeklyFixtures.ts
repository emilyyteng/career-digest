/**
 * F11 M0-02 · Weekly goals + incrementer mock data (throwaway).
 */

export type WeeklyPace = "on track" | "ahead" | "behind" | "met";

export type WeeklyGoalKind = "apps" | "lc" | "custom";

export type WeeklyGoal = {
  id: string;
  kind: WeeklyGoalKind;
  name: string;
  done: number;
  target: number;
  pace: WeeklyPace;
  /** Display-only weeks-in-a-row when ≥2. */
  metWeeksStreak: number;
  archived: boolean;
  createdAt: number;
};

export type CapScenario = "under" | "full";

export const WEEKLY_CAP_SCENARIOS: ReadonlyArray<{ key: CapScenario; label: string }> = [
  { key: "under", label: "Under cap (1 custom)" },
  { key: "full", label: "At custom cap (6)" },
];

export const CUSTOM_WEEKLY_CAP = 6;

export function seedWeeklyGoals(cap: CapScenario): WeeklyGoal[] {
  const base: WeeklyGoal[] = [
    {
      id: "apps",
      kind: "apps",
      name: "Applications",
      done: 2,
      target: 5,
      pace: "behind",
      metWeeksStreak: 3,
      archived: false,
      createdAt: 0,
    },
    {
      id: "lc",
      kind: "lc",
      name: "LeetCode",
      done: 4,
      target: 10,
      pace: "on track",
      metWeeksStreak: 1,
      archived: false,
      createdAt: 0,
    },
  ];

  if (cap === "full") {
    return [
      ...base,
      {
        id: "g1",
        kind: "custom",
        name: "Gym",
        done: 1,
        target: 3,
        pace: "behind",
        metWeeksStreak: 2,
        archived: false,
        createdAt: 1,
      },
      {
        id: "g2",
        kind: "custom",
        name: "Networking",
        done: 0,
        target: 3,
        pace: "behind",
        metWeeksStreak: 0,
        archived: false,
        createdAt: 2,
      },
      {
        id: "g3",
        kind: "custom",
        name: "Blog",
        done: 2,
        target: 3,
        pace: "on track",
        metWeeksStreak: 0,
        archived: false,
        createdAt: 3,
      },
      {
        id: "g5",
        kind: "custom",
        name: "Walk",
        done: 1,
        target: 3,
        pace: "behind",
        metWeeksStreak: 0,
        archived: false,
        createdAt: 4,
      },
      {
        id: "g6",
        kind: "custom",
        name: "Cook",
        done: 0,
        target: 3,
        pace: "behind",
        metWeeksStreak: 1,
        archived: false,
        createdAt: 5,
      },
      {
        id: "g7",
        kind: "custom",
        name: "Read",
        done: 3,
        target: 3,
        pace: "met",
        metWeeksStreak: 2,
        archived: false,
        createdAt: 6,
      },
      {
        id: "g4",
        kind: "custom",
        name: "Spanish",
        done: 0,
        target: 3,
        pace: "behind",
        metWeeksStreak: 4,
        archived: true,
        createdAt: 0,
      },
    ];
  }

  return [
    ...base,
    {
      id: "g1",
      kind: "custom",
      name: "Gym",
      done: 1,
      target: 3,
      pace: "behind",
      metWeeksStreak: 2,
      archived: false,
      createdAt: 1,
    },
    {
      id: "g4",
      kind: "custom",
      name: "Spanish",
      done: 0,
      target: 3,
      pace: "behind",
      metWeeksStreak: 4,
      archived: true,
      createdAt: 0,
    },
  ];
}

export function recomputePace(done: number, target: number): WeeklyPace {
  if (target > 0 && done >= target) return "met";
  if (done === 0) return "behind";
  const ratio = done / target;
  if (ratio >= 0.7) return "on track";
  if (ratio >= 0.4) return "on track";
  return "behind";
}

/** Unmet goals for Home Targets mock (Sunday pattern). */
export function unmetForTargets(goals: WeeklyGoal[]): WeeklyGoal[] {
  return goals.filter((g) => !g.archived && g.done < g.target);
}
