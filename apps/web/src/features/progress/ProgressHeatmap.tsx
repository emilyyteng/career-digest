import type { ProgressHeatmapDay } from "../api";

const CREDIT_COLORS = [
  "var(--surface-2)",
  "#f3d0dc",
  "#e8a4bc",
  "#c9a8d8",
  "#9b8ec4",
  "#5b7c99",
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function creditFill(earned: number): string {
  return CREDIT_COLORS[Math.max(0, Math.min(5, earned))] ?? CREDIT_COLORS[0]!;
}

function addDays(value: string, delta: number): string {
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + delta));
  return date.toISOString().slice(0, 10);
}

function dowSunday(value: string): number {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function padHeatmap(days: ProgressHeatmapDay[], today: string): ProgressHeatmapDay[] {
  if (days.length === 0) return days;
  const start = days[0]!.date;
  const end = days[days.length - 1]!.date;
  const gridStart = addDays(start, -dowSunday(start));
  const gridEnd = addDays(end, 6 - dowSunday(end));
  const byDate = new Map(days.map((day) => [day.date, day]));
  const padded: ProgressHeatmapDay[] = [];
  for (let cursor = gridStart; cursor <= gridEnd; cursor = addDays(cursor, 1)) {
    padded.push(
      byDate.get(cursor) ?? { date: cursor, raw: 0, earned: 0, effort: false },
    );
  }
  const lastVisible = addDays(today, 6 - dowSunday(today));
  return padded.filter((cell) => cell.date <= lastVisible);
}

export function ProgressHeatLegend() {
  return (
    <div className="progress-heat-legend">
      <span className="muted">Less</span>
      {CREDIT_COLORS.map((color, i) => (
        <span
          key={color}
          className="progress-heat-swatch"
          style={{ background: color }}
          title={`${i}/5`}
        />
      ))}
      <span className="muted">More</span>
      <span className="muted progress-heat-legend-note">✓ = deep work</span>
    </div>
  );
}

export default function ProgressHeatmap({
  title,
  days,
  today,
}: {
  title: string;
  days: ProgressHeatmapDay[];
  today: string;
}) {
  const padded = padHeatmap(days, today);
  const weeks: ProgressHeatmapDay[][] = [];
  for (let i = 0; i < padded.length; i += 7) {
    weeks.push(padded.slice(i, i + 7));
  }

  return (
    <section className="card progress-heat-card">
      <h3 className="progress-heat-title">{title}</h3>
      <div className="progress-heat">
        <div className="progress-heat-dow" aria-hidden>
          {WEEKDAYS.map((label, i) => (
            <span key={label}>{i % 2 === 1 ? label.slice(0, 1) : ""}</span>
          ))}
        </div>
        <div className="progress-heat-weeks">
          {weeks.map((week) => (
            <div key={week[0]?.date} className="progress-heat-week">
              {week.map((day) => {
                const future = day.date > today;
                const tip = future
                  ? undefined
                  : `${day.date}: ${day.earned}/5${day.effort ? " · deep work" : ""}`;
                return (
                  <span
                    key={day.date}
                    className={[
                      "progress-heat-cell",
                      future ? "future" : "",
                      day.effort ? "effort" : "",
                    ].join(" ")}
                    style={{
                      background: future ? "transparent" : creditFill(day.earned),
                    }}
                    title={tip}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <ProgressHeatLegend />
    </section>
  );
}

export { creditFill, addDays, dowSunday };
