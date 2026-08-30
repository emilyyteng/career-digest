import { useState } from "react";

const KIND_OPTIONS = [
  "assessment",
  "phone",
  "technical",
  "onsite",
  "offer",
  "custom",
] as const;

export type FinishStepOutcome = "waiting" | "round_done";

export type FinishStepResult = {
  outcome: FinishStepOutcome;
  nextStep?: { title: string; kind: string };
};

type Props = {
  stepTitle: string;
  onCancel: () => void;
  onFinish: (result: FinishStepResult) => void | Promise<void>;
  busy?: boolean;
};

export default function FinishInterviewStepModal({
  stepTitle,
  onCancel,
  onFinish,
  busy = false,
}: Props) {
  const [outcome, setOutcome] = useState<FinishStepOutcome>("round_done");
  const [addNextStep, setAddNextStep] = useState(false);
  const [nextTitle, setNextTitle] = useState("");
  const [nextKind, setNextKind] = useState<string>("technical");

  const nextStepInvalid = outcome === "round_done" && addNextStep && !nextTitle.trim();

  async function submit() {
    if (nextStepInvalid) return;
    const result: FinishStepResult = { outcome };
    if (outcome === "round_done" && addNextStep && nextTitle.trim()) {
      result.nextStep = { title: nextTitle.trim(), kind: nextKind };
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
      <h3 id="finish-step-title">Finish step</h3>
      <p id="finish-step-desc" className="muted finish-step-context">
        <strong>{stepTitle}</strong>
      </p>
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
      {outcome === "round_done" && (
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
              <label>
                Next step title
                <input
                  value={nextTitle}
                  disabled={busy}
                  onChange={(event) => setNextTitle(event.target.value)}
                  placeholder="e.g. Technical interview"
                />
              </label>
              <label>
                Type
                <select
                  value={nextKind}
                  disabled={busy}
                  onChange={(event) => setNextKind(event.target.value)}
                >
                  {KIND_OPTIONS.map((kind) => (
                    <option key={kind} value={kind}>{kind}</option>
                  ))}
                </select>
              </label>
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
          {busy ? "Saving…" : "Finish step"}
        </button>
      </div>
    </div>
  );
}
