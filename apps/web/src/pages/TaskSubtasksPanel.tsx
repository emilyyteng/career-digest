import { useEffect, useState, type FormEvent } from "react";
import {
  completeSubtask,
  createSubtask,
  moveSubtask,
  reopenSubtask,
  type TaskPriority,
  type TaskRow,
} from "../api";
import {
  combineApplyByDateTime,
  DEFAULT_APPLY_BY_TIME,
} from "../formatDate";
import { PrioritySelect } from "../PriorityBadge";

type Props = {
  task: TaskRow;
  disabled?: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
};

export default function TaskSubtasksPanel({
  task,
  disabled,
  onChanged,
  onError,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addingOpen, setAddingOpen] = useState(false);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState(DEFAULT_APPLY_BY_TIME);
  const [estimateMinutes, setEstimateMinutes] = useState("");
  const [priorityOverride, setPriorityOverride] = useState<TaskPriority | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const subtasks = task.subtasks ?? [];
  const progress = task.subtaskProgress;
  const open = subtasks.filter((s) => s.status === "open");
  const done = subtasks.filter((s) => s.status === "completed");
  const hasSubtasks = subtasks.length > 0;

  useEffect(() => {
    if (!addingOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        setAddingOpen(false);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [addingOpen]);

  function resetForm() {
    setTitle("");
    setDueDate("");
    setDueTime(DEFAULT_APPLY_BY_TIME);
    setEstimateMinutes("");
    setPriorityOverride(null);
    setFormError(null);
  }

  function closeAdd() {
    if (adding) return;
    setAddingOpen(false);
    resetForm();
  }

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
      setAddingOpen(false);
      resetForm();
      onChanged();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not add subtask");
    } finally {
      setAdding(false);
    }
  }

  async function onToggle(subId: string, status: "open" | "completed") {
    if (busyId) return;
    setBusyId(subId);
    try {
      if (status === "open") await completeSubtask(task.id, subId);
      else await reopenSubtask(task.id, subId);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not update subtask");
    } finally {
      setBusyId(null);
    }
  }

  async function onMove(subId: string, direction: "up" | "down") {
    if (busyId) return;
    setBusyId(subId);
    try {
      await moveSubtask(task.id, subId, direction);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not reorder");
    } finally {
      setBusyId(null);
    }
  }

  if (task.category !== "misc") return null;

  const pct =
    progress && progress.total > 0
      ? Math.round((progress.completed / progress.total) * 100)
      : null;

  const addButton = (
    <button
      type="button"
      className="secondary task-subtask-add-btn"
      disabled={disabled}
      onClick={() => setAddingOpen(true)}
    >
      Add subtask
    </button>
  );

  return (
    <>
      {hasSubtasks && (
        <div className="task-subtasks">
          {progress && (
            <div className="task-subtasks-progress">
              <div className="task-subtasks-progress-meta">
                <span>
                  {progress.completed}/{progress.total}
                </span>
                <span>{pct}%</span>
              </div>
              <div
                className="task-subtasks-progress-bar"
                role="progressbar"
                aria-valuenow={progress.completed}
                aria-valuemin={0}
                aria-valuemax={progress.total}
              >
                <span style={{ width: `${pct}%` }} />
              </div>
            </div>
          )}
          <ul className="task-subtasks-list">
            {open.map((sub, index) => (
              <li key={sub.id} className="task-subtask-row">
                <label className="task-subtask-check">
                  <input
                    type="checkbox"
                    checked={false}
                    disabled={disabled || busyId === sub.id}
                    onChange={() => void onToggle(sub.id, "open")}
                  />
                  <span>{sub.title}</span>
                </label>
                <div className="task-subtask-actions">
                  <button
                    type="button"
                    className="task-subtask-move"
                    aria-label="Move up"
                    disabled={disabled || busyId === sub.id || index === 0}
                    onClick={() => void onMove(sub.id, "up")}
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    className="task-subtask-move"
                    aria-label="Move down"
                    disabled={disabled || busyId === sub.id || index === open.length - 1}
                    onClick={() => void onMove(sub.id, "down")}
                  >
                    ↓
                  </button>
                </div>
              </li>
            ))}
            {done.map((sub) => (
              <li key={sub.id} className="task-subtask-row is-done">
                <label className="task-subtask-check">
                  <input
                    type="checkbox"
                    checked
                    disabled={disabled || busyId === sub.id}
                    onChange={() => void onToggle(sub.id, "completed")}
                  />
                  <span>{sub.title}</span>
                </label>
              </li>
            ))}
          </ul>
          {addButton}
        </div>
      )}
      {!hasSubtasks && <div className="task-subtasks-add-only">{addButton}</div>}

      {addingOpen && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) closeAdd();
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
                <button type="button" className="secondary" disabled={adding} onClick={closeAdd}>
                  Cancel
                </button>
                <button type="submit" disabled={adding || !title.trim()}>
                  {adding ? "Adding…" : "Add"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
