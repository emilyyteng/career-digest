/**
 * Throwaway fixtures for M2 reflection-linking / Other / deep-work prototypes.
 */

export type ProtoLane = "application" | "technical" | "other";

export type ProtoLinkTarget =
  | { kind: "misc-task"; id: string; label: string }
  | { kind: "app-task"; id: string; label: string }
  | { kind: "application"; id: string; label: string }
  | null;

export type ProtoReflection = {
  id: string;
  title: string;
  body: string;
  when: string;
  lane: ProtoLane;
  deepWork: boolean;
  link: ProtoLinkTarget;
  /** Application-page section label (e.g. interview step). */
  stepLabel?: string | null;
};

export const unlinkedPool: ProtoReflection[] = [
  {
    id: "u1",
    title: "Company values skim",
    body: "Noted three culture signals from the eng blog — reuse in Why us.",
    when: "Today · 10:20",
    lane: "application",
    deepWork: true,
    link: null,
  },
  {
    id: "u2",
    title: "Graph review notes",
    body: "Union-find edge cases; still fuzzy on path compression proofs.",
    when: "Yesterday · 21:05",
    lane: "technical",
    deepWork: true,
    link: null,
  },
  {
    id: "u3",
    title: "Walk + voice memo",
    body: "Quick reset between apps. Not deep work — just a breadcrumb.",
    when: "Today · 14:02",
    lane: "other",
    deepWork: false,
    link: null,
  },
];

export const miscTaskStickies: ProtoReflection[] = [
  {
    id: "m1",
    title: "Outline draft",
    body: "Blocked on intro paragraph; 25 focused minutes on structure.",
    when: "Mon · deep work",
    lane: "other",
    deepWork: true,
    link: { kind: "misc-task", id: "t-misc", label: "Write weekly reflection essay" },
  },
];

export const appTaskStickies: ProtoReflection[] = [
  {
    id: "a1",
    title: "Why Stripe bullets",
    body: "Drafted two Why us lines from the payments infra talk.",
    when: "Today · 11:40",
    lane: "application",
    deepWork: true,
    link: { kind: "app-task", id: "t-app", label: "Apply · Stripe SWE Intern" },
  },
];

export const applicationStickies: ProtoReflection[] = [
  {
    id: "p1",
    title: "Why Stripe bullets",
    body: "Drafted two Why us lines from the payments infra talk.",
    when: "Oct 8 · transferred from app task",
    lane: "application",
    deepWork: true,
    link: { kind: "application", id: "app-1", label: "Stripe · SWE Intern" },
    stepLabel: "Application",
  },
  {
    id: "p2",
    title: "Recruiter screen debrief",
    body: "Practice STAR for ownership story before phone screen.",
    when: "Oct 9 · phone screen",
    lane: "application",
    deepWork: true,
    link: { kind: "application", id: "app-1", label: "Stripe · SWE Intern" },
    stepLabel: "Phone screen",
  },
  {
    id: "p3",
    title: "System design notes",
    body: "Sketched rate-limiter approach; need to revisit idempotency keys.",
    when: "Oct 9 · tech screen prep",
    lane: "application",
    deepWork: true,
    link: { kind: "application", id: "app-1", label: "Stripe · SWE Intern" },
    stepLabel: "Tech screen",
  },
];

export const linkCandidates = [
  { kind: "misc-task" as const, id: "t-misc", label: "Write weekly reflection essay" },
  { kind: "app-task" as const, id: "t-app", label: "Apply · Stripe SWE Intern" },
  { kind: "application" as const, id: "app-1", label: "Stripe · SWE Intern (pipeline)" },
  { kind: "misc-task" as const, id: "t-read", label: "Read Designing Data-Intensive Apps ch.3" },
];

export const stripToday = {
  applications: { earned: 2, cap: 3 },
  leetcode: { earned: 3, cap: 3 },
  effortApplication: true,
  effortTechnical: false,
  effortOther: true,
};
