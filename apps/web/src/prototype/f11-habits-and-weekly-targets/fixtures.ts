/**
 * F11 M0-01 · Habits strip mock data (throwaway).
 */

export type CustomHabit = {
  id: string;
  name: string;
  length: number;
  doneToday: boolean;
  archived: boolean;
  /** Creation order among customs (lower = earlier). */
  createdAt: number;
};

export type DerivedStreak = {
  length: number;
  todayCounts: boolean;
  completedToday: number;
};

export type CapScenario = "under" | "full";

export const CAP_SCENARIOS: ReadonlyArray<{ key: CapScenario; label: string }> = [
  { key: "under", label: "Under cap (2 customs)" },
  { key: "full", label: "At custom cap (6)" },
];

/** Q14 archive visual language (orthogonal to Q11/Q12 variants). */
export type ArchLook = "mute" | "ghost" | "list";

/** Order: preferred first (Q14 lean → ghost stamp). */
export const ARCH_LOOKS: ReadonlyArray<{ key: ArchLook; label: string; blurb: string }> = [
  {
    key: "ghost",
    label: "Ghost stamp",
    blurb: "Low-contrast card · ARCHIVED stamp · Restore primary",
  },
  {
    key: "mute",
    label: "Muted pills",
    blurb: "Dashed muted pills · no checkoff · Restore ghost",
  },
  {
    key: "list",
    label: "Compact list",
    blurb: "Not pills — name + streak + Restore as a list row",
  },
];

export const MOCK_APPS: DerivedStreak = {
  length: 4,
  todayCounts: true,
  completedToday: 1,
};

export const MOCK_LC: DerivedStreak = {
  length: 6,
  todayCounts: false,
  completedToday: 0,
};

export const MOCK_PULSE = {
  week: { line: "3 LC · 2 apps · 4 reflections", minutes: 210 },
  month: { line: "11 LC · 9 apps · 18 reflections", minutes: 840 },
} as const;

export const MOCK_LINK_OPTIONS = [
  { key: "task:t1", label: "Draft cover letter · Acme" },
  { key: "task:t2", label: "Review LC mediums" },
  { key: "app:a1", label: "Acme · SWE Intern" },
  { key: "app:a2", label: "Globex · Platform" },
] as const;

export function seedCustoms(cap: CapScenario): CustomHabit[] {
  if (cap === "full") {
    return [
      {
        id: "h1",
        name: "Gym",
        length: 5,
        doneToday: true,
        archived: false,
        createdAt: 1,
      },
      {
        id: "h2",
        name: "Journal",
        length: 12,
        doneToday: false,
        archived: false,
        createdAt: 2,
      },
      {
        id: "h3",
        name: "Read",
        length: 3,
        doneToday: false,
        archived: false,
        createdAt: 3,
      },
      {
        id: "h5",
        name: "Walk",
        length: 2,
        doneToday: true,
        archived: false,
        createdAt: 4,
      },
      {
        id: "h6",
        name: "Water",
        length: 7,
        doneToday: false,
        archived: false,
        createdAt: 5,
      },
      {
        id: "h7",
        name: "Stretch",
        length: 1,
        doneToday: false,
        archived: false,
        createdAt: 6,
      },
      {
        id: "h4",
        name: "Meditate",
        length: 8,
        doneToday: false,
        archived: true,
        createdAt: 0,
      },
    ];
  }
  return [
    {
      id: "h1",
      name: "Gym",
      length: 5,
      doneToday: true,
      archived: false,
      createdAt: 1,
    },
    {
      id: "h2",
      name: "Journal",
      length: 12,
      doneToday: false,
      archived: false,
      createdAt: 2,
    },
    {
      id: "h4",
      name: "Meditate",
      length: 8,
      doneToday: false,
      archived: true,
      createdAt: 0,
    },
  ];
}

export const CUSTOM_CAP = 6;
