import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  addInterviewStep,
  getInterviews,
  patchInterviewStep,
  type InterviewThreadListItem,
} from "../api";
import FinishInterviewStepModal, {
  type FinishStepMode,
  type FinishStepResult,
} from "../FinishInterviewStepModal";
import InterviewCountdown from "../InterviewCountdown";
import ModalLayer from "../ModalLayer";
import {
  formatLinkedRoles,
  stepDeadlineIso,
  stepDeadlineLabel,
  stepActionLabel,
  stepOpenLinkLabel,
} from "../interviewStepUi";
import { formatStepWhen } from "../formatDate";
import AddInterviewModal, { type AddInterviewModalHandle } from "./AddInterviewModal";

const VIEW_TABS = ["active", "past"] as const;

type FinishStepTarget = {
  threadId: string;
  stepId: string;
  stepTitle: string;
  mode: FinishStepMode;
};

type ThreadCardProps = {
  row: InterviewThreadListItem;
  showQuickActions: boolean;
  showAwaitingFollowUp: boolean;
  showAddStep: boolean;
  onFinishStep: (target: FinishStepTarget) => void;
  onAddStep: (threadId: string) => void;
  pendingAction: string | null;
};

function ThreadCard({
  row,
  showQuickActions,
  showAwaitingFollowUp,
  showAddStep,
  onFinishStep,
  onAddStep,
  pendingAction,
}: ThreadCardProps) {
  const linked = formatLinkedRoles(row);
  const step = row.nextStep;
  const awaitingStep = row.awaitingStep;
  const deadlineLabel = stepDeadlineLabel(step);
  const deadlineIso = stepDeadlineIso(step);
  const busy = pendingAction === row.id;

  return (
    <article className="card interview-card">
      <div className="interview-card-body">
        <Link className="interview-card-title" to={`/interviews/${row.id}`}>
          <h2>{row.company ?? "Unknown"} · {row.primaryTitle ?? "Untitled"}</h2>
        </Link>
        {linked && <p className="interview-linked-roles muted">{linked}</p>}
        {step && (
          <p className="interview-active-step">
            <span className="interview-active-step-label">Active step</span>
            {stepActionLabel(step)}
          </p>
        )}
        {awaitingStep && !step && (
          <p className="interview-active-step">
            <span className="interview-active-step-label">Waiting on them</span>
            {stepActionLabel(awaitingStep)}
          </p>
        )}
        {deadlineLabel && (
          <div className="interview-deadline-block">
            <div className="interview-deadline-date">{deadlineLabel}</div>
            {deadlineIso && showQuickActions && <InterviewCountdown target={deadlineIso} />}
          </div>
        )}
        {!step && !awaitingStep && <p className="muted">No active step</p>}
      </div>
      {showQuickActions && step && (
        <div className="interview-card-actions">
          <div className="interview-card-actions-group">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                onFinishStep({
                  threadId: row.id,
                  stepId: step.id,
                  stepTitle: step.title,
                  mode: "actionable",
                })
              }
            >
              Finish step
            </button>
          </div>
          {step.url && (
            <a
              className="interview-cta-btn"
              href={step.url}
              target="_blank"
              rel="noreferrer"
            >
              {stepOpenLinkLabel(step)}
              <span className="ext-icon" aria-hidden="true">↗</span>
            </a>
          )}
        </div>
      )}
      {showAwaitingFollowUp && awaitingStep && (
        <div className="interview-card-actions interview-card-actions-awaiting">
          <div className="interview-card-actions-group">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() =>
                onFinishStep({
                  threadId: row.id,
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
      )}
      {showAddStep && (
        <div className="interview-card-actions interview-card-actions-add">
          <button
            type="button"
            className="secondary"
            disabled={busy}
            onClick={() => onAddStep(row.id)}
          >
            Add next step
          </button>
        </div>
      )}
    </article>
  );
}

export default function Interviews() {
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "past" ? "past" : "active";
  const navigate = useNavigate();
  const [actionRequired, setActionRequired] = useState<InterviewThreadListItem[]>([]);
  const [awaiting, setAwaiting] = useState<InterviewThreadListItem[]>([]);
  const [past, setPast] = useState<InterviewThreadListItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [finishStepTarget, setFinishStepTarget] = useState<FinishStepTarget | null>(null);
  const addFormRef = useRef<AddInterviewModalHandle>(null);

  async function load() {
    const data = await getInterviews(view);
    setActionRequired(data.actionRequired);
    setAwaiting(data.awaiting);
    setPast(data.past);
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [view]);

  useEffect(() => {
    if (!adding) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") addFormRef.current?.requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding]);

  function requestCloseAdd() {
    addFormRef.current?.requestClose();
  }

  async function runFinishStep(result: FinishStepResult) {
    if (!finishStepTarget) return;
    setPendingAction(finishStepTarget.threadId);
    setError(null);
    try {
      const status = result.outcome === "waiting" ? "awaiting_employer" : "completed";
      await patchInterviewStep(finishStepTarget.threadId, finishStepTarget.stepId, { status });
      if (result.outcome === "round_done" && result.nextStep) {
        await addInterviewStep(finishStepTarget.threadId, result.nextStep);
      }
      setFinishStepTarget(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not finish step");
    } finally {
      setPendingAction(null);
    }
  }

  function openAddStep(threadId: string) {
    navigate(`/interviews/${threadId}?addStep=1`);
  }

  return (
    <section>
      <div className="tabs-row">
        <div className="tabs">
          {VIEW_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === view ? "tab on" : "tab"}
              onClick={() => setParams(tab === "active" ? {} : { view: tab })}
            >
              <span className="tab-label">{tab}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAdding(true)}>Add interview +</button>
      </div>
      {error && <p className="error">{error}</p>}
      {view === "active" && (
        <>
          <h3 className="interview-section-heading">Action required</h3>
          {actionRequired.length === 0 && (
            <p className="muted">Nothing needs your attention right now.</p>
          )}
          {actionRequired.map((row) => (
            <ThreadCard
              key={row.id}
              row={row}
              showQuickActions
              showAwaitingFollowUp={false}
              showAddStep={false}
              pendingAction={pendingAction}
              onFinishStep={setFinishStepTarget}
              onAddStep={openAddStep}
            />
          ))}
          <hr className="interview-section-divider" />
          <h3 className="interview-section-heading">Awaiting</h3>
          {awaiting.length === 0 && (
            <p className="muted">No roles waiting on the employer.</p>
          )}
          {awaiting.map((row) => (
            <ThreadCard
              key={row.id}
              row={row}
              showQuickActions={false}
              showAwaitingFollowUp={!!row.awaitingStep}
              showAddStep={row.canAddStep}
              pendingAction={pendingAction}
              onFinishStep={setFinishStepTarget}
              onAddStep={openAddStep}
            />
          ))}
        </>
      )}
      {view === "past" && (
        <>
          <h3 className="interview-section-heading">Past interviews</h3>
          {past.length === 0 && <p className="muted">No resolved interviews yet.</p>}
          {past.map((row) => (
            <article key={row.id} className="card interview-card">
              <Link className="interview-card-title" to={`/interviews/${row.id}`}>
                <h2>{row.company ?? "Unknown"} · {row.primaryTitle ?? "Untitled"}</h2>
              </Link>
              <p className="muted">
                {row.resolution ? `Resolved · ${row.resolution}` : "Resolved"}
                {row.resolvedAt && ` · ${formatStepWhen(row.resolvedAt)}`}
              </p>
            </article>
          ))}
        </>
      )}
      {finishStepTarget && (
        <ModalLayer
          className="modal modal-finish-step"
          onClose={() => {
            if (pendingAction === finishStepTarget.threadId) return;
            setFinishStepTarget(null);
          }}
        >
          <FinishInterviewStepModal
            stepTitle={finishStepTarget.stepTitle}
            mode={finishStepTarget.mode}
            busy={pendingAction === finishStepTarget.threadId}
            onCancel={() => setFinishStepTarget(null)}
            onFinish={runFinishStep}
          />
        </ModalLayer>
      )}
      {adding && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) requestCloseAdd();
          }}
        >
          <div
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="add-interview-title"
          >
            <AddInterviewModal
              ref={addFormRef}
              onCreated={(threadId) => {
                setAdding(false);
                navigate(`/interviews/${threadId}`);
              }}
              onCancel={() => setAdding(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
