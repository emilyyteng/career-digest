import type { ProgressToday } from "../../api";

function StreakPill({
  label,
  length,
  todayCounts,
  completedToday,
}: {
  label: string;
  length: number;
  todayCounts: boolean;
  completedToday: number;
}) {
  const n = Math.max(0, completedToday);
  return (
    <div
      className={todayCounts ? "today-streak-pill is-done" : "today-streak-pill is-pending"}
      aria-label={`${label} ${length}-day daily streak${todayCounts ? ", done today" : ", not yet today"}, ${n} completed today`}
    >
      <div className="today-streak-pill-top">
        <strong className="today-streak-n">{length}</strong>
        <span className="today-streak-mark" aria-hidden="true">
          {todayCounts ? "✓" : "−"}
        </span>
      </div>
      <span className="today-streak-label">{label} daily streak</span>
      <span className="today-streak-pts">
        {n} completed today
      </span>
    </div>
  );
}

/** Shared Home / Progress today strip: apps and LC daily-streak pills (M5-12 / R5.27). */
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
      <StreakPill
        label="Apps"
        length={apps.length}
        todayCounts={apps.todayCounts}
        completedToday={today.applications.raw}
      />
      <StreakPill
        label="LC"
        length={lc.length}
        todayCounts={lc.todayCounts}
        completedToday={today.leetcode.raw}
      />
    </div>
  );
}
