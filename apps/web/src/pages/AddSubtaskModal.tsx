import { useEffect, useState, type FormEvent } from "react";
import { createSubtask, type TaskPriority, type TaskRow } from "../api";
import {
  combineApplyByDateTime,
  DEFAULT_APPLY_BY_TIME,
} from "../formatDate";
import { PrioritySelect } from "../PriorityBadge";

type Props = {
  task: TaskRow;
  onCreated: () => void;
  onCancel: () => void;
};

export default function AddSubtaskModal({ task, onCreated, onCancel }: Props) {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState(DEFAULT_APPLY_BY_TIME);
  const [estimateMinutes, setEstimateMinutes] = useState("");
  const [priorityOverride, setPriorityOverride] = useState<TaskPriority | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!adding) onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding, onCancel]);

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const trimmed = title.trim();
    if (!trimmed || adding) return;
    const estimate = estimateMinutes.trim() === "" ? null : Number(estimateMinutes.trim());
    if (estimateMinutes.trim() !== "" && (!Number.isInteger(estimate) || (estimate ?? 0) <= 0)) {
      setFormError("Estimate must be a positive number of minutes");
      return;
    }
    setAdding(true);
    setFormError(null);
    try {
      await createSubtask(task.id, {
        title: trimmed,
        dueAt: dueDate ? combineApplyByDateTime(dueDate, dueTime) : null,
        estimateMinutes: estimate,
        priorityOverride,
      });
      onCreated();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add subtask");
    } finally {
      setAdding(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !adding) onCancel();
      }}
    >
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-subtask-title"
      >
        <form className="form" onSubmit={(event) => void onAdd(event)}>
          <h2 id="add-subtask-title">Add subtask</h2>
          <p className="muted field-hint">Under {task.title}</p>
          {formError && <p className="error">{formError}</p>}
          <label>
            Title
            <input
              type="text"
              value={title}
              autoFocus
              required
              disabled={adding}
              onChange={(event) => setTitle(event.target.value)}
            />
          </label>
          <div className="task-due-fields">
            <label>
              Due date
              <input
                type="date"
                value={dueDate}
                disabled={adding}
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
                disabled={adding || !dueDate}
                onChange={(event) => setDueTime(event.target.value)}
              />
            </label>
          </div>
          <div className="task-due-fields">
            <label>
              Priority
              <PrioritySelect
                value={priorityOverride}
                onChange={setPriorityOverride}
                emptyLabel="Inherit"
                disabled={adding}
              />
            </label>
            <label>
              Estimate (minutes)
              <input
                type="number"
                min={1}
                step={1}
                value={estimateMinutes}
                placeholder="e.g. 90"
                disabled={adding}
                onChange={(event) => setEstimateMinutes(event.target.value)}
              />
            </label>
          </div>
          <div className="form-actions">
            <button type="button" className="secondary" disabled={adding} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" disabled={adding || !title.trim()}>
              {adding ? "Adding…" : "Add"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
