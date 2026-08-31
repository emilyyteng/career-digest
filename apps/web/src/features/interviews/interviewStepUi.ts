import type { InterviewStep, InterviewThreadListItem } from "../../api";

const OPEN_STEP_STATUSES = new Set(["pending", "scheduled", "awaiting_employer"]);

export function threadHasOpenStep(steps: InterviewStep[]): boolean {
  return steps.some((s) => OPEN_STEP_STATUSES.has(s.status));
}

export function currentNotesStep(steps: InterviewStep[]): InterviewStep | null {
  const actionable = steps.find(
    (s) => s.status === "pending" || s.status === "scheduled",
  );
  if (actionable) return actionable;
  const awaiting = steps.filter((s) => s.status === "awaiting_employer");
  if (awaiting.length === 0) return null;
  return awaiting[awaiting.length - 1];
}
import { formatDeadlineLong, stepDeadlineAt } from "../../formatDate";

export function formatLinkedRoles(row: InterviewThreadListItem): string | null {
  if (row.memberCount <= 1) return null;
  const others = row.members.filter((m) => m.id !== row.primaryApplicationId);
  if (others.length === 0) return null;
  const labels = others.map((m) => {
    const title = m.title ?? "Untitled";
    return m.company && m.company !== row.company ? `${m.company} · ${title}` : title;
  });
  return `Also interviewing for: ${labels.join("; ")}`;
}

export function stepActionLabel(step: InterviewStep | null): string {
  if (!step) return "No active step";
  return step.title;
}

export function stepDeadlineLabel(step: InterviewStep | null): string | null {
  if (!step) return null;
  const at = stepDeadlineAt(step);
  if (!at) return null;
  const formatted = formatDeadlineLong(at);
  if (!formatted) return null;
  const prefix = step.status === "scheduled" ? "Scheduled" : "Due";
  return `${prefix}: ${formatted}`;
}

export function stepDeadlineIso(step: InterviewStep | null): string | null {
  if (!step) return null;
  return stepDeadlineAt(step);
}

const OPEN_LINK_LABEL: Record<string, string> = {
  assessment: "Open assessment",
  phone: "Open call link",
  technical: "Open interview link",
  onsite: "Open interview link",
  offer: "View offer",
  custom: "Open link",
};

export function stepOpenLinkLabel(step: InterviewStep | null): string {
  if (!step) return "Open link";
  return OPEN_LINK_LABEL[step.kind] ?? "Open link";
}
