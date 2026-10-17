/**
 * F11 M3-04 · Check in: classic − N + for weekly LC + active customs.
 * No apps ±. No today-LC tiers (those stay on Habits strip Log LC).
 *
 * LC ± uses the F08 R5.17 write path as a medium weekly solve (untiered default).
 */
import { useId, useState } from "react";
import {
  getWeeklyGoals,
  patchProgressLeetcode,
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
  /** After LC ± — refresh today strip / pulse (points + streak). */
  onLcLogged,
}: {
  snapshot: WeeklyGoalsSnapshot;
  tz: string;
  onChange: (next: WeeklyGoalsSnapshot) => void | Promise<void>;
  onLcLogged?: () => void | Promise<void>;
}) {
  const titleId = useId();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const lc = snapshot.goals.find((g) => g.slot === "lc");
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

  async function refreshGoals() {
    const next = await getWeeklyGoals(tz);
    await onChange(next);
  }

  return (
    <aside className="card weekly-checkin" aria-labelledby={titleId}>
      <h3 id={titleId} className="weekly-checkin-title">
        Check in
      </h3>
      <p className="muted weekly-checkin-hint">
        ± for LC and custom weekly goals. No apps ±. Today-LC stays on the Habits strip.
      </p>

      {message && (
        <p className="weekly-checkin-msg" role="status">
          {message}
        </p>
      )}

      <ul className="weekly-checkin-list">
        {lc && (
          <li className="weekly-checkin-row">
            <div className="weekly-checkin-label">
              <strong>{lc.title}</strong>
              <span className="muted">
                {lc.done}/{lc.total}
              </span>
            </div>
            <ProgressStepper
              done={lc.done}
              label={lc.title}
              disabled={busyKey != null}
              onDelta={(d) =>
                void run("lc", async () => {
                  await patchProgressLeetcode(tz, {
                    tier: "medium",
                    delta: d,
                    type: "weekly",
                  });
                  // Full reload so Habits strip / points stay in sync with R5.17.
                  if (onLcLogged) await onLcLogged();
                  else await refreshGoals();
                })
              }
            />
          </li>
        )}
        {customs.map((g) => (
          <li key={g.id} className="weekly-checkin-row">
            <div className="weekly-checkin-label">
              <strong>{g.name}</strong>
              <span className="muted">
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
                  await refreshGoals();
                })
              }
            />
          </li>
        ))}
      </ul>
    </aside>
  );
}
