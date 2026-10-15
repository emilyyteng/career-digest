import { useState } from "react";
import OptionalPanel from "../completion/OptionalPanel";
import ReflectionDraftFields, {
  MinutesField,
  emptyReflectionDraft,
  minutesInputFromDraft,
  parseMinutesInput,
  type ReflectionDraft,
} from "../completion/ReflectionDraftFields";
import InterviewStepFields, {
  emptyInterviewStepFields,
  interviewStepFieldsToPayload,
  type InterviewStepFieldValues,
} from "./InterviewStepFields";
import { Button } from "../../ui";

export type FinishStepOutcome = "waiting" | "round_done";

export type FinishStepMode = "actionable" | "awaiting_response";

export type FinishStepResult = {
  outcome: FinishStepOutcome;
  nextStep?: ReturnType<typeof interviewStepFieldsToPayload>;
  reflection: ReflectionDraft | null;
  /** The step's actual time; blank → null. */
  actualMinutes: number | null;
};

type Props = {
  stepTitle: string;
  mode?: FinishStepMode;
  /** The step's saved time, when it's being finished again after a reopen. */
  initialActualMinutes?: number | null;
  onCancel: () => void;
  onFinish: (result: FinishStepResult) => void | Promise<void>;
  busy?: boolean;
};

type DiscardTarget = "reflection" | null;

export default function FinishInterviewStepModal({
  stepTitle,
  mode = "actionable",
  initialActualMinutes = null,
  onCancel,
  onFinish,
  busy = false,
}: Props) {
  const awaitingResponse = mode === "awaiting_response";
  const [page, setPage] = useState<1 | 2>(1);
  const [outcome, setOutcome] = useState<FinishStepOutcome>("waiting");
  const [addNextStep, setAddNextStep] = useState(awaitingResponse);
  const [nextFields, setNextFields] = useState<InterviewStepFieldValues>(() =>
    emptyInterviewStepFields("technical"),
  );
  const [reflectionOn, setReflectionOn] = useState(true);
  const [reflection, setReflection] = useState<ReflectionDraft>(() =>
    emptyReflectionDraft("application"),
  );
  const [actualTime, setActualTime] = useState(() =>
    minutesInputFromDraft(initialActualMinutes),
  );
  const [discardTarget, setDiscardTarget] = useState<DiscardTarget>(null);

  const nextStepInvalid =
    (awaitingResponse || outcome === "round_done") &&
    addNextStep &&
    !nextFields.title.trim();

  function buildPage1Result(): Omit<FinishStepResult, "reflection" | "actualMinutes"> {
    const resolvedOutcome: FinishStepOutcome = awaitingResponse
      ? "round_done"
      : outcome;
    const result: Omit<FinishStepResult, "reflection" | "actualMinutes"> = {
      outcome: resolvedOutcome,
    };
    if (resolvedOutcome === "round_done" && addNextStep && nextFields.title.trim()) {
      result.nextStep = interviewStepFieldsToPayload(nextFields);
    }
    return result;
  }

  async function submitFinish(includeReflection: boolean) {
    const base = buildPage1Result();
    const reflectionOut =
      includeReflection && reflectionOn && reflection.body.trim()
        ? { body: reflection.body.trim(), lane: reflection.lane }
        : null;
    await onFinish({
      ...base,
      reflection: reflectionOut,
      actualMinutes: parseMinutesInput(actualTime),
    });
  }

  function tryFinish() {
    if (busy) return;
    if (!reflectionOn && reflection.body.trim() !== "") {
      setDiscardTarget("reflection");
      return;
    }
    void submitFinish(true);
  }

  return (
    <div
      className="step-action-confirm finish-step-modal"
      role="dialog"
      aria-labelledby="finish-step-title"
      aria-describedby="finish-step-desc"
    >
      {page === 1 ? (
        <>
          <h3 id="finish-step-title">
            {awaitingResponse ? "They responded?" : "Finish step"}
          </h3>
          <p id="finish-step-desc" className="muted finish-step-context">
            <strong>{stepTitle}</strong>
          </p>
          {awaitingResponse ? (
            <p className="muted finish-step-awaiting-lede">
              Close this waiting step and move the process forward. You can add the next
              round now or finish without scheduling yet.
            </p>
          ) : (
            <fieldset className="finish-step-options">
              <legend className="finish-step-legend">What happens next?</legend>
              <label
                className={`finish-step-option${outcome === "waiting" ? " selected" : ""}`}
              >
                <input
                  type="radio"
                  name="finish-step-outcome"
                  value="waiting"
                  checked={outcome === "waiting"}
                  disabled={busy}
                  onChange={() => {
                    setOutcome("waiting");
                    setAddNextStep(false);
                  }}
                />
                <span className="finish-step-option-text">
                  <span className="finish-step-option-label">Waiting on them</span>
                  <span className="muted finish-step-option-hint">
                    You finished your part (e.g. submitted an assessment). The employer
                    needs to respond before the next round.
                  </span>
                </span>
              </label>
              <label
                className={`finish-step-option${
                  outcome === "round_done" ? " selected" : ""
                }`}
              >
                <input
                  type="radio"
                  name="finish-step-outcome"
                  value="round_done"
                  checked={outcome === "round_done"}
                  disabled={busy}
                  onChange={() => setOutcome("round_done")}
                />
                <span className="finish-step-option-text">
                  <span className="finish-step-option-label">Round done</span>
                  <span className="muted finish-step-option-hint">
                    This round is finished and you&apos;re ready to move on (e.g.
                    recruiter call went well).
                  </span>
                </span>
              </label>
            </fieldset>
          )}
          {(awaitingResponse || outcome === "round_done") && (
            <div className="finish-step-add-block">
              <label className="finish-step-add-toggle">
                <input
                  type="checkbox"
                  checked={addNextStep}
                  disabled={busy}
                  onChange={(event) => setAddNextStep(event.target.checked)}
                />
                <span>Add next step now</span>
              </label>
              {addNextStep && (
                <div className="finish-step-add-fields">
                  <InterviewStepFields
                    values={nextFields}
                    onChange={setNextFields}
                    disabled={busy}
                    titleLabel="Next step title"
                    titleId="finish-next-title-error"
                  />
                </div>
              )}
            </div>
          )}
          <div className="form-actions">
            <button type="button" className="secondary" disabled={busy} onClick={onCancel}>
              Cancel
            </button>
            <button
              type="button"
              className="modal-confirm-btn"
              disabled={busy || nextStepInvalid}
              onClick={() => setPage(2)}
            >
              Next
            </button>
          </div>
        </>
      ) : (
        <>
          <h3 id="finish-step-title">Reflection and time</h3>
          <p id="finish-step-desc" className="muted finish-step-context">
            Both optional for <strong>{stepTitle}</strong>
          </p>
          <OptionalPanel
            label="Reflection"
            enabled={reflectionOn}
            onEnabledChange={setReflectionOn}
            disabled={busy}
          >
            <ReflectionDraftFields
              value={reflection}
              onChange={setReflection}
              disabled={busy}
            />
          </OptionalPanel>
          <MinutesField value={actualTime} onChange={setActualTime} disabled={busy} />
          <div className="form-actions">
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => setPage(1)}
            >
              Back
            </button>
            <button
              type="button"
              className="modal-confirm-btn"
              disabled={
                busy || (reflectionOn && reflection.body.trim() === "")
              }
              onClick={tryFinish}
            >
              {busy
                ? "Saving…"
                : awaitingResponse
                  ? "Close step"
                  : "Finish step"}
            </button>
          </div>
        </>
      )}

      {discardTarget && (
        <div
          className="modal-backdrop modal-backdrop-nested"
          onPointerDown={(event) => event.stopPropagation()}
          onPointerUp={(event) => event.stopPropagation()}
        >
          <div className="modal modal-compact" role="alertdialog" aria-modal="true">
            <h3>Discard reflection?</h3>
            <p className="muted">
              Reflection is collapsed but still has text. Discard it to finish, or keep
              editing.
            </p>
            <div className="form-actions">
              <Button
                type="button"
                onClick={() => {
                  setReflectionOn(true);
                  setDiscardTarget(null);
                }}
              >
                Keep editing
              </Button>
              <Button
                type="button"
                variant="primary"
                onClick={() => {
                  setDiscardTarget(null);
                  void submitFinish(false);
                }}
              >
                Discard
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
