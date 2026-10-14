import type { ProgressToday } from "../../api";

/** R5.25: daily streak points for a day that continues a streak of this length. */
export function streakPointsToday(length: number, todayCounts: boolean): number {
  if (!todayCounts || length <= 0) return 0;
  return Math.min(20, 2 * length);
}

function StreakPill({
  label,
  length,
  todayCounts,
}: {
  label: string;
  length: number;
  todayCounts: boolean;
}) {
  const pts = streakPointsToday(length, todayCounts);
  return (
    <div
      className={todayCounts ? "today-streak-pill is-done" : "today-streak-pill is-pending"}
      aria-label={`${label} ${length}-day streak${todayCounts ? ", done today" : ", not yet today"}, +${pts} today`}
    >
      <div className="today-streak-pill-top">
        <strong className="today-streak-n">{length}</strong>
        <span className="today-streak-mark" aria-hidden="true">
          {todayCounts ? "✓" : "−"}
        </span>
      </div>
      <span className="today-streak-label">{label} day streak</span>
      <span className="today-streak-pts">+{pts} today</span>
    </div>
  );
}

/** Shared Home / Progress today strip: apps and LC day-streak pills (M5-12 / R5.27). */
export default function TodayStrip({
  today,
  className = "progress-today-strip",
}: {
  today: ProgressToday;
  /** @deprecated Kept for callers; unused — pills are self-labeling (M5-12). */
  prefix?: string;
  className?: string;
}) {
  const apps = today.streaks.apps;
  const lc = today.streaks.lc;

  return (
    <div className={`${className} today-streak-strip`}>
      <StreakPill label="Apps" length={apps.length} todayCounts={apps.todayCounts} />
      <StreakPill label="LC" length={lc.length} todayCounts={lc.todayCounts} />
    </div>
  );
}
