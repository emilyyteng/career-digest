import {
  patchWeeklyLcGoal,
  setWeeklyAppTargetMember,
  type WeeklyGoalView,
  type WeeklyGoalsSnapshot,
  type WeeklyPaceLabel,
} from "../../api";
import LeetcodeStepper from "./LeetcodeStepper";

function paceClass(label: WeeklyPaceLabel): string {
  if (label === "behind") return "weekly-pace behind";
  return "weekly-pace on-track";
}

function paceText(label: WeeklyPaceLabel, amount: number): string {
  if (label === "ahead") return `${amount} ahead`;
  if (label === "behind") return `${amount} behind`;
  return "on track";
}

function GoalBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="weekly-goal-bar" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function GoalHead({ goal }: { goal: WeeklyGoalView }) {
  const fraction = `${goal.done}/${goal.total}`;
  return (
    <div className="weekly-goal-row-head">
      <strong className="weekly-goal-title">{goal.title}</strong>
      <span className="weekly-goal-fraction muted">{fraction}</span>
      <span className={paceClass(goal.pace.label)}>
        {paceText(goal.pace.label, goal.pace.amount)}
      </span>
    </div>
  );
}

function GoalRow({
  goal,
  onLcProgress,
  onLcTarget,
  onUnlink,
  onCompleteTask,
}: {
  goal: WeeklyGoalView;
  onLcProgress?: (n: number) => Promise<void>;
  onLcTarget?: (n: number) => Promise<void>;
  onUnlink?: (taskId: string) => Promise<void>;
  onCompleteTask?: (taskId: string) => Promise<void>;
}) {
  return (
    <div className="weekly-goal-row">
      <GoalHead goal={goal} />
      <GoalBar done={goal.done} total={goal.total} />
      {goal.slot === "lc" && onLcProgress && onLcTarget && (
        <div className="weekly-goal-lc-controls">
          <LeetcodeStepper
            value={goal.progressCount}
            max={goal.targetCount ?? undefined}
            onCommit={onLcProgress}
          />
          <label className="weekly-goal-target-field">
            <span className="muted">Target</span>
            <input
              type="number"
              min={1}
              defaultValue={goal.targetCount ?? 10}
              key={`target-${goal.id}-${goal.targetCount}`}
              onBlur={(event) => {
                const n = Number(event.target.value);
                if (Number.isInteger(n) && n >= 1) void onLcTarget(n);
              }}
            />
          </label>
        </div>
      )}
      {goal.slot === "apps" && (
        <div className="weekly-goal-apps">
          {goal.members.length === 0 ? (
            <p className="muted weekly-goal-empty">
              Tag application tasks as “Target this week” to fill this set.
            </p>
          ) : (
            <ul className="weekly-goal-member-list">
              {goal.members.map((m) => (
                <li key={m.taskId} className={m.status === "completed" ? "is-done" : ""}>
                  <label>
                    <input
                      type="checkbox"
                      checked={m.status === "completed"}
                      disabled={m.status === "completed" || !onCompleteTask}
                      onChange={() => {
                        if (m.status === "open" && onCompleteTask) void onCompleteTask(m.taskId);
                      }}
                    />
                    <span>
                      {m.organization ? `${m.organization} · ${m.title}` : m.title}
                    </span>
                  </label>
                  {onUnlink && m.status === "open" && (
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void onUnlink(m.taskId)}
                    >
                      Untag
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Compact Home strip or full Progress block. */
export default function WeeklyGoalsBlock({
  snapshot,
  compact,
  onChange,
  onCompleteTask,
}: {
  snapshot: WeeklyGoalsSnapshot | null;
  compact?: boolean;
  onChange?: (next: WeeklyGoalsSnapshot) => void;
  onCompleteTask?: (taskId: string) => Promise<void>;
}) {
  if (!snapshot) return null;
  const tz = snapshot.tz;

  async function patchLc(body: { targetCount?: number; progressCount?: number }) {
    const next = await patchWeeklyLcGoal(tz, body);
    onChange?.(next);
  }

  async function unlink(taskId: string) {
    const next = await setWeeklyAppTargetMember(tz, taskId, false);
    onChange?.(next);
  }

  if (compact) {
    const clusterCols = "max-content max-content minmax(2.75rem, 1fr) max-content";
    const gridTemplateColumns = snapshot.goals.map(() => clusterCols).join(" ");

    return (
      <div
        className="weekly-goals-block compact"
        style={{ gridTemplateColumns }}
      >
        {snapshot.goals.map((goal, index) => (
          <div key={goal.id} style={{ display: "contents" }}>
            <span
              className={
                index > 0
                  ? "weekly-goal-title-cluster weekly-goal-cluster-start"
                  : "weekly-goal-title-cluster"
              }
            >
              {index === 0 && (
                <span className="weekly-goals-kicker">This week: </span>
              )}
              <strong className="weekly-goal-title">{goal.title}</strong>
            </span>
            <span className="weekly-goal-fraction muted">
              {goal.done}/{goal.total}
            </span>
            <GoalBar done={goal.done} total={goal.total} />
            <span className={paceClass(goal.pace.label)}>
              {paceText(goal.pace.label, goal.pace.amount)}
            </span>
          </div>
        ))}
      </div>
    );
  }

  const body = (
    <div className="weekly-goals-block">
      <h3 className="weekly-goals-heading">Weekly goals</h3>
      <div className="weekly-goals-list">
        {snapshot.goals.map((goal) => (
          <GoalRow
            key={goal.id}
            goal={goal}
            onLcProgress={(n) => patchLc({ progressCount: n })}
            onLcTarget={(n) => patchLc({ targetCount: n })}
            onUnlink={unlink}
            onCompleteTask={onCompleteTask}
          />
        ))}
      </div>
    </div>
  );

  return <section className="card weekly-goals-card">{body}</section>;
}
