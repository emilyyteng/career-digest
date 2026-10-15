/** Mock data for F08 M8-01 Progress hub prototypes. */

export type CompletionKind =
  | "task"
  | "application"
  | "interview"
  | "reflection"
  | "weekly"
  | "leetcode";

export type MockCompletion = {
  id: string;
  localDate: string;
  kind: CompletionKind;
  title: string;
  subtitle: string;
  points?: number;
};

export type MockDay = {
  date: string;
  lcEasy: number;
  lcMedium: number;
  lcHard: number;
  /** Seeds earned that calendar day (mock; may include weekly-close lumps). */
  seeds: number;
  /** Seeds excluding weekly-goal category (mock alternative metric). */
  seedsWork: number;
  minutes: number;
  interviews: Array<{ id: string; label: string }>;
  apps: Array<{ id: string; label: string }>;
  reflections: Array<{ id: string; lane: string; body: string }>;
};

/** Completions filters — no dedicated weekly-goals tab (R8.4). */
export const KIND_TABS: Array<{ key: CompletionKind | "all"; label: string }> = [
  { key: "all", label: "all" },
  { key: "task", label: "tasks" },
  { key: "application", label: "apps" },
  { key: "interview", label: "interviews" },
  { key: "reflection", label: "reflections" },
  { key: "leetcode", label: "leetcode" },
];

export function localYmd(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDays(ymd: string, n: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return localYmd(new Date(y, m - 1, d + n));
}

export function formatDay(ymd: string, today: string): string {
  if (ymd === today) return "Today";
  if (ymd === addDays(today, -1)) return "Yesterday";
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatLong(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

/** Inclusive window: `end` and the previous `size - 1` days. */
export function windowEndingOn(end: string, size: number): string[] {
  const days: string[] = [];
  for (let i = size - 1; i >= 0; i -= 1) days.push(addDays(end, -i));
  return days;
}

export const TODAY = localYmd();

function buildDays(): Record<string, MockDay> {
  const out: Record<string, MockDay> = {};
  for (let i = 0; i < 90; i += 1) {
    const date = addDays(TODAY, -i);
    const lcEasy = i % 5 === 0 ? 1 : 0;
    const lcMedium = i % 3 === 0 ? 1 : i % 2 === 0 ? 1 : 0;
    const lcHard = i % 7 === 0 ? 1 : 0;
    const lcPts = lcEasy * 20 + lcMedium * 30 + lcHard * 50;
    const apps =
      i % 4 === 0
        ? [{ id: `app-${date}`, label: "Notion · Software Engineer Intern" }]
        : i % 4 === 1
          ? [{ id: `app-${date}`, label: "Stripe · Backend Intern" }]
          : [];
    const interviews =
      i % 9 === 0
        ? [{ id: `iv-${date}`, label: "Acme · Phone screen" }]
        : i % 11 === 0
          ? [{ id: `iv-${date}`, label: "Globex · Onsite round 1" }]
          : [];
    const reflections =
      i % 3 === 0
        ? [
            {
              id: `ref-${date}`,
              lane: i % 2 === 0 ? "technical" : "application",
              body:
                i % 2 === 0
                  ? "Worked two medium graphs; still slow on DFS framing."
                  : "Tweaked resume bullets for the Stripe posting.",
            },
          ]
        : [];
    const workSeeds =
      lcPts +
      apps.length * 40 +
      interviews.length * 60 +
      reflections.length * 20 +
      (i % 5 === 2 ? 35 : 0);
    /** Fake week-close lump on Mondays to show the bias problem. */
    const [y, m, d] = date.split("-").map(Number);
    const isMonday = new Date(y, m - 1, d).getDay() === 1;
    const weeklyLump = isMonday && i > 0 && i < 70 ? 340 : 0;
    out[date] = {
      date,
      lcEasy,
      lcMedium,
      lcHard,
      seeds: workSeeds + weeklyLump,
      seedsWork: workSeeds,
      minutes: apps.length * 45 + interviews.length * 60 + (i % 5 === 2 ? 25 : 0) + reflections.length * 0,
      interviews,
      apps,
      reflections,
    };
  }
  return out;
}

export const DAYS = buildDays();

export const COMPLETIONS: MockCompletion[] = (() => {
  const rows: MockCompletion[] = [];
  let n = 0;
  for (let i = 0; i < 90; i += 1) {
    const date = addDays(TODAY, -i);
    const day = DAYS[date]!;
    const lcTotal = day.lcEasy + day.lcMedium + day.lcHard;
    if (lcTotal > 0) {
      rows.push({
        id: `c-${n++}`,
        localDate: date,
        kind: "leetcode",
        title: `LC: ${lcTotal} solved`,
        subtitle: `${day.lcEasy} easy · ${day.lcMedium} medium · ${day.lcHard} hard`,
        points: day.lcEasy * 20 + day.lcMedium * 30 + day.lcHard * 50,
      });
    }
    for (const app of day.apps) {
      rows.push({
        id: `c-${n++}`,
        localDate: date,
        kind: "application",
        title: app.label,
        subtitle: "applied",
        points: 40,
      });
    }
    for (const iv of day.interviews) {
      rows.push({
        id: `c-${n++}`,
        localDate: date,
        kind: "interview",
        title: iv.label,
        subtitle: "finished step",
        points: 60,
      });
    }
    for (const ref of day.reflections) {
      rows.push({
        id: `c-${n++}`,
        localDate: date,
        kind: "reflection",
        title: ref.body.slice(0, 48) + (ref.body.length > 48 ? "…" : ""),
        subtitle: `${ref.lane} · note`,
        points: 20,
      });
    }
    if (i % 5 === 2) {
      rows.push({
        id: `c-${n++}`,
        localDate: date,
        kind: "task",
        title: "Misc · Update tracker spreadsheet",
        subtitle: "est 30 / actual 25",
        points: 35,
      });
    }
    const [y, m, d] = date.split("-").map(Number);
    if (new Date(y, m - 1, d).getDay() === 1 && i > 0 && i < 70) {
      rows.push({
        id: `c-${n++}`,
        localDate: date,
        kind: "weekly",
        title: "Weekly LC 12/10",
        subtitle: "Week close · target met (lump — biases the day)",
        points: 340,
      });
    }
  }
  return rows;
})();

/** Distinct days with any completion-log row. */
export const DAYS_WORKED = new Set(COMPLETIONS.map((c) => c.localDate)).size;

export const LIFETIME_STATS = {
  tasks: 48,
  apps: 36,
  interviews: 9,
  reflections: 62,
  leetcode: 214,
  daysWorked: DAYS_WORKED,
  minutes: 4820,
  seedsLifetime: 12640,
  longestLcStreak: 14,
  longestAppsStreak: 9,
};

/** ~26 weeks of mock heatmap days for the production ProgressHeatmap. */
export function mockHeatmapDays(lane: "application" | "technical"): Array<{
  date: string;
  raw: number;
  earned: number;
  effort: boolean;
}> {
  const out: Array<{ date: string; raw: number; earned: number; effort: boolean }> = [];
  for (let i = 181; i >= 0; i -= 1) {
    const date = addDays(TODAY, -i);
    const day = DAYS[date];
    if (!day) {
      out.push({ date, raw: 0, earned: 0, effort: false });
      continue;
    }
    if (lane === "application") {
      const raw = day.apps.length + day.interviews.length;
      const earned = Math.min(3, raw);
      const effort = day.reflections.some((r) => r.lane === "application");
      out.push({ date, raw, earned, effort });
    } else {
      const raw = day.lcEasy + day.lcMedium + day.lcHard;
      const earned = Math.min(3, raw);
      const effort = day.reflections.some((r) => r.lane === "technical");
      out.push({ date, raw, earned, effort });
    }
  }
  return out;
}

export const ACHIEVEMENTS = [
  { id: "a1", family: "apps", label: "10 applications", unlocked: true, current: 36, threshold: 10, points: 50 },
  { id: "a2", family: "apps", label: "25 applications", unlocked: true, current: 36, threshold: 25, points: 120 },
  { id: "a3", family: "apps", label: "50 applications", unlocked: false, current: 36, threshold: 50, points: 250 },
  { id: "l1", family: "leetcode", label: "100 LC solves", unlocked: true, current: 214, threshold: 100, points: 100 },
  { id: "l2", family: "leetcode", label: "250 LC solves", unlocked: false, current: 214, threshold: 250, points: 250 },
  { id: "i1", family: "interview", label: "5 interview steps", unlocked: true, current: 9, threshold: 5, points: 80 },
];

export const WEEKLY_GOALS = {
  lc: { done: 7, total: 10, label: "Grind 75 Week 4", pace: "2 behind", streak: 3 },
  apps: {
    done: 2,
    total: 4,
    pace: "on track",
    streak: 2,
    members: [
      { label: "Notion · Software Engineer Intern", applied: true },
      { label: "Stripe · Backend Intern", applied: false },
      { label: "Linear · Product Engineer Intern", applied: false },
      { label: "Figma · Design Systems Intern", applied: false },
    ],
  },
};

export type IntensityMetric = "seeds" | "seedsWork" | "minutes" | "events";

/** 0–4 intensity for calendar/heatmap cells (no effort checkmarks). */
export function intensityForDay(day: MockDay, metric: IntensityMetric): number {
  if (metric === "seeds") {
    if (day.seeds <= 0) return 0;
    if (day.seeds < 40) return 1;
    if (day.seeds < 100) return 2;
    if (day.seeds < 250) return 3;
    return 4;
  }
  if (metric === "seedsWork") {
    if (day.seedsWork <= 0) return 0;
    if (day.seedsWork < 40) return 1;
    if (day.seedsWork < 80) return 2;
    if (day.seedsWork < 140) return 3;
    return 4;
  }
  if (metric === "minutes") {
    if (day.minutes <= 0) return 0;
    if (day.minutes < 30) return 1;
    if (day.minutes < 60) return 2;
    if (day.minutes < 120) return 3;
    return 4;
  }
  const events =
    day.apps.length +
    day.interviews.length +
    day.reflections.length +
    (day.lcEasy + day.lcMedium + day.lcHard > 0 ? 1 : 0);
  return Math.min(4, events);
}

export function series(
  days: number,
  metric: IntensityMetric,
): Array<{ date: string; value: number }> {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(TODAY, -(days - 1 - i));
    const day = DAYS[date]!;
    const value =
      metric === "seeds"
        ? day.seeds
        : metric === "seedsWork"
          ? day.seedsWork
          : metric === "minutes"
            ? day.minutes
            : day.apps.length +
              day.interviews.length +
              day.reflections.length +
              (day.lcEasy + day.lcMedium + day.lcHard > 0 ? 1 : 0);
    return { date, value };
  });
}

/** Week/month pulse — order locked: LC · apps · tasks · interviews · reflections. */
export const PULSE = {
  week: {
    line: "7 LC · 15 apps · 4 tasks · 2 interviews · 10 reflections",
    minutes: 362,
  },
  month: {
    line: "48 LC · 36 apps · 18 tasks · 6 interviews · 41 reflections",
    minutes: 1840,
  },
};
