import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  addInterviewStep,
  getInterviewThread,
  patchInterviewStep,
  patchInterviewThread,
  type InterviewStep,
  type InterviewThreadDetail,
} from "../../api";
import InterviewCountdown from "./InterviewCountdown";
import {
  currentNotesStep,
  formatLinkedRoles,
  stepDeadlineIso,
  stepDeadlineLabel,
  stepOpenLinkLabel,
  threadHasOpenStep,
} from "./interviewStepUi";
import { formatDeadlineLong } from "../../formatDate";
import FinishInterviewStepModal, {
  type FinishStepMode,
  type FinishStepResult,
} from "./FinishInterviewStepModal";
import ModalLayer from "../../ModalLayer";
import StepActionConfirm from "../../StepActionConfirm";

const STEP_STATUS_LABEL: Record<string, string> = {
  pending: "To do",
  scheduled: "Scheduled",
  awaiting_employer: "Waiting on them",
  completed: "Done",
  skipped: "Skipped",
};

const KIND_OPTIONS = [
  "assessment",
  "phone",
  "technical",
  "onsite",
  "offer",
  "custom",
] as const;

function stepIsActionable(step: InterviewStep): boolean {
  return step.status === "pending" || step.status === "scheduled";
}

type StepConfirmAction = "reopen";

export default function InterviewWorkspace() {
  const { threadId } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const [thread, setThread] = useState<InterviewThreadDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [addingStep, setAddingStep] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newKind, setNewKind] = useState("technical");
  const [notes, setNotes] = useState("");
  const [stepConfirm, setStepConfirm] = useState<{
    stepId: string;
    action: StepConfirmAction;
  } | null>(null);
  const [finishStepTarget, setFinishStepTarget] = useState<{
    stepId: string;
    stepTitle: string;
    mode: FinishStepMode;
  } | null>(null);
  const [finishBusy, setFinishBusy] = useState(false);

  async function load() {
    if (!threadId) return;
    const data = await getInterviewThread(threadId);
    setThread(data);
    const notesStep = currentNotesStep(data.steps);
    if (notesStep) {
      setNotes(notesStep.prepNotes ?? "");
    } else {
      setNotes("");
    }
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [threadId]);

  useEffect(() => {
    if (searchParams.get("addStep") === "1") {
      setAddingStep(true);
      setSearchParams({}, { replace: true });
    }
  }, [searchParams, setSearchParams]);

  async function updateStep(stepId: string, body: Record<string, unknown>) {
    if (!threadId) return;
    setError(null);
    try {
      await patchInterviewStep(threadId, stepId, body);
      setStepConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update step");
    }
  }

  async function saveNotes(event: FormEvent) {
    event.preventDefault();
    const notesStep = thread ? currentNotesStep(thread.steps) : null;
    if (!notesStep) return;
    await updateStep(notesStep.id, { prepNotes: notes });
  }

  async function addStep(event: FormEvent) {
    event.preventDefault();
    if (!threadId || !newTitle.trim()) return;
    setError(null);
    try {
      await addInterviewStep(threadId, {
        kind: newKind,
        title: newTitle.trim(),
      });
      setNewTitle("");
      setAddingStep(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add step");
    }
  }

  async function resolveThread() {
    if (!threadId) return;
    setError(null);
    try {
      await patchInterviewThread(threadId, { status: "resolved" });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resolve thread");
    }
  }

  async function setPrimary(applicationId: string) {
    if (!threadId) return;
    setError(null);
    try {
      await patchInterviewThread(threadId, { primaryApplicationId: applicationId });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update primary role");
    }
  }

  function confirmStepAction(stepId: string, action: StepConfirmAction) {
    setStepConfirm({ stepId, action });
  }

  async function runFinishStep(result: FinishStepResult) {
    if (!threadId || !finishStepTarget) return;
    setFinishBusy(true);
    setError(null);
    try {
      const status = result.outcome === "waiting" ? "awaiting_employer" : "completed";
      await patchInterviewStep(threadId, finishStepTarget.stepId, { status });
      if (result.outcome === "round_done" && result.nextStep) {
        await addInterviewStep(threadId, result.nextStep);
      }
      setFinishStepTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish step");
    } finally {
      setFinishBusy(false);
    }
  }

  function runConfirmedAction() {
    if (!stepConfirm) return;
    void updateStep(stepConfirm.stepId, { status: "pending" });
  }

  if (!thread && error) return <p className="error">{error}</p>;
  if (!thread) return <p className="muted">Loading…</p>;

  const nextStep = thread.steps.find(stepIsActionable);
  const awaitingStep = thread.awaitingStep;
  const previousSteps = thread.steps.filter((s) => !stepIsActionable(s));
  const linkedRoles = formatLinkedRoles(thread);
  const deadlineLabel = nextStep ? stepDeadlineLabel(nextStep) : null;
  const deadlineIso = nextStep ? stepDeadlineIso(nextStep) : null;
  const canAddStep = !threadHasOpenStep(thread.steps);
  const notesStep = currentNotesStep(thread.steps);

  return (
    <article className="detail">
      <div className="interview-workspace-header">
        <div className="interview-workspace-header-main">
          <p><Link to="/interviews">← Interviews</Link></p>
          <h2>{thread.company ?? "Unknown"} · {thread.primaryTitle ?? "Untitled"}</h2>
          <p className="muted">
            {thread.status === "resolved"
              ? `Resolved · ${thread.resolution ?? "closed"}`
              : "Active interview process"}
          </p>
          {linkedRoles && <p className="interview-linked-roles muted">{linkedRoles}</p>}
        </div>
        {thread.status === "active" && (
          <button
            type="button"
            className="interview-cta-btn interview-cta-btn-resolve"
            onClick={() => void resolveThread()}
          >
            Resolve interview
          </button>
        )}
      </div>
      {error && <p className="error">{error}</p>}

      {previousSteps.length > 0 && (
        <div className="interview-history-block">
          <h3 className="interview-section-heading">Previous steps</h3>
          <ul className="interview-history-list">
            {previousSteps.map((step) => (
              <li key={step.id} className="interview-history-item">
                <div>
                  <strong>{step.title}</strong>
                  <span className="badge">{STEP_STATUS_LABEL[step.status] ?? step.status}</span>
                  {step.completedAt && (
                    <span className="muted"> · {formatDeadlineLong(step.completedAt)}</span>
                  )}
                </div>
                {step.notes && <p className="muted interview-history-notes">{step.notes}</p>}
                {thread.status === "active" && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => confirmStepAction(step.id, "reopen")}
                  >
                    Reopen step
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {nextStep && thread.status === "active" && (
        <div className="interview-next-hero">
          <div className="interview-next-hero-main">
            <h3 className="interview-section-heading">Next action</h3>
            <p className="interview-next-title">{nextStep.title}</p>
            {deadlineLabel && (
              <div className="interview-deadline-block">
                <div className="interview-deadline-date">{deadlineLabel}</div>
                {deadlineIso && <InterviewCountdown target={deadlineIso} />}
              </div>
            )}
            <div className="interview-next-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setFinishStepTarget({
                    stepId: nextStep.id,
                    stepTitle: nextStep.title,
                    mode: "actionable",
                  })
                }
              >
                Finish step
              </button>
            </div>
          </div>
          {nextStep.url && (
            <a
              className="interview-cta-btn interview-cta-btn-large"
              href={nextStep.url}
              target="_blank"
              rel="noreferrer"
            >
              {stepOpenLinkLabel(nextStep)}
              <span className="ext-icon" aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}

      {!nextStep && awaitingStep && thread.status === "active" && (
        <div className="interview-next-hero interview-awaiting-hero">
          <div className="interview-next-hero-main">
            <h3 className="interview-section-heading">Waiting on them</h3>
            <p className="interview-next-title">{awaitingStep.title}</p>
            <p className="muted interview-awaiting-hint">
              You finished your part on this step. When the employer responds, close it and
              add the next round.
            </p>
            <div className="interview-next-actions">
              <button
                type="button"
                className="secondary"
                onClick={() =>
                  setFinishStepTarget({
                    stepId: awaitingStep.id,
                    stepTitle: awaitingStep.title,
                    mode: "awaiting_response",
                  })
                }
              >
                They responded
              </button>
            </div>
          </div>
        </div>
      )}

      {!nextStep && thread.status === "active" && canAddStep && (
        <p className="muted">No active step. Add the next round below.</p>
      )}

      <div className="status-block">
        <h3 className="interview-section-heading">Linked roles</h3>
        <ul className="interview-members-list">
          {thread.members.map((member) => (
            <li key={member.id}>
              <span>
                {member.title ?? "Untitled"}
                <span className={`badge status-${member.status}`}>{member.status}</span>
                {member.id === thread.primaryApplicationId && (
                  <span className="badge">primary</span>
                )}
              </span>
              <span className="interview-member-actions">
                <Link to={`/applications/${member.id}`} className="external">
                  Application<span className="ext-icon" aria-hidden="true">↗</span>
                </Link>
                {member.id !== thread.primaryApplicationId && thread.status === "active" && (
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setPrimary(member.id)}
                  >
                    Make primary
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {thread.status === "active" && (
        <div className="status-block">
          <h3 className="interview-section-heading">Add next step</h3>
          {!canAddStep && (
            <p className="muted interview-add-step-hint">
              Finish the current step before adding another.
            </p>
          )}
          {canAddStep && addingStep ? (
            <form className="interview-add-step-form" onSubmit={addStep}>
              <label>
                Title
                <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} required />
              </label>
              <label>
                Type
                <select value={newKind} onChange={(e) => setNewKind(e.target.value)}>
                  {KIND_OPTIONS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
              </label>
              <div className="save-inline-row">
                <button type="submit">Add step</button>
                <button type="button" className="secondary" onClick={() => setAddingStep(false)}>
                  Cancel
                </button>
              </div>
            </form>
          ) : canAddStep ? (
            <button type="button" className="secondary" onClick={() => setAddingStep(true)}>
              Add step +
            </button>
          ) : null}
        </div>
      )}

      {notesStep && thread.status === "active" && (
        <form onSubmit={saveNotes}>
          <h3 className="interview-section-heading">Interview notes</h3>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          <div className="save-inline-row save-end">
            <button type="submit" className="secondary">Save notes</button>
          </div>
        </form>
      )}

      {finishStepTarget && (
        <ModalLayer
          className="modal modal-finish-step"
          onClose={() => {
            if (finishBusy) return;
            setFinishStepTarget(null);
          }}
        >
          <FinishInterviewStepModal
            stepTitle={finishStepTarget.stepTitle}
            mode={finishStepTarget.mode}
            busy={finishBusy}
            onCancel={() => setFinishStepTarget(null)}
            onFinish={runFinishStep}
          />
        </ModalLayer>
      )}

      {stepConfirm && (
        <ModalLayer className="modal" onClose={() => setStepConfirm(null)}>
          <StepActionConfirm
            title="Reopen this step?"
            description="This makes the step active again so you can update it or take action."
            confirmLabel="Reopen step"
            onCancel={() => setStepConfirm(null)}
            onConfirm={runConfirmedAction}
          />
        </ModalLayer>
      )}
    </article>
  );
}
