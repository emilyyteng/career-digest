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
  apps: Array<{ id: string; label: string }>;
  reflections: Array<{ id: string; lane: string; body: string }>;
};

export const KIND_TABS: Array<{ key: CompletionKind | "all"; label: string }> = [
  { key: "all", label: "all" },
  { key: "task", label: "tasks" },
  { key: "application", label: "apps" },
  { key: "interview", label: "interviews" },
  { key: "reflection", label: "reflections" },
  { key: "weekly", label: "weekly goals" },
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
  for (let i = 0; i < 28; i += 1) {
    const date = addDays(TODAY, -i);
    out[date] = {
      date,
      lcEasy: i % 5 === 0 ? 1 : 0,
      lcMedium: i % 3 === 0 ? 1 : i % 2 === 0 ? 1 : 0,
      lcHard: i % 7 === 0 ? 1 : 0,
      apps:
        i % 4 === 0
          ? [{ id: `app-${date}`, label: "Notion · Software Engineer Intern" }]
          : i % 4 === 1
            ? [{ id: `app-${date}`, label: "Stripe · Backend Intern" }]
            : [],
      reflections:
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
          : [],
    };
  }
  return out;
}

export const DAYS = buildDays();

export const COMPLETIONS: MockCompletion[] = (() => {
  const rows: MockCompletion[] = [];
  let n = 0;
  for (let i = 0; i < 28; i += 1) {
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
    if (i % 9 === 0) {
      rows.push({
        id: `c-${n++}`,
        localDate: date,
        kind: "interview",
        title: "Acme · Phone screen",
        subtitle: "finished step",
        points: 60,
      });
    }
  }
  rows.push({
    id: `c-${n++}`,
    localDate: addDays(TODAY, -((new Date(TODAY).getDay() + 6) % 7 || 7)),
    kind: "weekly",
    title: "Weekly LC 12/10",
    subtitle: "Week of prior Monday · target met",
    points: 340,
  });
  return rows;
})();

export const LIFETIME_STATS = {
  tasks: 48,
  apps: 36,
  interviews: 9,
  reflections: 62,
  leetcode: 214,
  weekly: 6,
};

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
    streak: 0,
    members: [
      { label: "Notion · Software Engineer Intern", applied: true },
      { label: "Stripe · Backend Intern", applied: false },
      { label: "Linear · Product Engineer Intern", applied: false },
      { label: "Figma · Design Systems Intern", applied: false },
    ],
  },
};

export function heatMarks(): Record<string, { earned: number; effort: boolean }> {
  const marks: Record<string, { earned: number; effort: boolean }> = {};
  for (let i = 0; i < 28; i += 1) {
    const date = addDays(TODAY, -i);
    const day = DAYS[date]!;
    const earned = Math.min(
      3,
      day.apps.length + (day.lcEasy + day.lcMedium + day.lcHard > 0 ? 1 : 0),
    );
    marks[date] = { earned, effort: day.reflections.length > 0 };
  }
  return marks;
}
