import { useEffect, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  completeTask,
  getTask,
  getTaskCategories,
  getTaskReflections,
  getWeeklyGoals,
  patchTask,
  reopenTask,
  setWeeklyAppTargetMember,
  type PointsEarnInfo,
  type ProgressReflection,
  type TaskCategoryRow,
  type TaskDueKind,
  type TaskPriority,
  type TaskRow,
  type TaskSubtaskRow,
} from "../api";
import DeadlineUrgency from "../DeadlineUrgency";
import CompleteWorkModal, {
  type CompleteWorkResult,
} from "../features/completion/CompleteWorkModal";
import EarnFlash from "../features/completion/EarnFlash";
import {
  defaultLaneForTask,
} from "../features/completion/completeWorkActions";
import ReflectionsPanel from "../features/reflections/ReflectionsPanel";
import {
  applyByTimeInputValue,
  combineApplyByDateTime,
  formatDueDateMdY,
  toDateInputValue,
} from "../formatDate";
import { invalidateListCache } from "../listCache";
import LocationSuggest from "../LocationSuggest";
import ModalLayer from "../ModalLayer";
import { listReturnTo } from "../navigationReturn";
import PriorityBadge, { PrioritySelect } from "../PriorityBadge";
import RichTextField, { isEmptyRichHtml } from "../RichTextField";
import StepActionConfirm from "../StepActionConfirm";
import EditSubtasksModal from "./EditSubtasksModal";
import TaskSubtasksPanel from "./TaskSubtasksPanel";

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Earliest still-open subtask that has a due date. */
function earliestOpenDatedSubtask(
  subtasks: TaskSubtaskRow[],
): TaskSubtaskRow | null {
  const openDated = subtasks
    .filter((s) => s.status === "open" && s.dueAt)
    .sort(
      (a, b) =>
        new Date(a.dueAt!).getTime() - new Date(b.dueAt!).getTime(),
    );
  return openDated[0] ?? null;
}

export default function TaskDetailPage() {
  const { taskId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [task, setTask] = useState<TaskRow | null>(null);
  const [miscCategories, setMiscCategories] = useState<TaskCategoryRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [flash, setFlash] = useState<string | null>(null);
  const [earnFlash, setEarnFlash] = useState<PointsEarnInfo | null>(null);
  const [completeConfirm, setCompleteConfirm] = useState(false);
  const [reopenConfirm, setReopenConfirm] = useState(false);
  const [editingSubtasks, setEditingSubtasks] = useState(false);
  const [weeklyTarget, setWeeklyTarget] = useState(false);
  const [reflections, setReflections] = useState<ProgressReflection[]>([]);

  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [locationText, setLocationText] = useState("");
  const [url, setUrl] = useState("");
  const [notes, setNotes] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("");
  const [dueKind, setDueKind] = useState<TaskDueKind>("deadline");
  const [categoryId, setCategoryId] = useState("");
  const [priority, setPriority] = useState<TaskPriority | null>(null);
  const [estimateMinutes, setEstimateMinutes] = useState("");
  const [actualMinutes, setActualMinutes] = useState("");

  const isApplication = task?.category === "application";
  const showDescriptionEditor = Boolean(isApplication && task && !task.postingId);
  const backTo = listReturnTo(location, "/tasks");
  const canEditActual =
    Boolean(task && task.status === "completed" && task.category === "misc");

  function hydrateForm(row: TaskRow) {
    setTitle(row.title);
    setOrganization(row.organization ?? "");
    setLocationText(row.location ?? "");
    setUrl(row.url ?? "");
    setNotes(row.notes ?? "");
    setDescriptionHtml(row.descriptionHtml ?? "");
    setDueDate(toDateInputValue(row.dueAt));
    setDueTime(applyByTimeInputValue(row.dueAt));
    setDueKind(row.dueKind ?? "deadline");
    setCategoryId(row.categoryId);
    setPriority(row.priority ?? null);
    setEstimateMinutes(row.estimateMinutes != null ? String(row.estimateMinutes) : "");
    setActualMinutes(row.actualMinutes != null ? String(row.actualMinutes) : "");
  }

  async function load() {
    if (!taskId) return;
    const [row, cats, refl] = await Promise.all([
      getTask(taskId),
      getTaskCategories(),
      getTaskReflections(taskId),
    ]);
    setTask(row);
    hydrateForm(row);
    setReflections(refl.reflections);
    setMiscCategories(cats.categories.filter((c) => c.kind === "misc"));
    if (row.category === "application") {
      try {
        const snap = await getWeeklyGoals(browserTz());
        const apps = snap.goals.find((g) => g.slot === "apps");
        setWeeklyTarget(Boolean(apps?.members.some((m) => m.taskId === row.id)));
      } catch {
        setWeeklyTarget(false);
      }
    }
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [taskId]);

  async function saveDetails(event: FormEvent) {
    event.preventDefault();
    if (!task) return;
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
      let actual: number | null | undefined = undefined;
      if (canEditActual) {
        actual =
          actualMinutes.trim() === "" ? null : Number(actualMinutes.trim());
        if (
          actualMinutes.trim() !== "" &&
          (!Number.isInteger(actual) || (actual ?? 0) <= 0)
        ) {
          setError("Actual time must be a positive number of minutes");
          setSaving(false);
          return;
        }
      }
      const body: Record<string, unknown> = {
        title: title.trim(),
        organization: organization.trim() || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
        dueAt,
        dueKind: dueAt ? dueKind : null,
        priority,
        estimateMinutes: estimate,
      };
      if (canEditActual) {
        body.actualMinutes = actual ?? null;
      }
      if (!isApplication && categoryId !== task.categoryId) {
        body.categoryId = categoryId;
      }
      if (isApplication) {
        body.location = locationText.trim() || null;
        if (showDescriptionEditor) {
          body.descriptionHtml = isEmptyRichHtml(descriptionHtml) ? null : descriptionHtml;
        }
      }
      const { points, ...row } = await patchTask(task.id, body);
      if (isApplication) {
        await setWeeklyAppTargetMember(browserTz(), task.id, weeklyTarget);
      }
      if (points) setEarnFlash(points);
      setTask(row);
      hydrateForm(row);
      invalidateListCache("tasks:");
      setFlash("Saved!");
      window.setTimeout(() => setFlash(null), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }

  async function onComplete(result: CompleteWorkResult) {
    if (!task) return;
    setSaving(true);
    try {
      const row = await completeTask(task.id, {
        actualMinutes: result.actualMinutes,
        notes: result.notes,
        reflection: result.reflection
          ? { lane: result.reflection.lane, body: result.reflection.body }
          : null,
      });
      setCompleteConfirm(false);
      invalidateListCache("tasks:");
      invalidateListCache("applications:");
      if (row.category === "application" && row.applicationId) {
        navigate(`/applications/${row.applicationId}`, {
          state: row.points ? { earnFlash: row.points } : undefined,
        });
        return;
      }
      if (row.points) setEarnFlash(row.points);
      setTask(row);
      hydrateForm(row);
      const refl = await getTaskReflections(task.id);
      setReflections(refl.reflections);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not complete");
    } finally {
      setSaving(false);
    }
  }

  async function onReopen() {
    if (!task) return;
    setReopenConfirm(false);
    try {
      const row = await reopenTask(task.id);
      invalidateListCache("tasks:");
      setTask(row);
      hydrateForm(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reopen");
    }
  }

  async function toggleWeekly(next: boolean) {
    if (!task || !isApplication) return;
    setWeeklyTarget(next);
    try {
      await setWeeklyAppTargetMember(browserTz(), task.id, next);
      invalidateListCache("tasks:");
    } catch (err) {
      setWeeklyTarget(!next);
      setError(err instanceof Error ? err.message : "Could not update weekly target");
    }
  }

  if (!task && error) return <p className="error">{error}</p>;
  if (!task) return <p className="muted">Loading…</p>;

  const dueDateLabel = formatDueDateMdY(task.dueAt);
  const kindLabel =
    task.dueAt == null
      ? null
      : `${task.dueKind === "target" ? "Target" : "Deadline"}: ${dueDateLabel}`;
  const subtasks = task.subtasks ?? [];
  const subDone = subtasks.filter((s) => s.status === "completed").length;
  const earliestSub = earliestOpenDatedSubtask(subtasks);
  const earliestKindLabel =
    earliestSub?.dueAt == null
      ? null
      : earliestSub.dueKind === "target"
        ? "Earliest target date"
        : "Earliest deadline";
  const jdPlain = (task.descriptionHtml ?? "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return (
    <article className="task-detail-page">
      <EarnFlash earn={earnFlash} onDismiss={() => setEarnFlash(null)} />
      <header className="task-detail-header">
        <p className="task-detail-back muted">
          <Link to={backTo}>← Tasks</Link>
        </p>
        <div className="task-detail-header-top">
          <h2 className="task-detail-title task-title-line">
            <PriorityBadge priority={task.priority} />
            <span className="task-title-text">{task.title}</span>
            {isApplication && (
              <button
                type="button"
                className={weeklyTarget ? "task-detail-week-star is-on" : "task-detail-week-star"}
                aria-pressed={weeklyTarget}
                disabled={task.status !== "open"}
                onClick={() => void toggleWeekly(!weeklyTarget)}
              >
                {weeklyTarget ? "★ This week" : "☆ This week"}
              </button>
            )}
          </h2>
          {task.status === "open" ? (
            <button
              type="button"
              className="secondary"
              onClick={() => setCompleteConfirm(true)}
            >
              {isApplication ? "Mark applied" : "Complete"}
            </button>
          ) : (
            !isApplication && (
              <button type="button" className="secondary" onClick={() => setReopenConfirm(true)}>
                Mark to-do
              </button>
            )
          )}
        </div>
        <div className="task-detail-meta">
          {!isApplication && <span>{task.categoryName}</span>}
          {task.organization && (
            <>
              {!isApplication && <span className="task-detail-meta-dot">·</span>}
              <span>{task.organization}</span>
            </>
          )}
          {isApplication && task.location && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <span>{task.location}</span>
            </>
          )}
          {isApplication && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <span>Applications</span>
            </>
          )}
          {kindLabel && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <span>{kindLabel}</span>
            </>
          )}
          {task.status === "open" && task.dueAt && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <DeadlineUrgency dueAt={task.dueAt} dueKind={task.dueKind} />
            </>
          )}
          {task.status === "completed" &&
            !isApplication &&
            (task.estimateMinutes != null ||
              task.actualMinutes != null ||
              (task.pointsEarned != null && task.pointsEarned > 0)) && (
              <>
                <span className="task-detail-meta-dot">·</span>
                <span className="task-completed-meta">
                  {(task.estimateMinutes != null || task.actualMinutes != null) && (
                    <span>
                      {task.estimateMinutes != null
                        ? `est ${task.estimateMinutes}`
                        : "est —"}
                      {" / "}
                      {task.actualMinutes != null
                        ? `actual ${task.actualMinutes}`
                        : "actual —"}
                    </span>
                  )}
                  {task.pointsEarned != null && task.pointsEarned > 0 && (
                    <span className="task-completed-pts">
                      +{task.pointsEarned} pts
                    </span>
                  )}
                </span>
              </>
            )}
          {task.postingId && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <Link to={`/jobs/${task.postingId}`}>Linked posting</Link>
            </>
          )}
          {task.applicationId && task.status !== "open" && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <Link to={`/applications/${task.applicationId}`}>View application →</Link>
            </>
          )}
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      {!isApplication && subtasks.length > 0 && (
        <section className="task-detail-section">
          <div className="task-detail-section-head">
            <h3>
              Subtasks ({subDone}/{subtasks.length})
            </h3>
            {task.status === "open" && (
              <button
                type="button"
                className="secondary"
                onClick={() => setEditingSubtasks(true)}
              >
                Edit subtasks
              </button>
            )}
          </div>
          {task.status === "open" && earliestSub?.dueAt && earliestKindLabel && (
            <p className="task-detail-subtasks-earliest">
              <span>
                {earliestKindLabel}: {formatDueDateMdY(earliestSub.dueAt)}
              </span>
              <span className="task-detail-meta-dot">·</span>
              <DeadlineUrgency
                dueAt={earliestSub.dueAt}
                dueKind={earliestSub.dueKind}
              />
            </p>
          )}
          <TaskSubtasksPanel
            task={task}
            disabled={task.status !== "open"}
            onChanged={() => {
              invalidateListCache("tasks:");
              void load().catch((err: Error) => setError(err.message));
            }}
            onError={(message) => setError(message)}
          />
        </section>
      )}

      {isApplication && (jdPlain || showDescriptionEditor) && (
        <section className="task-detail-section">
          <div className="task-detail-section-head">
            <h3>Job description</h3>
            {task.url && (
              <a className="external" href={task.url} target="_blank" rel="noreferrer">
                Open posting
                <span className="ext-icon" aria-hidden="true">
                  ↗
                </span>
              </a>
            )}
          </div>
          {showDescriptionEditor ? (
            <div className="task-detail-jd-scroll is-editable">
              <RichTextField
                value={descriptionHtml}
                onChange={setDescriptionHtml}
                placeholder="Paste the job description"
                minHeight="8rem"
              />
            </div>
          ) : (
            <div
              className="task-detail-jd-scroll"
              dangerouslySetInnerHTML={{
                __html:
                  task.descriptionHtml ||
                  "<p class='muted'>No description stored.</p>",
              }}
            />
          )}
        </section>
      )}

      <div className="task-detail-twin">
        <section className="task-detail-section task-detail-section-fill">
          <h3>Edit details</h3>
          <form className="task-detail-edit-form" onSubmit={(e) => void saveDetails(e)}>
            <div className="task-detail-edit-scroll">
              <label>
                Title
                <input
                  value={title}
                  required
                  onChange={(e) => setTitle(e.target.value)}
                />
              </label>
              <label>
                {isApplication ? "Company" : "Organization"}
                <input
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </label>
              <label className="task-detail-span-2">
                Link
                <input
                  type="url"
                  value={url}
                  placeholder="https://"
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              {isApplication ? (
                <>
                  <label className="task-detail-span-2">
                    Location
                    <LocationSuggest value={locationText} onChange={setLocationText} />
                  </label>
                  <div className="task-detail-meta-row task-detail-meta-row-2">
                    <label>
                      Priority
                      <PrioritySelect value={priority} onChange={setPriority} />
                    </label>
                    <label>
                      Estimate (min)
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={estimateMinutes}
                        onChange={(e) => setEstimateMinutes(e.target.value)}
                      />
                    </label>
                  </div>
                </>
              ) : (
                <>
                  <div
                    className={
                      canEditActual
                        ? "task-detail-meta-row task-detail-meta-row-4"
                        : "task-detail-meta-row"
                    }
                  >
                    <label>
                      Category
                      <select
                        value={categoryId}
                        onChange={(e) => setCategoryId(e.target.value)}
                      >
                        {miscCategories.map((cat) => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Priority
                      <PrioritySelect value={priority} onChange={setPriority} />
                    </label>
                    <label>
                      Estimate (min)
                      <input
                        type="number"
                        min={1}
                        step={1}
                        value={estimateMinutes}
                        onChange={(e) => setEstimateMinutes(e.target.value)}
                      />
                    </label>
                    {canEditActual && (
                      <label>
                        Actual (min)
                        <input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          placeholder="15"
                          value={actualMinutes}
                          onChange={(e) => setActualMinutes(e.target.value)}
                        />
                      </label>
                    )}
                  </div>
                </>
              )}
              <div className="task-detail-due-row">
                <label>
                  Date kind
                  <select
                    value={dueKind}
                    disabled={!dueDate}
                    onChange={(e) => setDueKind(e.target.value as TaskDueKind)}
                  >
                    <option value="deadline">Deadline</option>
                    <option value="target">Target</option>
                  </select>
                </label>
                <label>
                  Due date
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </label>
                <label>
                  Due time
                  <input
                    type="time"
                    value={dueTime}
                    disabled={!dueDate}
                    onChange={(e) => setDueTime(e.target.value)}
                  />
                </label>
              </div>
              <label className="task-detail-span-2">
                Notes
                <textarea
                  value={notes}
                  rows={5}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </label>
            </div>
            <div className="task-detail-form-actions">
              {flash && (
                <span className="save-flash-inline" role="status">
                  {flash}
                </span>
              )}
              <button type="submit" className="secondary" disabled={saving || !title.trim()}>
                {saving ? "Saving…" : "Save details"}
              </button>
            </div>
          </form>
        </section>

        <ReflectionsPanel
          host={{
            kind: "task",
            taskId: task.id,
            defaultLane: isApplication ? "application" : "other",
          }}
          reflections={reflections}
          onChanged={() => {
            void load().catch((err: Error) => setError(err.message));
          }}
          onError={(message) => setError(message)}
        />
      </div>

      {editingSubtasks && (
        <EditSubtasksModal
          task={task}
          onCancel={() => setEditingSubtasks(false)}
          onSaved={() => {
            setEditingSubtasks(false);
            invalidateListCache("tasks:");
            void load().catch((err: Error) => setError(err.message));
          }}
        />
      )}
      {completeConfirm && task && (
        <CompleteWorkModal
          title={isApplication ? "Mark applied?" : "Complete task?"}
          contextLabel={
            task.organization ? `${task.organization} · ${task.title}` : task.title
          }
          description={
            isApplication
              ? "This creates/updates the application tracker row and removes the task from Open."
              : "The task will move to Completed."
          }
          confirmLabel={isApplication ? "Mark applied" : "Complete"}
          defaultLane={defaultLaneForTask(isApplication)}
          estimateMinutes={isApplication ? null : task.estimateMinutes}
          pending={saving}
          onCancel={() => setCompleteConfirm(false)}
          onConfirm={(result) => void onComplete(result)}
        />
      )}
      {reopenConfirm && (
        <ModalLayer onClose={() => setReopenConfirm(false)}>
          <StepActionConfirm
            title="Mark to-do?"
            description="This task will return to the Open tab."
            confirmLabel="Mark to-do"
            onCancel={() => setReopenConfirm(false)}
            onConfirm={() => void onReopen()}
          />
        </ModalLayer>
      )}
    </article>
  );
}
