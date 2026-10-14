import type { ProgressToday } from "../../api";

/** Points for extending the streak today vs the streak's current day-rate (2×length, capped). */
export function streakPointsBreakdown(
  length: number,
  todayCounts: boolean,
): { today: number; total: number } {
  const total = length <= 0 ? 0 : Math.min(20, 2 * length);
  if (!todayCounts || length <= 0) return { today: 0, total };
  const prev = length <= 1 ? 0 : Math.min(20, 2 * (length - 1));
  return { today: total - prev, total };
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
  const { today, total } = streakPointsBreakdown(length, todayCounts);
  return (
    <div
      className={todayCounts ? "today-streak-pill is-done" : "today-streak-pill is-pending"}
      aria-label={`${label} ${length}-day daily streak${todayCounts ? ", done today" : ", not yet today"}, +${today} today, +${total} total`}
    >
      <div className="today-streak-pill-top">
        <strong className="today-streak-n">{length}</strong>
        <span className="today-streak-mark" aria-hidden="true">
          {todayCounts ? "✓" : "−"}
        </span>
      </div>
      <span className="today-streak-label">{label} daily streak</span>
      <span className="today-streak-pts">
        +{today} today, +{total} total
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
      <StreakPill label="Apps" length={apps.length} todayCounts={apps.todayCounts} />
      <StreakPill label="LC" length={lc.length} todayCounts={lc.todayCounts} />
    </div>
  );
}
