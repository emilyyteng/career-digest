import { useState, type DragEvent } from "react";
import {
  completeSubtask,
  reopenSubtask,
  reorderSubtasks,
  type TaskRow,
} from "../api";
import { formatEstimateMinutes, formatSubtaskDueShort } from "../formatDate";

type Props = {
  task: TaskRow;
  disabled?: boolean;
  onChanged: () => void;
  onError: (message: string) => void;
};

function DragHandle() {
  return (
    <span className="task-subtask-handle" aria-hidden="true" title="Drag to reorder">
      <svg viewBox="0 0 16 16" width="14" height="14">
        <path
          d="M3 5h10M3 8h10M3 11h10"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
}

/** Checklist + progress; Edit subtasks lives in the card footer. */
export default function TaskSubtasksPanel({
  task,
  disabled,
  onChanged,
  onError,
}: Props) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const subtasks = task.subtasks ?? [];
  const progress = task.subtaskProgress;
  const open = subtasks.filter((s) => s.status === "open");
  const done = subtasks.filter((s) => s.status === "completed");

  if (task.category !== "misc" || subtasks.length === 0) return null;

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

  function onDragStart(event: DragEvent, subId: string) {
    if (disabled) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", subId);
    setDraggingId(subId);
  }

  function onDragOver(event: DragEvent, subId: string) {
    if (!draggingId || draggingId === subId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverId(subId);
  }

  async function onDrop(event: DragEvent, targetId: string) {
    event.preventDefault();
    const sourceId = draggingId ?? event.dataTransfer.getData("text/plain");
    setDraggingId(null);
    setDragOverId(null);
    if (!sourceId || sourceId === targetId || disabled) return;

    const ids = open.map((s) => s.id);
    const from = ids.indexOf(sourceId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) return;
    // Drop on a row = place below it (indicator is a bottom edge line).
    const next = [...ids];
    next.splice(from, 1);
    const insertAt = from < to ? to : to + 1;
    next.splice(insertAt, 0, sourceId);

    setBusyId(sourceId);
    try {
      await reorderSubtasks(task.id, next);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not reorder");
    } finally {
      setBusyId(null);
    }
  }

  function onDragEnd() {
    setDraggingId(null);
    setDragOverId(null);
  }

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
        {open.map((sub) => {
          const estimate = formatEstimateMinutes(sub.estimateMinutes);
          const due = formatSubtaskDueShort(sub.dueAt);
          return (
          <li
            key={sub.id}
            className={[
              "task-subtask-row",
              draggingId === sub.id ? "is-dragging" : "",
              dragOverId === sub.id ? "is-drag-over" : "",
            ]
              .filter(Boolean)
              .join(" ")}
            onDragOver={(event) => onDragOver(event, sub.id)}
            onDrop={(event) => void onDrop(event, sub.id)}
            onDragEnd={onDragEnd}
          >
            <button
              type="button"
              className="task-subtask-handle-btn"
              draggable={!disabled && busyId == null}
              aria-label={`Reorder ${sub.title}`}
              disabled={disabled || busyId === sub.id}
              onDragStart={(event) => onDragStart(event, sub.id)}
            >
              <DragHandle />
            </button>
            <label className="task-subtask-check">
              <input
                type="checkbox"
                checked={false}
                disabled={disabled || busyId === sub.id}
                onChange={() => void onToggle(sub.id, "open")}
              />
              <span className="task-subtask-title-cluster">
                <span className="task-subtask-title">{sub.title}</span>
                {estimate && <span className="task-subtask-estimate">{estimate}</span>}
              </span>
            </label>
            {due && <span className="task-subtask-due">{due}</span>}
          </li>
          );
        })}
        {done.map((sub) => {
          const estimate = formatEstimateMinutes(sub.estimateMinutes);
          const due = formatSubtaskDueShort(sub.dueAt);
          return (
          <li key={sub.id} className="task-subtask-row is-done">
            <span className="task-subtask-handle-spacer" aria-hidden="true" />
            <label className="task-subtask-check">
              <input
                type="checkbox"
                checked
                disabled={disabled || busyId === sub.id}
                onChange={() => void onToggle(sub.id, "completed")}
              />
              <span className="task-subtask-title-cluster">
                <span className="task-subtask-title">{sub.title}</span>
                {estimate && <span className="task-subtask-estimate">{estimate}</span>}
              </span>
            </label>
            {due && <span className="task-subtask-due">{due}</span>}
          </li>
          );
        })}
      </ul>
    </div>
  );
}
