import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type FormEvent,
} from "react";
import { createTask, type TaskCategory, type TaskRow } from "../api";
import {
  combineApplyByDateTime,
  DEFAULT_APPLY_BY_TIME,
  toDateInputValue,
  applyByTimeInputValue,
} from "../formatDate";

type Props = {
  onCreated: (row: TaskRow) => void;
  onCancel?: () => void;
};

export type AddTaskFormHandle = {
  requestClose: () => void;
};

const CREATE_CATEGORIES: TaskCategory[] = ["school", "personal", "application"];

const AddTaskForm = forwardRef<AddTaskFormHandle, Props>(function AddTaskForm(
  { onCreated, onCancel },
  ref,
) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [category, setCategory] = useState<TaskCategory>("school");
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState(DEFAULT_APPLY_BY_TIME);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty =
    title.trim() !== "" ||
    organization.trim() !== "" ||
    url.trim() !== "" ||
    notes.trim() !== "" ||
    category !== "school" ||
    dueDate !== "" ||
    dueTime !== DEFAULT_APPLY_BY_TIME;

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
      const row = await createTask({
        category,
        title: title.trim(),
        organization:
          category === "application" ? organization.trim() : organization.trim() || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
        dueAt,
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
        <h2 id="add-task-title">Add task</h2>
        {error && <p className="error">{error}</p>}
        <label>
          Category
          <select value={category} onChange={(event) => setCategory(event.target.value as TaskCategory)}>
            {CREATE_CATEGORIES.map((value) => (
              <option key={value} value={value}>{value}</option>
            ))}
          </select>
        </label>
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
          {category === "application" ? "Company" : "Organization"}
          <input
            type="text"
            value={organization}
            required={category === "application"}
            placeholder={category === "application" ? "Employer" : "School, employer, etc."}
            onChange={(event) => setOrganization(event.target.value)}
          />
        </label>
        <label>
          Link
          <input
            type="url"
            value={url}
            placeholder="https://"
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label>
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <label>
          Due time
          <input
            type="time"
            value={dueTime}
            disabled={!dueDate}
            onChange={(event) => setDueTime(event.target.value)}
          />
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving || !title.trim() || (category === "application" && !organization.trim())}>
            {saving ? "Saving…" : "Add task"}
          </button>
        </div>
      </form>
      {confirmDiscard && (
        <div
          className="modal-backdrop modal-backdrop-nested"
          onClick={(event) => {
            if (event.target === event.currentTarget) setConfirmDiscard(false);
          }}
        >
          <div className="modal modal-compact" role="dialog" aria-modal="true">
            <div className="step-action-confirm" role="alertdialog">
              <h3>Discard new task?</h3>
              <p className="muted">Your edits will be lost.</p>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setConfirmDiscard(false)}>
                  Keep editing
                </button>
                <button
                  type="button"
                  className="modal-confirm-btn"
                  onClick={() => {
                    setConfirmDiscard(false);
                    onCancel?.();
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default AddTaskForm;
