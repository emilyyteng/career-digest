import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  addInterviewStep,
  getInterviews,
  patchInterviewStep,
  type InterviewThreadListItem,
} from "../api";
import InterviewCountdown from "../InterviewCountdown";
import {
  formatLinkedRoles,
  stepDeadlineIso,
  stepDeadlineLabel,
  stepActionLabel,
  stepOpenLinkLabel,
} from "../interviewStepUi";
import { formatStepWhen } from "../formatDate";
import StepActionConfirm from "../StepActionConfirm";
import AddInterviewModal, { type AddInterviewModalHandle } from "./AddInterviewModal";

const VIEW_TABS = ["active", "past"] as const;

type StepConfirm = {
  threadId: string;
  stepId: string;
};

type ThreadCardProps = {
  row: InterviewThreadListItem;
  showQuickActions: boolean;
  showAddStep: boolean;
  onAction: (confirm: StepConfirm) => void;
  onAddStep: (threadId: string) => void;
  pendingAction: string | null;
};

function ThreadCard({
  row,
  showQuickActions,
  showAddStep,
  onAction,
  onAddStep,
  pendingAction,
}: ThreadCardProps) {
  const linked = formatLinkedRoles(row);
  const step = row.nextStep;
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
        {deadlineLabel && (
          <div className="interview-deadline-block">
            <div className="interview-deadline-date">{deadlineLabel}</div>
            {deadlineIso && showQuickActions && <InterviewCountdown target={deadlineIso} />}
          </div>
        )}
        {!step && <p className="muted">No active step</p>}
      </div>
      {showQuickActions && step && (
        <div className="interview-card-actions">
          <div className="interview-card-actions-group">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => onAction({ threadId: row.id, stepId: step.id })}
            >
              Mark complete
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
  const [stepConfirm, setStepConfirm] = useState<StepConfirm | null>(null);
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

  async function runStepAction(confirm: StepConfirm) {
    setPendingAction(confirm.threadId);
    setError(null);
    try {
      await patchInterviewStep(confirm.threadId, confirm.stepId, {
        status: "completed",
      });
      setStepConfirm(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update step");
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
              showAddStep={false}
              pendingAction={pendingAction}
              onAction={setStepConfirm}
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
              showAddStep={row.canAddStep}
              pendingAction={pendingAction}
              onAction={setStepConfirm}
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
      {stepConfirm && (
        <div className="modal-backdrop">
          <div className="modal" role="dialog" aria-modal="true">
            <StepActionConfirm
              title="Mark step complete?"
              description="This closes the current round. You can reopen it from the interview page if needed."
              confirmLabel="Mark complete"
              onCancel={() => setStepConfirm(null)}
              onConfirm={() => void runStepAction(stepConfirm)}
            />
          </div>
        </div>
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
