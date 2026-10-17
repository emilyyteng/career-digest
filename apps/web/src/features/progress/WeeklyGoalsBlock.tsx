/**
 * Progress weekly goals column (F11 M3-03): apps + LC + customs, + / Active|Archived,
 * pencil (rename/archive), near-label Target stepper. Incrementer is M3-04.
 */
import { useEffect, useId, useState } from "react";
import { Link } from "react-router-dom";
import {
  archiveCustomWeeklyGoal,
  createCustomWeeklyGoal,
  getWeeklyGoals,
  patchCustomWeeklyTarget,
  patchWeeklyLcGoal,
  renameCustomWeeklyGoal,
  restoreCustomWeeklyGoal,
  type CustomWeeklyGoalView,
  type LeetcodeTierCounts,
  type WeeklyGoalView,
  type WeeklyGoalsSnapshot,
  type WeeklyPaceLabel,
} from "../../api";
import ModalLayer from "../../ModalLayer";
import {
  Button,
  ChromeTab,
  ModalBody,
  ModalFooter,
  ModalHeader,
  TextField,
} from "../../ui";
import { lcCountsLine } from "./LeetcodeLogger";

const LC_LABEL_MAX = 50;
/** Display-only weeks-in-a-row flame (R3.9 / F08 R5.28). */
const WEEKLY_STREAK_SHOW_FROM = 2;
/** Active custom weekly targets cap (R.7). */
const CUSTOM_WEEKLY_CAP = 6;
const DEFAULT_CREATE_TARGET = 3;

type Section = "active" | "archived";

function visibleCharLength(value: string): number {
  return Array.from(value).length;
}

function paceClass(label: WeeklyPaceLabel): string {
  if (label === "behind") return "weekly-pace behind";
  return "weekly-pace on-track";
}

function paceText(done: number, total: number, pace: WeeklyGoalView["pace"]): string {
  if (total > 0 && done >= total) return "met";
  if (pace.label === "ahead") return `${pace.amount} ahead`;
  if (pace.label === "behind") return `${pace.amount} behind`;
  return "on track";
}

function GoalBar({
  done,
  total,
  showOverflow,
}: {
  done: number;
  total: number;
  showOverflow?: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const over = showOverflow && total > 0 && done > total ? done - total : 0;
  const bar = (
    <div
      className="weekly-goal-bar"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
  if (!showOverflow) return bar;
  return (
    <div className="weekly-goal-bar-wrap">
      {bar}
      {over > 0 && (
        <span className="weekly-goal-bar-over" aria-label={`${over} past target`}>
          +{over}
        </span>
      )}
    </div>
  );
}

function WeeklyStreak({ weeks }: { weeks: number }) {
  if (weeks < WEEKLY_STREAK_SHOW_FROM) return null;
  const text = weeks === 1 ? "1 week in a row" : `${weeks} weeks in a row`;
  return (
    <span className="weekly-goal-streak" aria-label={text}>
      <span className="weekly-goal-streak-flame" aria-hidden="true">
        🔥
      </span>
      <span>{text}</span>
    </span>
  );
}

/** Near-label Target stepper for LC + customs (R3.6). */
function TargetStepper({
  value,
  label,
  disabled,
  onChange,
  /** When false, only − N + shows (outer label supplies the word). */
  showCaption = true,
}: {
  value: number;
  label: string;
  disabled?: boolean;
  onChange: (n: number) => void;
  showCaption?: boolean;
}) {
  return (
    <div className="weekly-goal-target-step">
      {showCaption && <span className="muted">Target</span>}
      <span className="weekly-goal-target-controls" role="group" aria-label={`${label} weekly target`}>
        <Button
          size="sm"
          variant="ghost"
          className="weekly-goal-target-btn"
          disabled={disabled || value <= 1}
          aria-label={`Decrease ${label} target`}
          onClick={() => onChange(Math.max(1, value - 1))}
        >
          −
        </Button>
        <span className="weekly-goal-target-n">{value}</span>
        <Button
          size="sm"
          variant="ghost"
          className="weekly-goal-target-btn"
          disabled={disabled}
          aria-label={`Increase ${label} target`}
          onClick={() => onChange(value + 1)}
        >
          +
        </Button>
      </span>
    </div>
  );
}

function LabelLine({
  label,
  onSave,
}: {
  label: string | null;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(label ?? "");
  const length = visibleCharLength(draft);

  if (!editing) {
    return (
      <div className="weekly-goal-label-line">
        {label ? <span className="weekly-goal-label-text">{label}</span> : null}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDraft(label ?? "");
            setEditing(true);
          }}
        >
          {label ? "Edit label" : "+ Add label"}
        </Button>
      </div>
    );
  }

  return (
    <div className="weekly-goal-label-edit">
      <TextField
        type="text"
        autoFocus
        value={draft}
        placeholder="e.g. Grind 75 Week 4"
        aria-label="LC goal label"
        onChange={(event) => {
          const next = event.target.value;
          if (visibleCharLength(next) <= LC_LABEL_MAX) setDraft(next);
        }}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            void onSave(draft.trim()).then(() => setEditing(false));
          }
          if (event.key === "Escape") {
            event.preventDefault();
            setDraft(label ?? "");
            setEditing(false);
          }
        }}
      />
      <span className={length >= LC_LABEL_MAX ? "weekly-goal-counter is-max" : "weekly-goal-counter"}>
        {length}/{LC_LABEL_MAX}
      </span>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          setDraft(label ?? "");
          setEditing(false);
        }}
      >
        Cancel
      </Button>
      <Button
        variant="primary"
        size="sm"
        onClick={() => void onSave(draft.trim()).then(() => setEditing(false))}
      >
        Save
      </Button>
    </div>
  );
}

function AppsMembers({ goal }: { goal: WeeklyGoalView }) {
  const n = goal.members.length;
  if (n === 0) {
    return (
      <p className="muted weekly-goal-empty">
        No tagged applications. Tag application tasks as “Target this week” on Tasks.
      </p>
    );
  }
  const summary =
    n === 1 ? "1 tagged application" : `${n} tagged applications`;
  return (
    <details className="weekly-goal-apps-drop">
      <summary className="weekly-goal-apps-summary">{summary}</summary>
      <ul className="weekly-goal-apps-plain">
        {goal.members.map((m) => {
          const name = m.organization ? `${m.organization} · ${m.title}` : m.title;
          return (
            <li key={m.taskId} className={m.status === "completed" ? "is-done" : undefined}>
              <Link to={`/tasks/${m.taskId}`}>{name}</Link>
              {m.status === "completed" && <span className="weekly-goal-applied-tag">applied</span>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}

function SlotRow({
  goal,
  busy,
  onLcTarget,
  onLcLabel,
  lcToday,
  lcWeek,
}: {
  goal: WeeklyGoalView;
  busy: boolean;
  onLcTarget?: (n: number) => void;
  onLcLabel?: (label: string) => Promise<void>;
  lcToday?: LeetcodeTierCounts;
  lcWeek?: LeetcodeTierCounts;
}) {
  const showBar = goal.total > 0;
  const showPace = goal.total > 0;
  return (
    <div className="weekly-goal-row">
      <div className="weekly-goal-row-head weekly-goal-row-head-spread">
        <div className="weekly-goal-row-head-main">
          <strong className="weekly-goal-title">{goal.title}</strong>
          <span className="weekly-goal-fraction muted">
            {goal.done}/{goal.total}
          </span>
          {showPace && (
            <span className={paceClass(goal.pace.label)}>
              {paceText(goal.done, goal.total, goal.pace)}
            </span>
          )}
        </div>
        <WeeklyStreak weeks={goal.metWeeksStreak} />
      </div>
      {goal.slot === "lc" && onLcTarget && onLcLabel && (
        <div className="weekly-goal-label-target-row">
          <LabelLine label={goal.label} onSave={onLcLabel} />
          <TargetStepper
            value={goal.targetCount ?? 10}
            label={goal.title}
            disabled={busy}
            onChange={onLcTarget}
          />
        </div>
      )}
      {showBar && <GoalBar done={goal.done} total={goal.total} showOverflow />}
      {goal.slot === "lc" && lcToday && lcWeek && (
        <div className="weekly-goal-lc-counts">
          <p className="muted lc-day-line">{lcCountsLine("Today", lcToday)}</p>
          <p className="muted lc-day-line">{lcCountsLine("This week", lcWeek)}</p>
        </div>
      )}
      {goal.slot === "apps" && <AppsMembers goal={goal} />}
    </div>
  );
}

function CustomActiveRow({
  goal,
  busy,
  onEdit,
  onTarget,
}: {
  goal: CustomWeeklyGoalView;
  busy: boolean;
  onEdit: () => void;
  onTarget: (n: number) => void;
}) {
  const showBar = goal.total > 0;
  const showPace = goal.total > 0;
  return (
    <div className="weekly-goal-row">
      <div className="weekly-goal-row-head weekly-goal-row-head-spread">
        <div className="weekly-goal-row-head-main">
          <strong className="weekly-goal-title">{goal.name}</strong>
          <button
            type="button"
            className="habits-pencil weekly-goal-row-pencil"
            disabled={busy}
            aria-label={`Edit ${goal.name}`}
            onClick={onEdit}
          >
            <span className="habits-pencil-flip" aria-hidden="true">
              ✎
            </span>
          </button>
          <span className="weekly-goal-fraction muted">
            {goal.done}/{goal.total}
          </span>
          {showPace && (
            <span className={paceClass(goal.pace.label)}>
              {paceText(goal.done, goal.total, goal.pace)}
            </span>
          )}
        </div>
        <WeeklyStreak weeks={goal.metWeeksStreak} />
      </div>
      <div className="weekly-goal-label-target-row">
        <TargetStepper
          value={goal.targetCount}
          label={goal.name}
          disabled={busy}
          onChange={onTarget}
        />
      </div>
      {showBar && <GoalBar done={goal.done} total={goal.total} showOverflow />}
    </div>
  );
}

function ArchivedCustomRow({
  goal,
  busy,
  onRestore,
}: {
  goal: CustomWeeklyGoalView;
  busy: boolean;
  onRestore: () => void;
}) {
  return (
    <div className="weekly-goal-arch-row is-ghost">
      <span className="habits-arch-stamp">Archived</span>
      <div className="weekly-goal-arch-main">
        <strong className="weekly-goal-title">{goal.name}</strong>
        <span className="muted weekly-goal-arch-meta">
          target {goal.targetCount}/week
          {goal.metWeeksStreak >= WEEKLY_STREAK_SHOW_FROM
            ? ` · ${goal.metWeeksStreak} weeks in a row (paused)`
            : " · no ± while archived"}
        </span>
      </div>
      <Button size="sm" variant="primary" disabled={busy} onClick={onRestore}>
        Restore
      </Button>
    </div>
  );
}

/** Compact Home strip or full Progress column. */
export default function WeeklyGoalsBlock({
  snapshot,
  compact,
  onChange,
  /** Read-only LC tier lines under Weekly LC (from progress/today). */
  lcToday,
  lcWeek,
}: {
  snapshot: WeeklyGoalsSnapshot | null;
  compact?: boolean;
  onChange?: (next: WeeklyGoalsSnapshot) => void | Promise<void>;
  lcToday?: LeetcodeTierCounts;
  lcWeek?: LeetcodeTierCounts;
}) {
  const titleId = useId();
  const [section, setSection] = useState<Section>("active");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [archiveConfirmId, setArchiveConfirmId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createName, setCreateName] = useState("");
  const [createTarget, setCreateTarget] = useState(DEFAULT_CREATE_TARGET);

  const customs = snapshot?.customs ?? { active: [], archived: [] };
  const activeCustoms = customs.active;
  const archivedCustoms = customs.archived;
  const atCap = activeCustoms.length >= CUSTOM_WEEKLY_CAP;
  const hasArchived = archivedCustoms.length > 0;
  const tz = snapshot?.tz ?? "";

  useEffect(() => {
    if (!hasArchived && section === "archived") setSection("active");
  }, [hasArchived, section]);

  if (!snapshot) return null;

  // Active order: LC, apps, then customs (API already returns LC then apps).
  const appsGoal = snapshot.goals.find((g) => g.slot === "apps");
  const lcGoal = snapshot.goals.find((g) => g.slot === "lc");
  const orderedSlots = [lcGoal, appsGoal].filter(Boolean) as WeeklyGoalView[];

  async function refreshSnapshot() {
    const next = await getWeeklyGoals(tz);
    await onChange?.(next);
    return next;
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function patchLcTarget(targetCount: number) {
    await run(async () => {
      const next = await patchWeeklyLcGoal(tz, { targetCount });
      await onChange?.(next);
    });
  }

  async function patchLcLabel(label: string) {
    await run(async () => {
      const next = await patchWeeklyLcGoal(tz, { label });
      await onChange?.(next);
    });
  }

  const editing =
    editId != null
      ? activeCustoms.find((g) => g.id === editId) ??
        archivedCustoms.find((g) => g.id === editId)
      : null;
  const archiveTarget =
    archiveConfirmId != null
      ? activeCustoms.find((g) => g.id === archiveConfirmId) ??
        archivedCustoms.find((g) => g.id === archiveConfirmId)
      : null;

  if (compact) {
    const clusterCols = "max-content max-content minmax(2.75rem, 1fr) max-content";
    const gridTemplateColumns = snapshot.goals.map(() => clusterCols).join(" ");

    return (
      <div className="weekly-goals-block compact" style={{ gridTemplateColumns }}>
        {snapshot.goals.map((goal, index) => (
          <div key={goal.id} style={{ display: "contents" }}>
            <span
              className={
                index > 0
                  ? "weekly-goal-title-cluster weekly-goal-cluster-start"
                  : "weekly-goal-title-cluster"
              }
            >
              {index === 0 && <span className="weekly-goals-kicker">This week: </span>}
              <strong className="weekly-goal-title">{goal.title}</strong>
            </span>
            <span className="weekly-goal-fraction">
              {goal.done}/{goal.total}
            </span>
            <GoalBar done={goal.done} total={goal.total} />
            <span className={paceClass(goal.pace.label)}>
              {paceText(goal.done, goal.total, goal.pace)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="card weekly-goals-card" aria-labelledby={titleId}>
      <div className="weekly-goals-block weekly-goals-column">
        <div className="weekly-goals-column-head">
          <h3 id={titleId} className="weekly-goals-heading">
            Weekly goals
          </h3>
          <div className="weekly-goals-column-head-actions">
            <Button
              size="sm"
              variant="secondary"
              className="weekly-goals-add"
              disabled={busy || atCap}
              title={
                atCap
                  ? `Custom cap (${CUSTOM_WEEKLY_CAP}) reached`
                  : "Add custom weekly goal"
              }
              aria-label="Add goal"
              onClick={() => {
                if (atCap) {
                  setMessage(
                    `At most ${CUSTOM_WEEKLY_CAP} active custom weekly goals (archive one to create another)`,
                  );
                  return;
                }
                setCreateOpen(true);
                setCreateName("");
                setCreateTarget(DEFAULT_CREATE_TARGET);
                setMessage(null);
              }}
            >
              Add goal +
            </Button>
            <div
              className="ui-chrome-tabs weekly-goals-section-tabs"
              role="tablist"
              aria-label="Weekly goals section"
            >
              <ChromeTab
                size="page"
                active={section === "active"}
                aria-selected={section === "active"}
                onClick={() => setSection("active")}
              >
                Active
              </ChromeTab>
              <ChromeTab
                size="page"
                active={section === "archived"}
                aria-selected={section === "archived"}
                disabled={!hasArchived}
                title={!hasArchived ? "No archived customs" : undefined}
                onClick={() => hasArchived && setSection("archived")}
              >
                Archived
              </ChromeTab>
            </div>
          </div>
        </div>

        {message && (
          <p className="weekly-goals-msg" role="status">
            {message}
          </p>
        )}

        {section === "active" ? (
          <div className="weekly-goals-list">
            {orderedSlots.map((goal) => (
              <SlotRow
                key={goal.id}
                goal={goal}
                busy={busy}
                onLcTarget={goal.slot === "lc" ? (n) => void patchLcTarget(n) : undefined}
                onLcLabel={goal.slot === "lc" ? patchLcLabel : undefined}
                lcToday={lcToday}
                lcWeek={lcWeek}
              />
            ))}
            {activeCustoms.map((g) => (
              <CustomActiveRow
                key={g.id}
                goal={g}
                busy={busy}
                onEdit={() => {
                  setEditId(g.id);
                  setRenameDraft(g.name);
                  setMessage(null);
                }}
                onTarget={(n) =>
                  void run(async () => {
                    await patchCustomWeeklyTarget(tz, g.id, n);
                    await refreshSnapshot();
                  })
                }
              />
            ))}
          </div>
        ) : (
          <div className="weekly-goals-list weekly-goals-arch-list">
            {archivedCustoms.map((g) => (
              <ArchivedCustomRow
                key={g.id}
                goal={g}
                busy={busy}
                onRestore={() =>
                  void run(async () => {
                    await restoreCustomWeeklyGoal(tz, g.id);
                    const next = await refreshSnapshot();
                    if ((next.customs?.archived.length ?? 0) === 0) setSection("active");
                  })
                }
              />
            ))}
          </div>
        )}
      </div>

      {createOpen && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="weekly-create-title"
          onClose={() => setCreateOpen(false)}
          dirty={createName.trim().length > 0}
        >
          <ModalHeader id="weekly-create-title" title="New weekly goal" />
          <ModalBody>
            <p className="muted habits-hint" style={{ marginTop: 0 }}>
              Default target is 3. Carries week to week; progress resets Mondays.
            </p>
            <label className="habits-field-label">
              Name
              <TextField
                value={createName}
                maxLength={50}
                placeholder="e.g. Gym"
                autoFocus
                onChange={(e) => setCreateName(e.target.value)}
              />
            </label>
            <div className="habits-field-label weekly-goal-create-target">
              <span>Weekly target</span>
              <TargetStepper
                value={createTarget}
                label="new weekly goal"
                disabled={busy}
                showCaption={false}
                onChange={setCreateTarget}
              />
            </div>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!createName.trim() || busy}
              onClick={() =>
                void run(async () => {
                  await createCustomWeeklyGoal(tz, {
                    name: createName.trim(),
                    targetCount: createTarget,
                  });
                  setCreateOpen(false);
                  setCreateName("");
                  setCreateTarget(DEFAULT_CREATE_TARGET);
                  setSection("active");
                  await refreshSnapshot();
                })
              }
            >
              Create
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {editing && !archiveConfirmId && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="weekly-edit-title"
          onClose={() => setEditId(null)}
          dirty={renameDraft.trim() !== editing.name}
        >
          <ModalHeader id="weekly-edit-title" title="Edit weekly goal" />
          <ModalBody>
            <label className="habits-field-label">
              Name
              <TextField
                value={renameDraft}
                maxLength={50}
                onChange={(e) => setRenameDraft(e.target.value)}
              />
            </label>
            <p className="muted habits-hint">
              Rename keeps history. Target size stays on the near-label stepper — not here.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setEditId(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="habits-btn-danger"
              onClick={() => setArchiveConfirmId(editing.id)}
            >
              Archive
            </Button>
            <Button
              variant="primary"
              disabled={!renameDraft.trim() || busy}
              onClick={() =>
                void run(async () => {
                  await renameCustomWeeklyGoal(tz, editing.id, renameDraft.trim());
                  setEditId(null);
                  await refreshSnapshot();
                })
              }
            >
              Save name
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}

      {archiveTarget && (
        <ModalLayer
          className="modal modal-compact"
          labelledBy="weekly-archive-title"
          onClose={() => setArchiveConfirmId(null)}
        >
          <ModalHeader id="weekly-archive-title" title="Archive this weekly goal?" />
          <ModalBody>
            <p className="habits-hint" style={{ marginTop: 0 }}>
              <strong>{archiveTarget.name}</strong> leaves Active and stops counting toward the
              custom cap until restored.
            </p>
          </ModalBody>
          <ModalFooter>
            <Button variant="secondary" onClick={() => setArchiveConfirmId(null)}>
              Cancel
            </Button>
            <Button
              variant="ghost"
              className="habits-btn-danger"
              disabled={busy}
              onClick={() =>
                void run(async () => {
                  await archiveCustomWeeklyGoal(tz, archiveTarget.id);
                  setEditId(null);
                  setArchiveConfirmId(null);
                  await refreshSnapshot();
                })
              }
            >
              Archive
            </Button>
          </ModalFooter>
        </ModalLayer>
      )}
    </section>
  );
}
