import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type FormEvent,
} from "react";
import { patchTask, type TaskRow } from "../api";
import {
  combineApplyByDateTime,
  toDateInputValue,
  applyByTimeInputValue,
} from "../formatDate";

type Props = {
  task: TaskRow;
  onSaved: (row: TaskRow) => void;
  onCancel?: () => void;
};

export type EditTaskFormHandle = {
  requestClose: () => void;
};

const EditTaskForm = forwardRef<EditTaskFormHandle, Props>(function EditTaskForm(
  { task, onSaved, onCancel },
  ref,
) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [organization, setOrganization] = useState(task.organization ?? "");
  const [url, setUrl] = useState(task.url ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueAt));
  const [dueTime, setDueTime] = useState(applyByTimeInputValue(task.dueAt));
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const dirty =
    title.trim() !== task.title ||
    organization.trim() !== (task.organization ?? "") ||
    url.trim() !== (task.url ?? "") ||
    notes.trim() !== (task.notes ?? "") ||
    dueDate !== toDateInputValue(task.dueAt) ||
    dueTime !== applyByTimeInputValue(task.dueAt);

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
      const row = await patchTask(task.id, {
        title: title.trim(),
        organization: organization.trim() || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
        dueAt,
      });
      onSaved(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="form" onSubmit={(event) => void onSubmit(event)}>
        <h2 id="edit-task-title">Edit task</h2>
        <p className="muted task-category-lock">Category: {task.category}</p>
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
          Organization
          <input
            type="text"
            value={organization}
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
          <button type="submit" disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
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
              <h3>Discard edits?</h3>
              <p className="muted">Your changes will be lost.</p>
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

export default EditTaskForm;
