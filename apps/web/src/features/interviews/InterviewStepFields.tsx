import { combineDateAndTime, toDateInputValue, toTimeInputValue } from "../../formatDate";
import type { InterviewStep } from "../../api";

export const STEP_TYPE_OPTIONS = [
  { value: "assessment", label: "Assessment", mode: "due" as const },
  { value: "phone", label: "Phone screen", mode: "scheduled" as const },
  { value: "technical", label: "Technical", mode: "scheduled" as const },
  { value: "onsite", label: "Onsite", mode: "scheduled" as const },
  { value: "offer", label: "Offer", mode: "scheduled" as const },
  { value: "custom", label: "Custom", mode: "due" as const },
];

export type InterviewStepFieldValues = {
  title: string;
  kind: string;
  dueDate: string;
  dueTime: string;
  scheduledDate: string;
  scheduledTime: string;
  url: string;
  notes: string;
};

export function stepScheduleMode(kind: string): "due" | "scheduled" {
  const opt = STEP_TYPE_OPTIONS.find((o) => o.value === kind);
  return opt?.mode ?? "due";
}

export function emptyInterviewStepFields(kind = "technical"): InterviewStepFieldValues {
  return {
    title: "",
    kind,
    dueDate: "",
    dueTime: "",
    scheduledDate: "",
    scheduledTime: "",
    url: "",
    notes: "",
  };
}

export function interviewStepToFields(step: InterviewStep): InterviewStepFieldValues {
  return {
    title: step.title,
    kind: step.kind,
    dueDate: toDateInputValue(step.dueAt),
    dueTime: toTimeInputValue(step.dueAt),
    scheduledDate: toDateInputValue(step.scheduledAt),
    scheduledTime: toTimeInputValue(step.scheduledAt),
    url: step.url ?? "",
    notes: step.notes ?? "",
  };
}

export function interviewStepFieldsToPayload(fields: InterviewStepFieldValues) {
  const mode = stepScheduleMode(fields.kind);
  return {
    kind: fields.kind,
    title: fields.title.trim(),
    dueAt: mode === "due" ? combineDateAndTime(fields.dueDate, fields.dueTime) : null,
    scheduledAt:
      mode === "scheduled"
        ? combineDateAndTime(fields.scheduledDate, fields.scheduledTime)
        : null,
    url: fields.url.trim() || null,
    notes: fields.notes.trim() || null,
  };
}

type Props = {
  values: InterviewStepFieldValues;
  onChange: (next: InterviewStepFieldValues) => void;
  titleError?: string;
  titleId?: string;
  disabled?: boolean;
  showNotes?: boolean;
  titleLabel?: string;
};

export default function InterviewStepFields({
  values,
  onChange,
  titleError,
  titleId = "step-title-error",
  disabled = false,
  showNotes = true,
  titleLabel = "Title",
}: Props) {
  const scheduleMode = stepScheduleMode(values.kind);

  function patch(partial: Partial<InterviewStepFieldValues>) {
    onChange({ ...values, ...partial });
  }

  return (
    <>
      <div className="form-field">
        <label>
          <span className="form-field-label">
            Type <span className="required-mark" aria-hidden="true">*</span>
          </span>
          <select
            value={values.kind}
            disabled={disabled}
            onChange={(event) => patch({ kind: event.target.value })}
            required
          >
            {STEP_TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={`form-field ${titleError ? "field-invalid" : ""}`}>
        <label>
          <span className="form-field-label">
            {titleLabel} <span className="required-mark" aria-hidden="true">*</span>
          </span>
          <input
            value={values.title}
            disabled={disabled}
            onChange={(event) => patch({ title: event.target.value })}
            placeholder="CodeSignal, HM chat, …"
            aria-invalid={Boolean(titleError)}
            aria-describedby={titleError ? titleId : undefined}
            required
          />
        </label>
        {titleError && (
          <p className="field-error-message" id={titleId} role="alert">
            {titleError}
          </p>
        )}
      </div>

      {scheduleMode === "due" ? (
        <div className="interview-datetime-row">
          <label>
            <span className="form-field-label">Due date</span>
            <input
              type="date"
              value={values.dueDate}
              disabled={disabled}
              onChange={(event) => patch({ dueDate: event.target.value })}
            />
          </label>
          <label>
            <span className="form-field-label">Due time</span>
            <input
              type="time"
              value={values.dueTime}
              disabled={disabled}
              onChange={(event) => patch({ dueTime: event.target.value })}
            />
          </label>
        </div>
      ) : (
        <div className="interview-datetime-row">
          <label>
            <span className="form-field-label">Scheduled date</span>
            <input
              type="date"
              value={values.scheduledDate}
              disabled={disabled}
              onChange={(event) => patch({ scheduledDate: event.target.value })}
            />
          </label>
          <label>
            <span className="form-field-label">Scheduled time</span>
            <input
              type="time"
              value={values.scheduledTime}
              disabled={disabled}
              onChange={(event) => patch({ scheduledTime: event.target.value })}
            />
          </label>
        </div>
      )}

      <label>
        <span className="form-field-label">Link</span>
        <input
          type="url"
          value={values.url}
          disabled={disabled}
          onChange={(event) => patch({ url: event.target.value })}
          placeholder={
            scheduleMode === "due"
              ? "Assessment or portal URL"
              : "Meeting or calendar URL"
          }
        />
      </label>
      {showNotes && (
        <label>
          <span className="form-field-label">Notes</span>
          <textarea
            value={values.notes}
            disabled={disabled}
            onChange={(event) => patch({ notes: event.target.value })}
            rows={3}
          />
        </label>
      )}
    </>
  );
}
