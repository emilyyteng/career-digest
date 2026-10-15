import { useState } from "react";
import { Link } from "react-router-dom";
import {
  patchWeeklyLcGoal,
  type WeeklyGoalView,
  type WeeklyGoalsSnapshot,
  type WeeklyPaceLabel,
} from "../../api";
import { Button, TextField } from "../../ui";

const LC_LABEL_MAX = 50;
/** Proposed show-from for weekly-goal streak (M5-07 / M5-08). */
const WEEKLY_STREAK_SHOW_FROM = 2;

function visibleCharLength(value: string): number {
  return Array.from(value).length;
}

function paceClass(label: WeeklyPaceLabel): string {
  if (label === "behind") return "weekly-pace behind";
  return "weekly-pace on-track";
}

function paceText(goal: WeeklyGoalView): string {
  if (goal.total > 0 && goal.done >= goal.total) return "met";
  if (goal.pace.label === "ahead") return `${goal.pace.amount} ahead`;
  if (goal.pace.label === "behind") return `${goal.pace.amount} behind`;
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

function GoalHead({ goal }: { goal: WeeklyGoalView }) {
  const showPace = goal.total > 0;
  return (
    <div className="weekly-goal-row-head weekly-goal-row-head-spread">
      <div className="weekly-goal-row-head-main">
        <strong className="weekly-goal-title">{goal.title}</strong>
        <span className="weekly-goal-fraction muted">
          {goal.done}/{goal.total}
        </span>
        {showPace && <span className={paceClass(goal.pace.label)}>{paceText(goal)}</span>}
      </div>
      <WeeklyStreak weeks={goal.metWeeksStreak} />
    </div>
  );
}

function TargetField({
  targetCount,
  onCommit,
}: {
  targetCount: number;
  onCommit: (n: number) => Promise<void>;
}) {
  return (
    <label className="weekly-goal-target-field">
      <span className="muted">Target</span>
      <TextField
        type="number"
        fieldSize="num"
        min={1}
        defaultValue={targetCount}
        key={`target-${targetCount}`}
        aria-label="LC weekly target"
        onBlur={(event) => {
          const n = Number(event.target.value);
          if (Number.isInteger(n) && n >= 1) {
            void onCommit(n);
          } else {
            event.target.value = String(targetCount);
          }
        }}
      />
    </label>
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
  if (goal.members.length === 0) {
    return (
      <p className="muted weekly-goal-empty">
        No tagged applications. Tag application tasks as “Target this week” on Tasks.
      </p>
    );
  }
  return (
    <>
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
    </>
  );
}

function GoalRow({
  goal,
  onLcTarget,
  onLcLabel,
}: {
  goal: WeeklyGoalView;
  onLcTarget?: (n: number) => Promise<void>;
  onLcLabel?: (label: string) => Promise<void>;
}) {
  const showBar = goal.total > 0;
  return (
    <div className="weekly-goal-row">
      <GoalHead goal={goal} />
      {goal.slot === "lc" && onLcTarget && onLcLabel && (
        <div className="weekly-goal-label-target-row">
          <LabelLine label={goal.label} onSave={onLcLabel} />
          <TargetField targetCount={goal.targetCount ?? 10} onCommit={onLcTarget} />
        </div>
      )}
      {showBar && <GoalBar done={goal.done} total={goal.total} showOverflow />}
      {goal.slot === "apps" && <AppsMembers goal={goal} />}
    </div>
  );
}

/** Compact Home strip or full Progress block. */
export default function WeeklyGoalsBlock({
  snapshot,
  compact,
  onChange,
}: {
  snapshot: WeeklyGoalsSnapshot | null;
  compact?: boolean;
  onChange?: (next: WeeklyGoalsSnapshot) => void | Promise<void>;
}) {
  if (!snapshot) return null;
  const tz = snapshot.tz;

  async function patchLcTarget(targetCount: number) {
    const next = await patchWeeklyLcGoal(tz, { targetCount });
    await onChange?.(next);
  }

  async function patchLcLabel(label: string) {
    const next = await patchWeeklyLcGoal(tz, { label });
    await onChange?.(next);
  }

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
            <span className={paceClass(goal.pace.label)}>{paceText(goal)}</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <section className="card weekly-goals-card">
      <div className="weekly-goals-block">
        <h3 className="weekly-goals-heading">Weekly goals</h3>
        <div className="weekly-goals-list">
          {snapshot.goals.map((goal) => (
            <GoalRow
              key={goal.id}
              goal={goal}
              onLcTarget={patchLcTarget}
              onLcLabel={patchLcLabel}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
