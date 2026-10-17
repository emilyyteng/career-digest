/**
 * F11 M3-04 · Check in: classic − N + for active custom weekly progress only.
 * LC progress comes from Habits strip Log LC (daily control); no LC ± here.
 * No apps ±.
 */
import { useId, useState } from "react";
import {
  getWeeklyGoals,
  stepCustomWeeklyProgress,
  type WeeklyGoalsSnapshot,
} from "../../api";
import { Button } from "../../ui";

function ProgressStepper({
  done,
  label,
  disabled,
  onDelta,
}: {
  done: number;
  label: string;
  disabled?: boolean;
  onDelta: (d: 1 | -1) => void;
}) {
  return (
    <div className="weekly-checkin-stepper" role="group" aria-label={`${label} weekly progress`}>
      <Button
        size="sm"
        variant="ghost"
        className="weekly-checkin-step-btn"
        disabled={disabled || done <= 0}
        aria-label={`Decrease ${label}`}
        onClick={() => onDelta(-1)}
      >
        −
      </Button>
      <span className="weekly-checkin-count">{done}</span>
      <Button
        size="sm"
        variant="ghost"
        className="weekly-checkin-step-btn"
        disabled={disabled}
        aria-label={`Increase ${label}`}
        onClick={() => onDelta(1)}
      >
        +
      </Button>
    </div>
  );
}

export default function WeeklyCheckIn({
  snapshot,
  tz,
  onChange,
}: {
  snapshot: WeeklyGoalsSnapshot;
  tz: string;
  onChange: (next: WeeklyGoalsSnapshot) => void | Promise<void>;
}) {
  const titleId = useId();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const customs = snapshot.customs?.active ?? [];

  async function run(key: string, action: () => Promise<void>) {
    setBusyKey(key);
    setMessage(null);
    try {
      await action();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <aside className="card weekly-checkin" aria-labelledby={titleId}>
      <h3 id={titleId} className="weekly-checkin-title">
        Check in
      </h3>
      <p className="muted weekly-checkin-hint">
        ± for custom weekly goals. LC updates via Log LC on the Habits strip. No apps ±.
      </p>

      {message && (
        <p className="weekly-checkin-msg" role="status">
          {message}
        </p>
      )}

      {customs.length === 0 ? (
        <p className="muted weekly-checkin-empty">
          No custom weekly goals yet. Add one from the Weekly goals column.
        </p>
      ) : (
        <ul className="weekly-checkin-list">
          {customs.map((g) => (
            <li key={g.id} className="weekly-checkin-row">
              <div className="weekly-checkin-label">
                <strong className="weekly-goal-title">{g.name}</strong>
                <span className="muted weekly-goal-fraction">
                  {g.done}/{g.total}
                </span>
              </div>
              <ProgressStepper
                done={g.done}
                label={g.name}
                disabled={busyKey != null}
                onDelta={(d) =>
                  void run(g.id, async () => {
                    await stepCustomWeeklyProgress(tz, g.id, d);
                    await onChange(await getWeeklyGoals(tz));
                  })
                }
              />
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
