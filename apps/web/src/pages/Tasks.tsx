import { useEffect, useRef, useState, type FormEvent } from "react";
import { useSearchParams } from "react-router-dom";
import {
  completeTask,
  createTaskCategory,
  deleteTask,
  duplicateTask,
  getTasks,
  getWeeklyGoals,
  patchTask,
  renameTaskCategory,
  reopenTask,
  setWeeklyAppTargetMember,
  type TaskCategoryRow,
  type TaskDueKind,
  type TaskRow,
  type TaskView,
} from "../api";
import {
  combineApplyByDateTime,
  formatShortDate,
  applyByLabel,
  dueLabel,
  toDateInputValue,
  applyByTimeInputValue,
  formatEstimateMinutes,
} from "../formatDate";
import InterviewCountdown from "../features/interviews/InterviewCountdown";
import ModalLayer from "../ModalLayer";
import PriorityBadge from "../PriorityBadge";
import { invalidateListCache, readListCache, writeListCache } from "../listCache";
import StepActionConfirm from "../StepActionConfirm";
import AddTaskForm, { type AddTaskFormHandle } from "./AddTaskForm";
import EditSubtasksModal from "./EditSubtasksModal";
import EditTaskForm, { type EditTaskFormHandle } from "./EditTaskForm";
import TaskSubtasksPanel from "./TaskSubtasksPanel";

const TABS: TaskView[] = ["open", "completed"];

const EMPTY_COUNTS = { open: 0, completed: 0 };

type TasksSnapshot = {
  tasks: TaskRow[];
  counts: { open: number; completed: number };
  categories: TaskCategoryRow[];
};

function tasksCacheKey(view: TaskView): string {
  return `tasks:${view}`;
}

function isApplicationTask(row: TaskRow): boolean {
  return row.category === "application";
}

const SECTION_CLAMP_AFTER = 6;

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
  const [categories, setCategories] = useState<TaskCategoryRow[]>(
    () => initialSnapshot?.categories ?? [],
  );
  const [loaded, setLoaded] = useState(() => !!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [addingCategory, setAddingCategory] = useState<TaskCategoryRow | null>(null);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [renamingCategoryId, setRenamingCategoryId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renamingSaving, setRenamingSaving] = useState(false);
  const [editing, setEditing] = useState<TaskRow | null>(null);
  const [editingSubtasksFor, setEditingSubtasksFor] = useState<TaskRow | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<TaskRow | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState<TaskRow | null>(null);
  const [reopenConfirm, setReopenConfirm] = useState<TaskRow | null>(null);
  const [dueDrafts, setDueDrafts] = useState<
    Record<string, { date: string; time: string; kind: TaskDueKind }>
  >({});
  const [dueFlash, setDueFlash] = useState<Record<string, boolean>>({});
  const [weeklyAppTargetIds, setWeeklyAppTargetIds] = useState<Set<string>>(() => new Set());
  const addFormRef = useRef<AddTaskFormHandle>(null);
  const editFormRef = useRef<EditTaskFormHandle>(null);

  function browserTz(): string {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  }

  async function refreshWeeklyAppTargets() {
    try {
      const snap = await getWeeklyGoals(browserTz());
      const apps = snap.goals.find((g) => g.slot === "apps");
      setWeeklyAppTargetIds(new Set((apps?.members ?? []).map((m) => m.taskId)));
    } catch {
      /* non-blocking */
    }
  }

  function applyTasksData(data: Awaited<ReturnType<typeof getTasks>>, cacheKey: string) {
    const snapshot: TasksSnapshot = {
      tasks: data.tasks,
      counts: { ...EMPTY_COUNTS, ...data.counts },
      categories: data.categories ?? [],
    };
    writeListCache(cacheKey, snapshot);
    setRows(snapshot.tasks);
    setCounts(snapshot.counts);
    setCategories(snapshot.categories);
    setLoaded(true);
  }

  async function load() {
    const cacheKey = tasksCacheKey(view);
    const data = await getTasks(view);
    applyTasksData(data, cacheKey);
    void refreshWeeklyAppTargets();
  }

  useEffect(() => {
    let cancelled = false;
    const cacheKey = tasksCacheKey(view);
    const cached = readListCache<TasksSnapshot>(cacheKey);
    if (cached) {
      setRows(cached.tasks);
      setCounts(cached.counts);
      setCategories(cached.categories ?? []);
      setLoaded(true);
    } else {
      setLoaded(false);
    }

    getTasks(view)
      .then((data) => {
        if (cancelled) return;
        applyTasksData(data, cacheKey);
        setError(null);
        void refreshWeeklyAppTargets();
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [view]);

  function requestCloseAdd() {
    addFormRef.current?.requestClose();
  }

  function requestCloseEdit() {
    editFormRef.current?.requestClose();
  }

  function onCreated(row: TaskRow) {
    setAddingCategory(null);
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
    void refreshWeeklyAppTargets();
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
      invalidateListCache("applications:");
      invalidateListCache("jobs:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not delete task");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  async function onDuplicate(row: TaskRow) {
    if (pendingId) return;
    setPendingId(row.id);
    setError(null);
    try {
      const copy = await duplicateTask(row.id);
      invalidateListCache("tasks:");
      invalidateListCache("applications:");
      if (view === "open") {
        setRows((current) => {
          const index = current.findIndex((item) => item.id === row.id);
          if (index < 0) return [copy, ...current];
          const next = [...current];
          next.splice(index + 1, 0, copy);
          return next;
        });
        setCounts((current) => ({ ...current, open: current.open + 1 }));
      } else {
        await load();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not duplicate task");
    } finally {
      setPendingId(null);
    }
  }

  function dueDraftFor(row: TaskRow) {
    const draft = dueDrafts[row.id];
    if (draft) return draft;
    return {
      date: toDateInputValue(row.dueAt),
      time: applyByTimeInputValue(row.dueAt),
      kind: (row.dueKind ?? "deadline") as TaskDueKind,
    };
  }

  function setDueDraft(
    rowId: string,
    patch: Partial<{ date: string; time: string; kind: TaskDueKind }>,
  ) {
    setDueDrafts((current) => {
      const row = rows.find((item) => item.id === rowId);
      const base = current[rowId] ?? {
        date: toDateInputValue(row?.dueAt),
        time: applyByTimeInputValue(row?.dueAt),
        kind: (row?.dueKind ?? "deadline") as TaskDueKind,
      };
      return { ...current, [rowId]: { ...base, ...patch } };
    });
  }

  async function saveDueAt(event: FormEvent, row: TaskRow) {
    event.preventDefault();
    if (pendingId) return;
    const draft = dueDraftFor(row);
    const dueAt = draft.date ? combineApplyByDateTime(draft.date, draft.time) : null;
    const dueKind = dueAt ? draft.kind : null;
    const savedDate = toDateInputValue(row.dueAt);
    const savedTime = applyByTimeInputValue(row.dueAt);
    const savedKind = (row.dueKind ?? "deadline") as TaskDueKind;
    if (
      draft.date === savedDate &&
      draft.time === savedTime &&
      (dueAt == null || draft.kind === savedKind)
    ) {
      return;
    }
    setPendingId(row.id);
    try {
      const updated = await patchTask(row.id, { dueAt, dueKind });
      setRows((current) =>
        current.map((item) => (item.id === row.id ? updated : item)),
      );
      invalidateListCache("tasks:");
      setDueDrafts((current) => {
        const next = { ...current };
        delete next[row.id];
        return next;
      });
      setDueFlash((current) => ({ ...current, [row.id]: true }));
      window.setTimeout(() => {
        setDueFlash((current) => {
          const next = { ...current };
          delete next[row.id];
          return next;
        });
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save due date");
    } finally {
      setPendingId(null);
    }
  }

  function dueSaveEnabled(row: TaskRow): boolean {
    if (pendingId === row.id) return false;
    const draft = dueDraftFor(row);
    const savedDate = toDateInputValue(row.dueAt);
    const savedTime = applyByTimeInputValue(row.dueAt);
    const savedKind = (row.dueKind ?? "deadline") as TaskDueKind;
    return (
      draft.date !== savedDate ||
      draft.time !== savedTime ||
      (Boolean(draft.date) && draft.kind !== savedKind)
    );
  }

  async function toggleWeeklyAppTarget(row: TaskRow, member: boolean) {
    if (pendingId) return;
    setPendingId(row.id);
    try {
      const snap = await setWeeklyAppTargetMember(browserTz(), row.id, member);
      const apps = snap.goals.find((g) => g.slot === "apps");
      setWeeklyAppTargetIds(new Set((apps?.members ?? []).map((m) => m.taskId)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update weekly target");
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
      completed: isApplicationTask(row) ? current.completed : current.completed + 1,
    }));
    try {
      await completeTask(row.id);
      invalidateListCache("tasks:");
      invalidateListCache("applications:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete task");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  async function confirmReopen() {
    if (!reopenConfirm) return;
    const row = reopenConfirm;
    setReopenConfirm(null);
    setPendingId(row.id);
    setRows((current) => current.filter((item) => item.id !== row.id));
    setCounts((current) => ({
      open: current.open + 1,
      completed: Math.max(0, current.completed - 1),
    }));
    try {
      await reopenTask(row.id);
      invalidateListCache("tasks:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reopen task");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }


  const miscCategories = categories.filter((c) => c.kind === "misc");

  async function onCreateCategory(event: FormEvent) {
    event.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    setCreatingCategory(true);
    setError(null);
    try {
      await createTaskCategory(name);
      setNewCategoryName("");
      invalidateListCache("tasks:");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create category");
    } finally {
      setCreatingCategory(false);
    }
  }

  function startRename(category: TaskCategoryRow) {
    if (category.kind === "application" || category.system) return;
    setRenamingCategoryId(category.id);
    setRenameDraft(category.name);
  }

  async function saveRename(categoryId: string) {
    const name = renameDraft.trim();
    if (!name) return;
    setRenamingSaving(true);
    setError(null);
    try {
      await renameTaskCategory(categoryId, name);
      setRenamingCategoryId(null);
      invalidateListCache("tasks:");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rename category");
    } finally {
      setRenamingSaving(false);
    }
  }

  async function moveTask(row: TaskRow, nextCategoryId: string) {
    if (row.category === "application" || nextCategoryId === row.categoryId) return;
    setPendingId(row.id);
    setError(null);
    try {
      const updated = await patchTask(row.id, { categoryId: nextCategoryId });
      setRows((current) => current.map((item) => (item.id === row.id ? updated : item)));
      invalidateListCache("tasks:");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not move task");
    } finally {
      setPendingId(null);
    }
  }

  function renderTaskCard(row: TaskRow) {
    const completedLabel = formatShortDate(row.completedAt);
    const application = isApplicationTask(row);
    const dueDraft = dueDraftFor(row);
    const linkLabel = application ? "Apply" : "Open link";
    const deadlineLabel = row.dueAt
      ? application
        ? applyByLabel(row.dueAt)
        : dueLabel(row.dueAt)
      : null;
    return (
      <article key={row.id} className="card application-card task-card">
        <div className="task-card-header">
          <h2 className="application-card-title task-card-header-title task-title-line">
            <PriorityBadge priority={row.priority} />
            <span className="task-title-text">{row.title}</span>
            {formatEstimateMinutes(row.estimateMinutes) && (
              <span className="task-estimate-inline">
                {formatEstimateMinutes(row.estimateMinutes)}
              </span>
            )}
          </h2>
          <div className="meta application-card-meta task-card-header-meta">
            {row.organization && <span className="employer">{row.organization}</span>}
            {application && row.location && (
              <span className="location">{row.location}</span>
            )}
            {!application && view === "completed" && (
              <span className="task-category-pill">{row.categoryName}</span>
            )}
          </div>
          {view === "open" && row.dueAt && (
            <div className="application-card-aside-countdown task-card-header-aside">
              {deadlineLabel && (
                <div className="task-card-deadline-label">{deadlineLabel}</div>
              )}
              <InterviewCountdown target={row.dueAt} />
            </div>
          )}
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
                className="task-duplicate-btn"
                aria-label="Duplicate task"
                title="Duplicate task"
                disabled={pendingId === row.id}
                onClick={() => void onDuplicate(row)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <rect x="8" y="8" width="11" height="11" rx="1.5" />
                  <path d="M5 15V5.5A1.5 1.5 0 0 1 6.5 4H15" />
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
        </div>
        {view === "open" && !application && (
          <TaskSubtasksPanel
            task={row}
            disabled={pendingId === row.id}
            onChanged={() => {
              invalidateListCache("tasks:");
              void load().catch((err: Error) => setError(err.message));
            }}
            onError={(message) => setError(message)}
          />
        )}
        {(view === "open" || row.url || completedLabel) && (
          <div className="row-actions application-card-footer application-card-footer-todo">
            {view === "open" && (
              <form
                className="application-card-apply-by"
                onSubmit={(event) => void saveDueAt(event, row)}
              >
                <label className="application-apply-by-field">
                  <span className="visually-hidden">Date kind</span>
                  <select
                    className="application-apply-by-kind"
                    value={dueDraft.kind}
                    disabled={pendingId === row.id || !dueDraft.date}
                    aria-label="Date kind"
                    onChange={(event) =>
                      setDueDraft(row.id, { kind: event.target.value as TaskDueKind })
                    }
                  >
                    <option value="deadline">Deadline</option>
                    <option value="target">Target</option>
                  </select>
                </label>
                <label className="application-apply-by-field">
                  <span className="visually-hidden">Date</span>
                  <input
                    type="date"
                    value={dueDraft.date}
                    disabled={pendingId === row.id}
                    aria-label="Due date"
                    onChange={(event) => setDueDraft(row.id, { date: event.target.value })}
                  />
                </label>
                <label className="application-apply-by-field">
                  <span className="visually-hidden">Time</span>
                  <input
                    type="time"
                    value={dueDraft.time}
                    disabled={pendingId === row.id || !dueDraft.date}
                    aria-label="Due time"
                    onChange={(event) => setDueDraft(row.id, { time: event.target.value })}
                  />
                </label>
                <button
                  type="submit"
                  className="secondary"
                  disabled={!dueSaveEnabled(row)}
                >
                  Save
                </button>
                {dueFlash[row.id] && (
                  <span className="save-flash-inline" role="status" aria-live="polite">
                    Saved!
                  </span>
                )}
              </form>
            )}
            {view === "open" && application && (
              <label className="task-weekly-target-toggle">
                <input
                  type="checkbox"
                  checked={weeklyAppTargetIds.has(row.id)}
                  disabled={pendingId === row.id}
                  onChange={(event) =>
                    void toggleWeeklyAppTarget(row, event.target.checked)
                  }
                />
                <span>Target this week</span>
              </label>
            )}
            <div className="application-card-footer-actions">
              {row.url && (
                <a
                  className="external application-card-apply-link"
                  href={row.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {linkLabel}
                  <span className="ext-icon" aria-hidden="true">↗</span>
                </a>
              )}
              {view === "open" && !application && (
                <button
                  type="button"
                  className="secondary"
                  disabled={pendingId === row.id}
                  onClick={() => setEditingSubtasksFor(row)}
                >
                  Edit subtasks
                </button>
              )}
              {view === "open" && (
                <button
                  type="button"
                  className="secondary"
                  disabled={pendingId === row.id}
                  onClick={() => setCompleteConfirm(row)}
                >
                  {application ? "Mark applied" : "Complete"}
                </button>
              )}
              {view === "open" && !application && (
                <label className="task-move-field">
                  <span className="visually-hidden">Move to category</span>
                  <select
                    className="task-move-select"
                    value={row.categoryId}
                    disabled={pendingId === row.id}
                    aria-label="Move to category"
                    onChange={(event) => void moveTask(row, event.target.value)}
                  >
                    {miscCategories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {view === "completed" && !application && (
                <button
                  type="button"
                  className="secondary"
                  disabled={pendingId === row.id}
                  onClick={() => setReopenConfirm(row)}
                >
                  Mark to-do
                </button>
              )}
              {view === "completed" && completedLabel && (
                <span className="applied-date">Completed: {completedLabel}</span>
              )}
            </div>
          </div>
        )}
      </article>
    );
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
              <span className="tab-label">{tab === "open" ? "open" : "completed"}</span>
              <span className="tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>
      </div>
      {error && <p className="error">{error}</p>}
      {!loaded && rows.length === 0 && <p className="muted">Loading…</p>}
      {view === "open" && loaded && (
        <div className="task-board">
          {categories.map((category) => {
            const sectionTasks = rows
              .filter((row) => row.categoryId === category.id)
              .slice()
              .sort((a, b) => {
                if (category.kind !== "application") return 0;
                const aTarget = weeklyAppTargetIds.has(a.id) ? 0 : 1;
                const bTarget = weeklyAppTargetIds.has(b.id) ? 0 : 1;
                return aTarget - bTarget;
              });
            const empty = sectionTasks.length === 0;
            const clamp = sectionTasks.length > SECTION_CLAMP_AFTER;
            return (
              <section
                key={category.id}
                className={
                  empty
                    ? "task-section task-section-empty"
                    : clamp
                      ? "task-section task-section-scroll"
                      : "task-section"
                }
              >
                <header className="task-section-header">
                  <div className="task-section-title-row">
                    {renamingCategoryId === category.id ? (
                      <form
                        className="task-section-rename"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void saveRename(category.id);
                        }}
                      >
                        <input
                          type="text"
                          value={renameDraft}
                          autoFocus
                          aria-label="Category name"
                          disabled={renamingSaving}
                          onChange={(event) => setRenameDraft(event.target.value)}
                          onKeyDown={(event) => {
                            if (event.key === "Escape") {
                              event.preventDefault();
                              setRenamingCategoryId(null);
                            }
                          }}
                        />
                        <button type="submit" className="secondary" disabled={renamingSaving || !renameDraft.trim()}>
                          Save
                        </button>
                        <button
                          type="button"
                          className="secondary"
                          disabled={renamingSaving}
                          onClick={() => setRenamingCategoryId(null)}
                        >
                          Cancel
                        </button>
                      </form>
                    ) : (
                      <>
                        <h2 className="task-section-title">{category.name}</h2>
                        <span className="task-section-count">{sectionTasks.length}</span>
                        {category.kind === "misc" && !category.system && (
                          <button
                            type="button"
                            className="task-section-rename-btn"
                            aria-label={`Rename ${category.name}`}
                            onClick={() => startRename(category)}
                          >
                            <svg viewBox="0 0 24 24" aria-hidden="true">
                              <path d="M4 20h4l10.5-10.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
                              <path d="M13.5 6.5l3 3" />
                            </svg>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    className="secondary task-section-add"
                    onClick={() => setAddingCategory(category)}
                  >
                    Add
                  </button>
                </header>
                {!empty && (
                  <div className="task-section-body">
                    {sectionTasks.map((row) => renderTaskCard(row))}
                  </div>
                )}
              </section>
            );
          })}
          <form className="task-new-category" onSubmit={(event) => void onCreateCategory(event)}>
            <input
              type="text"
              value={newCategoryName}
              placeholder="New category name"
              onChange={(event) => setNewCategoryName(event.target.value)}
              aria-label="New category name"
            />
            <button type="submit" className="secondary" disabled={creatingCategory || !newCategoryName.trim()}>
              {creatingCategory ? "Adding…" : "Add category"}
            </button>
          </form>
        </div>
      )}
      {view === "completed" && loaded && rows.length === 0 && (
        <p className="muted">Nothing in this tab yet.</p>
      )}
      {view === "completed" && rows.map((row) => renderTaskCard(row))}
      {addingCategory && (
        <ModalLayer
          labelledBy="add-task-title"
          onClose={requestCloseAdd}
        >
          <AddTaskForm
            ref={addFormRef}
            categoryId={addingCategory.id}
            categoryKind={addingCategory.kind}
            categoryName={addingCategory.name}
            onCreated={onCreated}
            onCancel={() => setAddingCategory(null)}
          />
        </ModalLayer>
      )}
      {editing && (
        <ModalLayer
          labelledBy="edit-task-title"
          onClose={requestCloseEdit}
        >
          <EditTaskForm
            ref={editFormRef}
            task={editing}
            miscCategories={miscCategories}
            onSaved={onEdited}
            onCancel={() => setEditing(null)}
          />
        </ModalLayer>
      )}
      {editingSubtasksFor && (
        <EditSubtasksModal
          task={editingSubtasksFor}
          onCancel={() => setEditingSubtasksFor(null)}
          onSaved={() => {
            setEditingSubtasksFor(null);
            invalidateListCache("tasks:");
            void load().catch((err: Error) => setError(err.message));
          }}
        />
      )}
      {removeConfirm && (
        <ModalLayer onClose={() => setRemoveConfirm(null)}>
          <StepActionConfirm
            title="Delete task?"
            description="This permanently removes the task. You can add a new one with the right category if needed."
            confirmLabel="Delete"
            onConfirm={() => void confirmRemove()}
            onCancel={() => setRemoveConfirm(null)}
          />
        </ModalLayer>
      )}
      {completeConfirm && (
        <ModalLayer onClose={() => setCompleteConfirm(null)}>
          <StepActionConfirm
            title={
              isApplicationTask(completeConfirm)
                ? "Mark as applied?"
                : "Mark task complete?"
            }
            description={
              isApplicationTask(completeConfirm)
                ? "This moves the application to Applied with today's date and removes the task from your open list."
                : "This archives the task to Completed. You can still refer back to it there."
            }
            confirmLabel={isApplicationTask(completeConfirm) ? "Applied" : "Complete"}
            onConfirm={() => void confirmComplete()}
            onCancel={() => setCompleteConfirm(null)}
          />
        </ModalLayer>
      )}
      {reopenConfirm && (
        <ModalLayer onClose={() => setReopenConfirm(null)}>
          <StepActionConfirm
            title="Move back to open?"
            description="This returns the task to your open list and clears the completed date."
            confirmLabel="Mark to-do"
            onConfirm={() => void confirmReopen()}
            onCancel={() => setReopenConfirm(null)}
          />
        </ModalLayer>
      )}
    </section>
  );
}
