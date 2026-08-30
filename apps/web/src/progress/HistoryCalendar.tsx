import { creditFill, addDays, dowSunday } from "./ProgressHeatmap";

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export type CalendarDayMark = {
  earned: number;
  effort: boolean;
};

function monthLabel(anchor: string): string {
  const [y, m] = anchor.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function monthStart(anchor: string): string {
  return `${anchor.slice(0, 7)}-01`;
}

function monthEnd(anchor: string): string {
  const [y, m] = anchor.split("-").map(Number);
  return addDays(
    new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10),
    -1,
  );
}

function shiftMonth(anchor: string, delta: number): string {
  const [y, m] = anchor.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1 + delta, 1));
  return date.toISOString().slice(0, 10);
}

export default function HistoryCalendar({
  monthAnchor,
  today,
  selectedDate,
  marks,
  onMonthChange,
  onSelectDate,
}: {
  monthAnchor: string;
  today: string;
  selectedDate: string;
  marks: Record<string, CalendarDayMark>;
  onMonthChange: (nextAnchor: string) => void;
  onSelectDate: (date: string) => void;
}) {
  const start = monthStart(monthAnchor);
  const end = monthEnd(monthAnchor);
  const lead = dowSunday(start);
  const cells: Array<string | null> = [];
  for (let i = 0; i < lead; i += 1) cells.push(null);
  for (let cursor = start; cursor <= end; cursor = addDays(cursor, 1)) {
    cells.push(cursor);
  }

  return (
    <section className="card progress-cal">
      <div className="progress-cal-head">
        <button
          type="button"
          className="secondary"
          onClick={() => onMonthChange(shiftMonth(start, -1))}
          aria-label="Previous month"
        >
          ‹
        </button>
        <strong>{monthLabel(start)}</strong>
        <button
          type="button"
          className="secondary"
          onClick={() => onMonthChange(shiftMonth(start, 1))}
          aria-label="Next month"
        >
          ›
        </button>
      </div>
      <div className="progress-cal-grid">
        {WEEKDAYS.map((d) => (
          <span key={d} className="muted">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (!date) return <span key={`e-${i}`} />;
          const future = date > today;
          const mark = marks[date];
          return (
            <button
              key={date}
              type="button"
              className={[
                "secondary",
                "progress-cal-cell",
                selectedDate === date ? "on" : "",
                future ? "future" : "",
                mark?.effort ? "effort" : "",
              ].join(" ")}
              style={{
                background: future
                  ? "transparent"
                  : creditFill(mark?.earned ?? 0),
              }}
              disabled={future}
              onClick={() => onSelectDate(date)}
            >
              {Number(date.slice(-2))}
            </button>
          );
        })}
      </div>
      <p className="muted progress-cal-note">
        Color = max earned credit across lanes. Pink ✓ = deep work that day.
      </p>
    </section>
  );
}
