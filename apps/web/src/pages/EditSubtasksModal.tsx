import { useEffect, useState, type FormEvent } from "react";
import {
  createSubtask,
  deleteSubtask,
  patchSubtask,
  type TaskPriority,
  type TaskRow,
  type TaskSubtaskRow,
} from "../api";
import {
  applyByTimeInputValue,
  combineApplyByDateTime,
  DEFAULT_APPLY_BY_TIME,
  toDateInputValue,
} from "../formatDate";
import { PrioritySelect } from "../PriorityBadge";

type DraftRow = {
  key: string;
  id: string | null;
  title: string;
  dueDate: string;
  dueTime: string;
  estimateMinutes: string;
  priorityOverride: TaskPriority | null;
  status: "open" | "completed";
};

function fromSubtask(sub: TaskSubtaskRow): DraftRow {
  return {
    key: sub.id,
    id: sub.id,
    title: sub.title,
    dueDate: toDateInputValue(sub.dueAt),
    dueTime: applyByTimeInputValue(sub.dueAt) || DEFAULT_APPLY_BY_TIME,
    estimateMinutes: sub.estimateMinutes != null ? String(sub.estimateMinutes) : "",
    priorityOverride: sub.priorityOverride,
    status: sub.status,
  };
}

function emptyRow(): DraftRow {
  return {
    key: `new-${crypto.randomUUID()}`,
    id: null,
    title: "",
    dueDate: "",
    dueTime: DEFAULT_APPLY_BY_TIME,
    estimateMinutes: "",
    priorityOverride: null,
    status: "open",
  };
}

function snapshot(row: DraftRow): string {
  return JSON.stringify({
    title: row.title.trim(),
    dueDate: row.dueDate,
    dueTime: row.dueDate ? row.dueTime : "",
    estimateMinutes: row.estimateMinutes.trim(),
    priorityOverride: row.priorityOverride,
  });
}

type Props = {
  task: TaskRow;
  onSaved: () => void;
  onCancel: () => void;
};

export default function EditSubtasksModal({ task, onSaved, onCancel }: Props) {
  const [rows, setRows] = useState<DraftRow[]>(() => {
    const existing = (task.subtasks ?? []).map(fromSubtask);
    return existing.length > 0 ? existing : [emptyRow()];
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        if (!saving) onCancel();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [saving, onCancel]);

  function updateRow(key: string, patch: Partial<DraftRow>) {
    setRows((current) =>
      current.map((row) => (row.key === key ? { ...row, ...patch } : row)),
    );
  }

  function removeRow(key: string) {
    setRows((current) => {
      const next = current.filter((row) => row.key !== key);
      return next.length > 0 ? next : [emptyRow()];
    });
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (saving) return;

    for (const row of rows) {
      if (!row.title.trim()) {
        setError("Every subtask needs a title (or remove the empty row).");
        return;
      }
      if (row.estimateMinutes.trim() !== "") {
        const n = Number(row.estimateMinutes.trim());
        if (!Number.isInteger(n) || n <= 0) {
          setError("Estimates must be positive whole minutes.");
          return;
        }
      }
    }

    const initialById = new Map((task.subtasks ?? []).map((s) => [s.id, fromSubtask(s)]));
    const keptIds = new Set(rows.map((r) => r.id).filter(Boolean) as string[]);

    setSaving(true);
    setError(null);
    try {
      for (const id of initialById.keys()) {
        if (!keptIds.has(id)) {
          await deleteSubtask(task.id, id);
        }
      }

      for (const row of rows) {
        const dueAt = row.dueDate ? combineApplyByDateTime(row.dueDate, row.dueTime) : null;
        const estimateMinutes =
          row.estimateMinutes.trim() === "" ? null : Number(row.estimateMinutes.trim());
        const body = {
          title: row.title.trim(),
          dueAt,
          estimateMinutes,
          priorityOverride: row.priorityOverride,
        };

        if (!row.id) {
          await createSubtask(task.id, body);
          continue;
        }
        const initial = initialById.get(row.id);
        if (!initial || snapshot(initial) !== snapshot(row)) {
          await patchSubtask(task.id, row.id, body);
        }
      }

      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save subtasks");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="modal-backdrop"
      onClick={(event) => {
        if (event.target === event.currentTarget && !saving) onCancel();
      }}
    >
      <div
        className="modal modal-wide"
        role="dialog"
        aria-modal="true"
        aria-labelledby="edit-subtasks-title"
      >
        <form className="form edit-subtasks-form" onSubmit={(event) => void onSubmit(event)}>
          <h2 id="edit-subtasks-title">Edit subtasks</h2>
          <p className="muted field-hint">
            Under {task.title}. Check off items on the card — this editor is for titles, dates,
            estimates, and priority only.
          </p>
          {error && <p className="error">{error}</p>}

          <div className="edit-subtasks-table" role="table" aria-label="Subtasks">
            <div className="edit-subtasks-head" role="row">
              <span role="columnheader">Title</span>
              <span role="columnheader">Due</span>
              <span role="columnheader">Time</span>
              <span role="columnheader">Est.</span>
              <span role="columnheader">Priority</span>
              <span role="columnheader" className="visually-hidden">
                Remove
              </span>
            </div>
            {rows.map((row) => (
              <div
                key={row.key}
                className={`edit-subtasks-row${row.status === "completed" ? " is-done" : ""}`}
                role="row"
              >
                <input
                  type="text"
                  value={row.title}
                  placeholder="Subtask title"
                  disabled={saving}
                  aria-label="Title"
                  onChange={(event) => updateRow(row.key, { title: event.target.value })}
                />
                <input
                  type="date"
                  value={row.dueDate}
                  disabled={saving}
                  aria-label="Due date"
                  onChange={(event) => {
                    const next = event.target.value;
                    updateRow(row.key, {
                      dueDate: next,
                      dueTime: next && !row.dueTime ? DEFAULT_APPLY_BY_TIME : row.dueTime,
                    });
                  }}
                />
                <input
                  type="time"
                  value={row.dueTime}
                  disabled={saving || !row.dueDate}
                  aria-label="Due time"
                  onChange={(event) => updateRow(row.key, { dueTime: event.target.value })}
                />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={row.estimateMinutes}
                  placeholder="min"
                  disabled={saving}
                  aria-label="Estimate minutes"
                  onChange={(event) => updateRow(row.key, { estimateMinutes: event.target.value })}
                />
                <PrioritySelect
                  value={row.priorityOverride}
                  onChange={(priorityOverride) => updateRow(row.key, { priorityOverride })}
                  emptyLabel="Inherit"
                  disabled={saving}
                />
                <button
                  type="button"
                  className="todo-remove-btn edit-subtasks-remove"
                  aria-label="Remove subtask"
                  disabled={saving}
                  onClick={() => removeRow(row.key)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.3 6.3 17.7 17.7M17.7 6.3 6.3 17.7" />
                  </svg>
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            className="secondary edit-subtasks-add-row"
            disabled={saving}
            onClick={() => setRows((current) => [...current, emptyRow()])}
          >
            + Add another
          </button>

          <div className="form-actions">
            <button type="button" className="secondary" disabled={saving} onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
