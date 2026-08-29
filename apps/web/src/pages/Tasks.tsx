import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  completeTask,
  deleteTask,
  getTasks,
  type TaskRow,
  type TaskView,
} from "../api";
import { formatShortDate } from "../formatDate";
import InterviewCountdown from "../InterviewCountdown";
import { invalidateListCache, readListCache, writeListCache } from "../listCache";
import StepActionConfirm from "../StepActionConfirm";
import AddTaskForm, { type AddTaskFormHandle } from "./AddTaskForm";
import EditTaskForm, { type EditTaskFormHandle } from "./EditTaskForm";

const TABS: TaskView[] = ["open", "completed"];

const EMPTY_COUNTS = { open: 0, completed: 0 };

type TasksSnapshot = {
  tasks: TaskRow[];
  counts: { open: number; completed: number };
};

function tasksCacheKey(view: TaskView): string {
  return `tasks:${view}`;
}

function categoryLabel(category: TaskRow["category"]): string {
  return category;
}

export default function Tasks() {
  const [searchParams, setSearchParams] = useSearchParams();
  const rawView = searchParams.get("view") ?? "open";
  const view: TaskView = rawView === "completed" ? "completed" : "open";
  const initialCacheKey = tasksCacheKey(view);
  const initialSnapshot = readListCache<TasksSnapshot>(initialCacheKey);
  const [rows, setRows] = useState<TaskRow[]>(() => initialSnapshot?.tasks ?? []);
  const [counts, setCounts] = useState(
    () => initialSnapshot?.counts ?? EMPTY_COUNTS,
  );
  const [loaded, setLoaded] = useState(() => !!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<TaskRow | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<TaskRow | null>(null);
  const addFormRef = useRef<AddTaskFormHandle>(null);
  const editFormRef = useRef<EditTaskFormHandle>(null);

  function applyTasksData(data: Awaited<ReturnType<typeof getTasks>>, cacheKey: string) {
    const snapshot: TasksSnapshot = {
      tasks: data.tasks,
      counts: { ...EMPTY_COUNTS, ...data.counts },
    };
    writeListCache(cacheKey, snapshot);
    setRows(snapshot.tasks);
    setCounts(snapshot.counts);
    setLoaded(true);
  }

  async function load() {
    const cacheKey = tasksCacheKey(view);
    const data = await getTasks(view);
    applyTasksData(data, cacheKey);
  }

  useEffect(() => {
    let cancelled = false;
    const cacheKey = tasksCacheKey(view);
    const cached = readListCache<TasksSnapshot>(cacheKey);
    if (cached) {
      setRows(cached.tasks);
      setCounts(cached.counts);
      setLoaded(true);
    } else {
      setLoaded(false);
    }

    getTasks(view)
      .then((data) => {
        if (cancelled) return;
        applyTasksData(data, cacheKey);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [view]);

  useEffect(() => {
    if (!adding) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") addFormRef.current?.requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding]);

  useEffect(() => {
    if (!editing) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") editFormRef.current?.requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editing]);

  function requestCloseAdd() {
    addFormRef.current?.requestClose();
  }

  function requestCloseEdit() {
    editFormRef.current?.requestClose();
  }

  function onCreated(row: TaskRow) {
    setAdding(false);
    invalidateListCache("tasks:");
    if (view !== "open") {
      setSearchParams({ view: "open" });
      return;
    }
    void load().catch((err: Error) => setError(err.message));
    if (row.status === "open") {
      setRows((current) => [row, ...current]);
      setCounts((current) => ({ ...current, open: current.open + 1 }));
    }
  }

  function onEdited(row: TaskRow) {
    setEditing(null);
    invalidateListCache("tasks:");
    setRows((current) => current.map((item) => (item.id === row.id ? row : item)));
  }

  async function confirmRemove() {
    if (!removeConfirm) return;
    const row = removeConfirm;
    setRemoveConfirm(null);
    setPendingId(row.id);
    setRows((current) => current.filter((item) => item.id !== row.id));
    setCounts((current) => ({
      ...current,
      open: view === "open" ? Math.max(0, current.open - 1) : current.open,
      completed: view === "completed" ? Math.max(0, current.completed - 1) : current.completed,
    }));
    try {
      await deleteTask(row.id);
      invalidateListCache("tasks:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  async function confirmComplete() {
    if (!completeConfirm) return;
    const row = completeConfirm;
    setCompleteConfirm(null);
    setPendingId(row.id);
    setRows((current) => current.filter((item) => item.id !== row.id));
    setCounts((current) => ({
      open: Math.max(0, current.open - 1),
      completed: current.completed + 1,
    }));
    try {
      await completeTask(row.id);
      invalidateListCache("tasks:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete task");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  return (
    <section>
      <div className="tabs-row">
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === view ? "tab on" : "tab"}
              aria-current={tab === view ? "page" : undefined}
              aria-label={`${tab}, ${counts[tab]} task${counts[tab] === 1 ? "" : "s"}`}
              onClick={() => setSearchParams(tab === "open" ? {} : { view: tab })}
            >
              <span className="tab-label">{tab === "open" ? "Open" : "Completed"}</span>
              <span className="tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAdding(true)}>
          Add task +
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {!loaded && rows.length === 0 && <p className="muted">Loading…</p>}
      {loaded && rows.length === 0 && <p className="muted">Nothing in this tab yet.</p>}
      {rows.map((row) => {
        const completedLabel = formatShortDate(row.completedAt);
        return (
          <article key={row.id} className="card application-card task-card">
            {view === "open" && (
              <div className="task-card-toolbar">
                <button
                  type="button"
                  className="task-edit-btn"
                  aria-label="Edit task"
                  disabled={pendingId === row.id}
                  onClick={() => setEditing(row)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
                    <path d="M13.5 6.5l3 3" />
                  </svg>
                </button>
                <button
                  type="button"
                  className="todo-remove-btn"
                  aria-label="Delete task"
                  disabled={pendingId === row.id}
                  onClick={() => setRemoveConfirm(row)}
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M6.3 6.3 17.7 17.7M17.7 6.3 6.3 17.7" />
                  </svg>
                </button>
              </div>
            )}
            <div className="application-card-layout application-card-layout-todo">
              <div className="application-card-top">
                <h2 className="application-card-title">{row.title}</h2>
                {view === "open" && row.dueAt && (
                  <div className="application-card-aside-countdown">
                    <InterviewCountdown target={row.dueAt} />
                  </div>
                )}
              </div>
              <div className="meta application-card-meta">
                {row.organization && <span className="employer">{row.organization}</span>}
                <span className="task-category-pill">{categoryLabel(row.category)}</span>
              </div>
            </div>
            {(view === "open" || row.url || completedLabel) && (
              <div className="row-actions application-card-footer application-card-footer-todo">
                {view === "open" && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={pendingId === row.id}
                    onClick={() => setCompleteConfirm(row)}
                  >
                    Complete
                  </button>
                )}
                {row.url && (
                  <a
                    className="external application-card-apply-link"
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open link
                    <span className="ext-icon" aria-hidden="true">↗</span>
                  </a>
                )}
                {view === "completed" && completedLabel && (
                  <span className="applied-date">Completed: {completedLabel}</span>
                )}
              </div>
            )}
          </article>
        );
      })}
      {adding && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) requestCloseAdd();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-task-title">
            <AddTaskForm
              ref={addFormRef}
              onCreated={onCreated}
              onCancel={() => setAdding(false)}
            />
          </div>
        </div>
      )}
      {editing && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) requestCloseEdit();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="edit-task-title">
            <EditTaskForm
              ref={editFormRef}
              task={editing}
              onSaved={onEdited}
              onCancel={() => setEditing(null)}
            />
          </div>
        </div>
      )}
      {removeConfirm && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setRemoveConfirm(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <StepActionConfirm
              title="Delete task?"
              description="This permanently removes the task. You can add a new one with the right category if needed."
              confirmLabel="Delete"
              onConfirm={() => void confirmRemove()}
              onCancel={() => setRemoveConfirm(null)}
            />
          </div>
        </div>
      )}
      {completeConfirm && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setCompleteConfirm(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <StepActionConfirm
              title="Mark task complete?"
              description="This archives the task to Completed. You can still refer back to it there."
              confirmLabel="Complete"
              onConfirm={() => void confirmComplete()}
              onCancel={() => setCompleteConfirm(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
