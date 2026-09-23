import { useState, type FormEvent } from "react";
import {
  completeSubtask,
  createSubtask,
  moveSubtask,
  reopenSubtask,
  type TaskRow,
} from "../api";

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
  const [draft, setDraft] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const subtasks = task.subtasks ?? [];
  const progress = task.subtaskProgress;
  const open = subtasks.filter((s) => s.status === "open");
  const done = subtasks.filter((s) => s.status === "completed");

  async function onAdd(event: FormEvent) {
    event.preventDefault();
    const title = draft.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await createSubtask(task.id, { title });
      setDraft("");
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not add subtask");
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

  return (
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
      <form className="task-subtask-add" onSubmit={(event) => void onAdd(event)}>
        <input
          type="text"
          value={draft}
          placeholder="Add subtask"
          disabled={disabled || adding}
          onChange={(event) => setDraft(event.target.value)}
          aria-label="New subtask title"
        />
        <button type="submit" className="secondary" disabled={disabled || adding || !draft.trim()}>
          Add
        </button>
      </form>
    </div>
  );
}
