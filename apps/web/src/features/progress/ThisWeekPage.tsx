/**
 * Progress This week — habits hub (F11 M2–M3 / R1.12, R.9).
 * Pulse + Habits strip + weekly column + Check in incrementer.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  getProgressCompletions,
  getProgressToday,
  getWeeklyGoals,
  type CompletionPulseCounts,
  type ProgressToday,
  type WeeklyGoalsSnapshot,
} from "../../api";
import HabitsStrip from "./HabitsStrip";
import WeeklyCheckIn from "./WeeklyCheckIn";
import WeeklyGoalsBlock from "./WeeklyGoalsBlock";
import { formatPulseLine } from "./pulseFormat";

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatShort(date: string): string {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export default function ThisWeekPage() {
  const tz = useMemo(() => browserTz(), []);
  const [today, setToday] = useState<ProgressToday | null>(null);
  const [weekPulse, setWeekPulse] = useState<CompletionPulseCounts | null>(null);
  const [monthPulse, setMonthPulse] = useState<CompletionPulseCounts | null>(null);
  const [weeklyGoals, setWeeklyGoals] = useState<WeeklyGoalsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(
    async (isCurrent: () => boolean = () => true) => {
      const [todayRow, diary, goals] = await Promise.all([
        getProgressToday(tz),
        getProgressCompletions(tz, { limit: 1 }),
        getWeeklyGoals(tz),
      ]);
      if (!isCurrent()) return;
      setToday(todayRow);
      setWeekPulse(diary.stats.week);
      setMonthPulse(diary.stats.month);
      setWeeklyGoals(goals);
    },
    [tz],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await reload(() => !cancelled);
        if (!cancelled) setLoaded(true);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded || !today || !weekPulse || !monthPulse) {
    return <p className="muted">Loading…</p>;
  }

  return (
    <div className="progress-this-week">
      {error && <p className="error">{error}</p>}

      <div className="progress-outcome-row">
        <div className="card progress-outcome-card">
          <span className="progress-kicker">This week</span>
          <strong>{formatPulseLine(weekPulse)}</strong>
          <span className="ledger-stat-mins">{weekPulse.minutes} minutes worked</span>
        </div>
        <div className="card progress-outcome-card">
          <span className="progress-kicker">This month</span>
          <strong>{formatPulseLine(monthPulse)}</strong>
          <span className="ledger-stat-mins">{monthPulse.minutes} minutes worked</span>
        </div>
      </div>

      <div className="card progress-today-head">
        <span className="progress-kicker">Today · {formatShort(today.localDate)}</span>
        <HabitsStrip
          today={today}
          tz={tz}
          surface="progress"
          onRefresh={async () => {
            await reload();
          }}
        />
      </div>

      {weeklyGoals && (
        <div className="progress-week-split">
          <div className="progress-week-main progress-week-goals-slot">
            <WeeklyGoalsBlock
              snapshot={weeklyGoals}
              onChange={(next) => setWeeklyGoals(next)}
            />
          </div>
          <div className="progress-week-aside">
            <WeeklyCheckIn
              snapshot={weeklyGoals}
              tz={tz}
              onChange={(next) => setWeeklyGoals(next)}
              onLcLogged={async () => {
                await reload();
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
