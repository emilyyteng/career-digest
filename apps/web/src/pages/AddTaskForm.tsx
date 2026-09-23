import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type FormEvent,
} from "react";
import { createTask, type TaskKind, type TaskRow } from "../api";
import {
  combineApplyByDateTime,
  DEFAULT_APPLY_BY_TIME,
} from "../formatDate";
import LocationSuggest from "../LocationSuggest";
import RichTextField, { isEmptyRichHtml } from "../RichTextField";
import { PrioritySelect } from "../PriorityBadge";
import type { TaskPriority } from "../api";

type Props = {
  categoryId: string;
  categoryKind: TaskKind;
  categoryName: string;
  onCreated: (row: TaskRow) => void;
  onCancel?: () => void;
};

export type AddTaskFormHandle = {
  requestClose: () => void;
};

const AddTaskForm = forwardRef<AddTaskFormHandle, Props>(function AddTaskForm(
  { categoryId, categoryKind, categoryName, onCreated, onCancel },
  ref,
) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [location, setLocation] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState(DEFAULT_APPLY_BY_TIME);
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [estimateMinutes, setEstimateMinutes] = useState("");
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isApplication = categoryKind === "application";

  const dirty =
    title.trim() !== "" ||
    organization.trim() !== "" ||
    location.trim() !== "" ||
    url.trim() !== "" ||
    notes.trim() !== "" ||
    !isEmptyRichHtml(descriptionHtml) ||
    dueDate !== "" ||
    dueTime !== DEFAULT_APPLY_BY_TIME ||
    priority != null ||
    estimateMinutes.trim() !== "";

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

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const dueAt = dueDate ? combineApplyByDateTime(dueDate, dueTime) : null;
      const estimate =
        estimateMinutes.trim() === "" ? null : Number(estimateMinutes.trim());
      if (estimateMinutes.trim() !== "" && (!Number.isInteger(estimate) || (estimate ?? 0) <= 0)) {
        setError("Estimate must be a positive number of minutes");
        setSaving(false);
        return;
      }
      const row = await createTask({
        categoryId,
        title: title.trim(),
        organization: isApplication ? organization.trim() : organization.trim() || null,
        location: isApplication ? location.trim() || null : null,
        url: url.trim() || null,
        notes: notes.trim() || null,
        descriptionHtml:
          isApplication && !isEmptyRichHtml(descriptionHtml) ? descriptionHtml : null,
        dueAt,
        priority,
        estimateMinutes: estimate,
      });
      onCreated(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="form" onSubmit={(event) => void onSubmit(event)}>
        <h2 id="add-task-title">Add task · {categoryName}</h2>
        {error && <p className="error">{error}</p>}
        <label>
          Title
          <input
            type="text"
            value={title}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          {isApplication ? "Company" : "Organization"}
          <input
            type="text"
            value={organization}
            required={isApplication}
            onChange={(event) => setOrganization(event.target.value)}
          />
        </label>
        {isApplication && (
          <label>
            Location
            <LocationSuggest
              value={location}
              onChange={setLocation}
              placeholder="Location"
            />
          </label>
        )}
        <label>
          Link
          <input
            type="url"
            value={url}
            placeholder="https://"
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        {isApplication && (
          <label>
            Job description
            <RichTextField
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              placeholder="Paste the job description — kept when you mark applied"
            />
          </label>
        )}
        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="task-due-fields">
          <label>
            Due date
            <input
              type="date"
              value={dueDate}
              onChange={(event) => {
                const next = event.target.value;
                setDueDate(next);
                if (next && !dueTime) setDueTime(DEFAULT_APPLY_BY_TIME);
              }}
            />
          </label>
          <label>
            Time
            <input
              type="time"
              value={dueTime}
              disabled={!dueDate}
              onChange={(event) => setDueTime(event.target.value)}
            />
          </label>
        </div>
        <div className="task-due-fields">
          <label>
            Priority
            <PrioritySelect value={priority} onChange={setPriority} />
          </label>
          <label>
            Estimate (minutes)
            <input
              type="number"
              min={1}
              step={1}
              value={estimateMinutes}
              placeholder="e.g. 90"
              onChange={(event) => setEstimateMinutes(event.target.value)}
            />
          </label>
        </div>
        <div className="row-actions">
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Add task"}
          </button>
          {onCancel && (
            <button type="button" className="secondary" onClick={requestClose}>
              Cancel
            </button>
          )}
        </div>
      </form>
      {confirmDiscard && (
        <div className="modal-backdrop" role="presentation">
          <div className="modal" role="dialog" aria-modal="true">
            <h2>Discard draft?</h2>
            <p className="muted">You have unsaved fields.</p>
            <div className="row-actions">
              <button type="button" onClick={() => onCancel?.()}>
                Discard
              </button>
              <button
                type="button"
                className="secondary"
                onClick={() => setConfirmDiscard(false)}
              >
                Keep editing
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default AddTaskForm;
