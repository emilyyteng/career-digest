/** Read-only fixture data for M1 detail-page prototypes (pass 2). */

export type ProtoSticky = {
  id: string;
  title: string;
  body: string;
  when: string;
  deepWork: boolean;
  stepLabel?: string;
};

export type ProtoSubtask = {
  id: string;
  title: string;
  done: boolean;
  dueLabel: string | null;
  estimateMinutes: number | null;
};

/** Relative to page load so live countdown / pies actually tick down. */
export function dueInHours(hours: number): string {
  return new Date(Date.now() + hours * 3600_000).toISOString();
}

export function makeMiscTaskFixture(opts?: { withSubtasks?: boolean; dueKind?: "deadline" | "target" }) {
  const withSubtasks = opts?.withSubtasks !== false;
  const dueKind = opts?.dueKind ?? "deadline";
  return {
    id: "task-misc-1",
    title: "Write weekly reflection essay",
    categoryName: "Writing",
    organization: "Personal",
    status: "open" as const,
    priority: 1 as const,
    dueKind,
    dueAt: dueKind ? dueInHours(18) : null,
    estimateMinutes: 90,
    url: "https://example.com/essay-prompt",
    notes: "Focus on craft over volume. Keep under 800 words.",
    subtasks: (withSubtasks
      ? [
          {
            id: "s1",
            title: "Outline beats",
            done: true,
            dueLabel: "Target · yesterday",
            estimateMinutes: 20,
          },
          {
            id: "s2",
            title: "Draft body",
            done: false,
            dueLabel: "Deadline · today",
            estimateMinutes: 45,
          },
          {
            id: "s3",
            title: "Edit pass",
            done: false,
            dueLabel: null,
            estimateMinutes: 25,
          },
        ]
      : []) satisfies ProtoSubtask[],
    stickies: [
      {
        id: "r1",
        title: "Earlier session",
        body: "Got stuck on the opening — freewrite for 10 minutes worked.",
        when: "Mon · deep work",
        deepWork: true,
      },
      {
        id: "r2",
        title: "Voice note",
        body: "Tone was too stiff in v1. Aim for conversational, like a letter to a friend who codes.",
        when: "Tue",
        deepWork: false,
      },
    ] satisfies ProtoSticky[],
  };
}

export function makeAppTaskFixture() {
  return {
    id: "task-app-1",
    title: "Software Engineer Intern",
    categoryName: "Applications",
    organization: "Northstar Labs",
    location: "San Francisco, CA",
    status: "open" as const,
    priority: 0 as const,
    dueKind: "deadline" as const,
    dueAt: dueInHours(36),
    estimateMinutes: 45,
    weeklyTarget: true,
    url: "https://boards.greenhouse.io/northstar/jobs/123",
    postingId: "posting-1",
    applicationId: "app-todo-1",
    notes: "Tailor resume bullet on distributed systems project.",
    descriptionPreview:
      "Northstar Labs is hiring a Software Engineer Intern for Summer 2027. You will work with the infra team on observability and developer tooling. Requirements: Python or Go, comfort with Linux, coursework in systems…\n\nYou will pair with senior engineers, ship small production changes weekly, and present a end-of-summer demo. Hybrid SF with relocation support.",
    stickies: [
      {
        id: "r0",
        title: "Why apply",
        body: "Infra + observability is the closest match to Capstone. Short list.",
        when: "Yesterday",
        deepWork: false,
      },
    ] satisfies ProtoSticky[],
  };
}

export const applicationFixture = {
  id: "app-1",
  title: "Software Engineer Intern",
  company: "Northstar Labs",
  location: "San Francisco, CA",
  status: "interviewing" as const,
  source: "greenhouse",
  appliedAt: "2026-09-12",
  url: "https://boards.greenhouse.io/northstar/jobs/123",
  postingId: "posting-1",
  descriptionHtml:
    "<p>Northstar Labs is hiring a Software Engineer Intern for Summer 2027. You will work with the infra team on observability and developer tooling.</p><p><strong>Requirements:</strong> Python or Go, comfort with Linux, coursework in systems or distributed computing. Nice to have: prior internship, open-source contributions.</p><p>This role is hybrid in SF with relocation support for the summer.</p>",
  notes:
    "Recruiter: Maya Chen. Mention Capstone on gossip protocols. Prep system design for rate limiter.",
  documents: ["Resume_Northstar.pdf", "Cover_Northstar.pdf"],
  stickies: [
    {
      id: "ar1",
      title: "Applied",
      body: "Easy apply + short why-us paragraph. Felt low-lift.",
      when: "Sep 12",
      deepWork: false,
      stepLabel: "Application",
    },
    {
      id: "ar2",
      title: "Phone screen",
      body: "Walked through resume; they liked the Capstone. Asked about on-call interest.",
      when: "Sep 28 · deep work",
      deepWork: true,
      stepLabel: "Phone screen",
    },
  ] satisfies ProtoSticky[],
  interviewPeek: [
    { title: "Phone screen", state: "Done" },
    { title: "Technical", state: "Due Thu" },
    { title: "Waiting on them", state: "—" },
  ],
};
