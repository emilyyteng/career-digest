import { useState } from "react";
import InterviewStepFields, {
  emptyInterviewStepFields,
  interviewStepFieldsToPayload,
  type InterviewStepFieldValues,
} from "./InterviewStepFields";

export type FinishStepOutcome = "waiting" | "round_done";

export type FinishStepMode = "actionable" | "awaiting_response";

export type FinishStepResult = {
  outcome: FinishStepOutcome;
  nextStep?: ReturnType<typeof interviewStepFieldsToPayload>;
};

type Props = {
  stepTitle: string;
  mode?: FinishStepMode;
  onCancel: () => void;
  onFinish: (result: FinishStepResult) => void | Promise<void>;
  busy?: boolean;
};

export default function FinishInterviewStepModal({
  stepTitle,
  mode = "actionable",
  onCancel,
  onFinish,
  busy = false,
}: Props) {
  const awaitingResponse = mode === "awaiting_response";
  const [outcome, setOutcome] = useState<FinishStepOutcome>("waiting");
  const [addNextStep, setAddNextStep] = useState(awaitingResponse);
  const [nextFields, setNextFields] = useState<InterviewStepFieldValues>(() =>
    emptyInterviewStepFields("technical"),
  );

  const nextStepInvalid =
    (awaitingResponse || outcome === "round_done") &&
    addNextStep &&
    !nextFields.title.trim();

  async function submit() {
    if (nextStepInvalid) return;
    const resolvedOutcome: FinishStepOutcome = awaitingResponse ? "round_done" : outcome;
    const result: FinishStepResult = { outcome: resolvedOutcome };
    if (resolvedOutcome === "round_done" && addNextStep && nextFields.title.trim()) {
      result.nextStep = interviewStepFieldsToPayload(nextFields);
    }
    await onFinish(result);
  }

  return (
    <div
      className="step-action-confirm finish-step-modal"
      role="dialog"
      aria-labelledby="finish-step-title"
      aria-describedby="finish-step-desc"
    >
      <h3 id="finish-step-title">
        {awaitingResponse ? "They responded?" : "Finish step"}
      </h3>
      <p id="finish-step-desc" className="muted finish-step-context">
        <strong>{stepTitle}</strong>
      </p>
      {awaitingResponse ? (
        <p className="muted finish-step-awaiting-lede">
          Close this waiting step and move the process forward. You can add the next round
          now or finish without scheduling yet.
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
                You finished your part (e.g. submitted an assessment). The employer needs to
                respond before the next round.
              </span>
            </span>
          </label>
          <label
            className={`finish-step-option${outcome === "round_done" ? " selected" : ""}`}
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
                This round is finished and you&apos;re ready to move on (e.g. recruiter call
                went well).
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
          onClick={() => void submit()}
        >
          {busy
            ? "Saving…"
            : awaitingResponse
              ? "Close step"
              : "Finish step"}
        </button>
      </div>
    </div>
  );
}
