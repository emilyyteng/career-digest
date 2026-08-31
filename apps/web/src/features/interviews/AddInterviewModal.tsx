import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import {
  createInterview,
  getInterviewPickerApplications,
  type InterviewPickerApplication,
} from "../../api";
import { combineDateAndTime } from "../../formatDate";

const TYPE_OPTIONS = [
  { value: "assessment", label: "Assessment", mode: "due" as const },
  { value: "phone", label: "Phone screen", mode: "scheduled" as const },
  { value: "technical", label: "Technical", mode: "scheduled" as const },
  { value: "onsite", label: "Onsite", mode: "scheduled" as const },
  { value: "offer", label: "Offer", mode: "scheduled" as const },
  { value: "custom", label: "Custom", mode: "due" as const },
];

type FieldErrors = {
  applications?: string;
  title?: string;
};

type Props = {
  onCreated: (threadId: string) => void;
  onCancel?: () => void;
};

export type AddInterviewModalHandle = {
  requestClose: () => void;
};

function typeMode(kind: string): "due" | "scheduled" {
  const opt = TYPE_OPTIONS.find((o) => o.value === kind);
  return opt?.mode ?? "due";
}

const AddInterviewModal = forwardRef<AddInterviewModalHandle, Props>(
  function AddInterviewModal({ onCreated, onCancel }, ref) {
  const [apps, setApps] = useState<InterviewPickerApplication[]>([]);
  const [selected, setSelected] = useState<InterviewPickerApplication[]>([]);
  const [kind, setKind] = useState("assessment");
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [scheduledDate, setScheduledDate] = useState("");
  const [scheduledTime, setScheduledTime] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [saving, setSaving] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const scheduleMode = typeMode(kind);

  const dirty =
    selected.length > 0 ||
    kind !== "assessment" ||
    title.trim() !== "" ||
    dueDate !== "" ||
    dueTime !== "" ||
    scheduledDate !== "" ||
    scheduledTime !== "" ||
    url.trim() !== "" ||
    notes.trim() !== "";

  function requestClose() {
    if (!onCancel) return;
    if (confirmDiscard) return;
    if (!dirty) {
      onCancel();
      return;
    }
    setConfirmDiscard(true);
  }

  useImperativeHandle(ref, () => ({ requestClose }), [confirmDiscard, dirty, onCancel]);

  useEffect(() => {
    if (!confirmDiscard) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setConfirmDiscard(false);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [confirmDiscard]);

  useEffect(() => {
    getInterviewPickerApplications()
      .then((data) => setApps(data.applications))
      .catch((err: Error) => setLoadError(err.message));
  }, []);

  useEffect(() => {
    function onDocMouseDown(event: MouseEvent) {
      if (!pickerRef.current?.contains(event.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  const selectedIds = useMemo(() => new Set(selected.map((a) => a.id)), [selected]);

  const availableApps = useMemo(() => {
    const q = query.trim().toLowerCase();
    return apps.filter((app) => {
      if (selectedIds.has(app.id)) return false;
      if (!q) return true;
      const company = (app.company ?? "").toLowerCase();
      const role = (app.title ?? "").toLowerCase();
      return company.includes(q) || role.includes(q);
    });
  }, [apps, query, selectedIds]);

  const hasAppliedSelected = selected.some((app) => app.status === "applied");

  function addApp(app: InterviewPickerApplication) {
    setSelected((current) => [...current, app]);
    setQuery("");
    setPickerOpen(false);
    if (fieldErrors.applications) {
      setFieldErrors((e) => ({ ...e, applications: undefined }));
    }
  }

  function removeApp(id: string) {
    setSelected((current) => current.filter((app) => app.id !== id));
  }

  function validate(): FieldErrors {
    const errors: FieldErrors = {};
    if (selected.length === 0) {
      errors.applications = "Select at least one application.";
    }
    if (!title.trim()) {
      errors.title = "Title is required.";
    }
    return errors;
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const errors = validate();
    if (errors.applications || errors.title) {
      setFieldErrors(errors);
      setSubmitError(null);
      return;
    }
    setSaving(true);
    setSubmitError(null);
    setFieldErrors({});
    try {
      const dueAt =
        scheduleMode === "due" ? combineDateAndTime(dueDate, dueTime) : null;
      const scheduledAt =
        scheduleMode === "scheduled"
          ? combineDateAndTime(scheduledDate, scheduledTime)
          : null;
      const applicationIds = selected.map((a) => a.id);
      const created = await createInterview({
        applicationIds,
        primaryApplicationId: applicationIds[0],
        step: {
          kind,
          title: title.trim(),
          dueAt,
          scheduledAt,
          url: url.trim() || null,
          notes: notes.trim() || null,
        },
      });
      onCreated(created.id);
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  if (confirmDiscard) {
    return (
      <div
        className="discard-confirm"
        role="alertdialog"
        aria-labelledby="add-interview-title"
        aria-describedby="add-interview-discard-desc"
      >
        <h2 id="add-interview-title">Discard this interview?</h2>
        <p id="add-interview-discard-desc" className="muted lede">
          You have unsaved changes. Closing will throw them away.
        </p>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={() => setConfirmDiscard(false)}>
            Keep editing
          </button>
          <button type="button" onClick={() => onCancel?.()}>
            Discard
          </button>
        </div>
      </div>
    );
  }

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <h2 id="add-interview-title">Add interview</h2>
      <p className="lede muted">
        Link one or more applications to this interview process. Applied roles will move to
        interviewing when you save.
      </p>
      {loadError && <p className="error">{loadError}</p>}
      {submitError && <p className="error">{submitError}</p>}
      {hasAppliedSelected && (
        <p className="save-flash" role="status">
          Selected applied role(s) will be marked interviewing on save.
        </p>
      )}

      <div
        className={`form-field ${fieldErrors.applications ? "field-invalid" : ""}`}
        ref={pickerRef}
      >
        <span className="form-field-label">
          Applications <span className="required-mark" aria-hidden="true">*</span>
        </span>
        {apps.length === 0 ? (
          <p className="muted">No applied or interviewing applications available.</p>
        ) : (
          <div className="interview-app-picker">
            {selected.length > 0 && (
              <div className="interview-app-chips" aria-label="Selected applications">
                {selected.map((app) => (
                  <span key={app.id} className="interview-app-chip">
                    <span className="interview-app-chip-text">
                      {app.company ?? "Unknown"} · {app.title ?? "Untitled"}
                    </span>
                    <span className={`badge status-${app.status}`}>{app.status}</span>
                    <button
                      type="button"
                      className="chip-remove"
                      aria-label={`Remove ${app.company} ${app.title}`}
                      onClick={() => removeApp(app.id)}
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            )}
            <div className="suggest">
              <input
                type="text"
                value={query}
                placeholder="Search and add applications…"
                aria-invalid={Boolean(fieldErrors.applications)}
                aria-describedby={fieldErrors.applications ? "applications-error" : undefined}
                onFocus={() => setPickerOpen(true)}
                onChange={(event) => {
                  setQuery(event.target.value);
                  setPickerOpen(true);
                }}
              />
              {pickerOpen && availableApps.length > 0 && (
                <ul className="suggest-list interview-app-suggest" role="listbox">
                  {availableApps.map((app) => (
                    <li key={app.id} role="option">
                      <button
                        type="button"
                        className="suggest-option interview-app-option"
                        onClick={() => addApp(app)}
                      >
                        <span>
                          {app.company ?? "Unknown"} · {app.title ?? "Untitled"}
                        </span>
                        <span className={`badge status-${app.status}`}>{app.status}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {pickerOpen && availableApps.length === 0 && query.trim() && (
                <p className="muted interview-app-empty">No matching applications.</p>
              )}
            </div>
          </div>
        )}
        {fieldErrors.applications && (
          <p className="field-error-message" id="applications-error" role="alert">
            {fieldErrors.applications}
          </p>
        )}
      </div>

      <div className="form-field">
        <label>
          <span className="form-field-label">
            Type <span className="required-mark" aria-hidden="true">*</span>
          </span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value)}
            required
          >
            {TYPE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </label>
      </div>

      <div className={`form-field ${fieldErrors.title ? "field-invalid" : ""}`}>
        <label>
          <span className="form-field-label">
            Title <span className="required-mark" aria-hidden="true">*</span>
          </span>
          <input
            value={title}
            onChange={(event) => {
              setTitle(event.target.value);
              if (fieldErrors.title) {
                setFieldErrors((e) => ({ ...e, title: undefined }));
              }
            }}
            placeholder="CodeSignal, HM chat, …"
            aria-invalid={Boolean(fieldErrors.title)}
            aria-describedby={fieldErrors.title ? "title-error" : undefined}
          />
        </label>
        {fieldErrors.title && (
          <p className="field-error-message" id="title-error" role="alert">
            {fieldErrors.title}
          </p>
        )}
      </div>

      {scheduleMode === "due" ? (
        <div className="interview-datetime-row">
          <label>
            <span className="form-field-label">Due date</span>
            <input
              type="date"
              value={dueDate}
              onChange={(event) => setDueDate(event.target.value)}
            />
          </label>
          <label>
            <span className="form-field-label">Due time</span>
            <input
              type="time"
              value={dueTime}
              onChange={(event) => setDueTime(event.target.value)}
            />
          </label>
        </div>
      ) : (
        <div className="interview-datetime-row">
          <label>
            <span className="form-field-label">Scheduled date</span>
            <input
              type="date"
              value={scheduledDate}
              onChange={(event) => setScheduledDate(event.target.value)}
            />
          </label>
          <label>
            <span className="form-field-label">Scheduled time</span>
            <input
              type="time"
              value={scheduledTime}
              onChange={(event) => setScheduledTime(event.target.value)}
            />
          </label>
        </div>
      )}

      <label>
        <span className="form-field-label">Link</span>
        <input
          type="url"
          value={url}
          onChange={(event) => setUrl(event.target.value)}
          placeholder={
            scheduleMode === "due"
              ? "Assessment or portal URL"
              : "Meeting or calendar URL"
          }
        />
      </label>
      <label>
        <span className="form-field-label">Notes</span>
        <textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} />
      </label>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving || apps.length === 0}>
          {saving ? "Saving…" : "Save interview"}
        </button>
      </div>
    </form>
  );
  },
);

export default AddInterviewModal;
