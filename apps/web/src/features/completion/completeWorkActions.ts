import {
  createProgressReflection,
  patchApplication,
  patchTask,
  type ProgressLane,
} from "../../api";
import type { CompleteWorkResult } from "./CompleteWorkModal";
import type { ReflectionDraft } from "./ReflectionDraftFields";

export function mergeNotes(
  existing: string | null | undefined,
  addition: string | null | undefined,
): string | null {
  const a = addition?.trim() ?? "";
  if (!a) return existing?.trim() || null;
  const prev = existing?.trim() ?? "";
  return prev ? `${prev}\n\n${a}` : a;
}

export async function saveCompletionReflection(
  draft: ReflectionDraft,
  link: {
    taskId?: string | null;
    applicationId?: string | null;
    interviewStepId?: string | null;
  },
): Promise<void> {
  await createProgressReflection({
    lane: draft.lane,
    body: draft.body,
    actualMinutes: draft.actualMinutes,
    taskId: link.taskId ?? null,
    applicationId: link.applicationId ?? null,
    interviewStepId: link.interviewStepId ?? null,
  });
}

export async function applyCompleteWorkSideEffects(
  result: CompleteWorkResult,
  target:
    | { kind: "task"; taskId: string; existingNotes?: string | null }
    | {
        kind: "application";
        applicationId: string;
        existingNotes?: string | null;
        /** When set, reflection links to task first (transfers on mark-applied). */
        reflectionTaskId?: string | null;
        interviewStepId?: string | null;
      },
): Promise<void> {
  if (result.notes) {
    const next = mergeNotes(target.existingNotes, result.notes);
    if (target.kind === "task") {
      await patchTask(target.taskId, { notes: next });
    } else {
      await patchApplication(target.applicationId, { notes: next });
    }
  }
  if (result.reflection) {
    if (target.kind === "task") {
      await saveCompletionReflection(result.reflection, { taskId: target.taskId });
    } else {
      await saveCompletionReflection(result.reflection, {
        taskId: target.reflectionTaskId ?? null,
        applicationId: target.reflectionTaskId ? null : target.applicationId,
        interviewStepId: target.interviewStepId ?? null,
      });
    }
  }
}

export function defaultLaneForTask(isApplication: boolean): ProgressLane {
  return isApplication ? "application" : "other";
}
