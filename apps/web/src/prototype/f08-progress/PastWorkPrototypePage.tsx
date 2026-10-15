/**
 * F08 M8-01 · Past work — locked layout A (calendar + day panel | week completions).
 * Explores calendar intensity metrics (Q67–Q68). Ticket: M8-01.
 */
import { useMemo, useState } from "react";
import ProgressShell, { ParamToggle, btn, useParam, useVariant } from "./ProgressShell";
import {
  COMPLETIONS,
  DAYS,
  KIND_TABS,
  TODAY,
  formatDay,
  formatLong,
  intensityForDay,
  windowEndingOn,
  type CompletionKind,
  type IntensityMetric,
  type MockCompletion,
  type MockDay,
} from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Locked · dual column (day panel + week log)" },
] as const;

const METRICS: Array<{ key: IntensityMetric; label: string }> = [
  { key: "seeds", label: "seeds (all)" },
  { key: "seedsWork", label: "seeds (no weekly lump)" },
  { key: "minutes", label: "minutes" },
  { key: "events", label: "event count" },
];

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthAnchor(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function shiftMonth(anchor: string, delta: number): string {
  const [y, m] = anchor.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(anchor: string): string {
  const [y, m] = anchor.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function emptyDay(date: string): MockDay {
  return {
    date,
    lcEasy: 0,
    lcMedium: 0,
    lcHard: 0,
    seeds: 0,
    seedsWork: 0,
    minutes: 0,
    interviews: [],
    apps: [],
    reflections: [],
  };
}

function ProtoCalendar({
  month,
  selected,
  today,
  metric,
  onMonth,
  onSelect,
}: {
  month: string;
  selected: string;
  today: string;
  metric: IntensityMetric;
  onMonth: (a: string) => void;
  onSelect: (d: string) => void;
}) {
  const start = monthAnchor(month);
  const [y, m] = start.split("-").map(Number);
  const firstDow = new Date(y, m - 1, 1).getDay();
  const lastDay = new Date(y, m, 0).getDate();
  const cells: Array<string | null> = [];
  for (let i = 0; i < firstDow; i += 1) cells.push(null);
  for (let d = 1; d <= lastDay; d += 1) {
    cells.push(`${start.slice(0, 8)}${String(d).padStart(2, "0")}`);
  }

  return (
    <div className="f08p-panel">
      <div className="f08p-cal-head">
        <button type="button" className={btn("ghost", "sm")} onClick={() => onMonth(shiftMonth(start, -1))}>
          ‹
        </button>
        <strong>{monthLabel(start)}</strong>
        <button type="button" className={btn("ghost", "sm")} onClick={() => onMonth(shiftMonth(start, 1))}>
          ›
        </button>
      </div>
      <div className="f08p-cal">
        {DOW.map((d) => (
          <span key={d} className="f08p-cal-dow">
            {d}
          </span>
        ))}
        {cells.map((date, i) => {
          if (date == null) return <span key={`e-${i}`} className="f08p-cal-cell is-empty" />;
          const day = DAYS[date] ?? emptyDay(date);
          const level = intensityForDay(day, metric);
          return (
            <button
              key={date}
              type="button"
              title={`${date} · ${metric}=${
                metric === "seeds"
                  ? day.seeds
                  : metric === "seedsWork"
                    ? day.seedsWork
                    : metric === "minutes"
                      ? day.minutes
                      : level
              }`}
              className={[
                "f08p-cal-cell",
                level ? `is-i${level}` : "",
                date === selected ? "is-selected" : "",
                date === today ? "is-today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(8))}
            </button>
          );
        })}
      </div>
      <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.75rem" }}>
        Intensity = {metric}. No effort checkmarks. Mondays may spike on “seeds (all)” from
        week-close lumps.
      </p>
    </div>
  );
}

function KindTabs({
  kind,
  onKind,
}: {
  kind: CompletionKind | "all";
  onKind: (k: CompletionKind | "all") => void;
}) {
  return (
    <div className="f08p-kind-tabs" role="tablist" aria-label="Completion kind">
      {KIND_TABS.map((t) => (
        <button
          key={t.key}
          type="button"
          role="tab"
          aria-selected={kind === t.key}
          className={btn("ghost", "sm", `f08p-kind-tab${kind === t.key ? " is-active" : ""}`)}
          onClick={() => onKind(t.key)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}

function CompletionsWeek({
  days,
  kind,
  focus,
  today,
  rows,
}: {
  days: string[];
  kind: CompletionKind | "all";
  focus: string;
  today: string;
  rows: MockCompletion[];
}) {
  const filtered = rows.filter((r) => kind === "all" || r.kind === kind);
  return (
    <div>
      {days
        .slice()
        .reverse()
        .map((date) => {
          const group = filtered.filter((r) => r.localDate === date);
          return (
            <div
              key={date}
              className={`f08p-day-group${date === focus ? " is-focus" : ""}`}
            >
              <p className="f08p-day-heading">{formatDay(date, today)}</p>
              {group.length === 0 ? (
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  No completions this day{kind !== "all" ? ` in “${kind}”` : ""}.
                </p>
              ) : (
                group.map((r) => (
                  <div key={r.id} className="f08p-row">
                    <div>
                      <span className="f08p-row-kind">{r.kind}</span>
                      {r.title}
                      <div className="f08p-row-meta">{r.subtitle}</div>
                    </div>
                    {r.points != null && r.points > 0 && (
                      <span className="f08p-pts">+{r.points}</span>
                    )}
                  </div>
                ))
              )}
            </div>
          );
        })}
    </div>
  );
}

function DayPanel({ day }: { day: MockDay }) {
  const tiers: Array<{ key: "lcEasy" | "lcMedium" | "lcHard"; label: string; pts: number }> = [
    { key: "lcEasy", label: "Easy", pts: 20 },
    { key: "lcMedium", label: "Medium", pts: 30 },
    { key: "lcHard", label: "Hard", pts: 50 },
  ];
  return (
    <div className="f08p-panel f08p-stack">
      <div>
        <span className="f08p-kicker">Selected day · always editable</span>
        <h3 style={{ margin: 0 }}>{formatLong(day.date)}</h3>
      </div>
      <div>
        <span className="f08p-kicker">LeetCode (misc)</span>
        {tiers.map((t) => (
          <div key={t.key} className="f08p-lc-row">
            <span>
              {t.label}
              <span className="f08p-lc-pts"> · +{t.pts}</span>
            </span>
            <span>
              <button type="button" className={btn("ghost", "sm")} disabled>
                −
              </button>{" "}
              {day[t.key]}{" "}
              <button type="button" className={btn("ghost", "sm")} disabled>
                +
              </button>
            </span>
          </div>
        ))}
      </div>
      <div>
        <span className="f08p-kicker">Interviews</span>
        {day.interviews.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            None this day.
          </p>
        ) : (
          <ul className="f08p-list">
            {day.interviews.map((iv) => (
              <li key={iv.id}>{iv.label}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <span className="f08p-kicker">Apps</span>
        {day.apps.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No applications logged this day.
          </p>
        ) : (
          <ul className="f08p-list">
            {day.apps.map((a) => (
              <li key={a.id}>{a.label}</li>
            ))}
          </ul>
        )}
      </div>
      <div>
        <span className="f08p-kicker">Notes</span>
        {day.reflections.length === 0 ? (
          <p className="muted" style={{ margin: 0 }}>
            No reflections.
          </p>
        ) : (
          day.reflections.map((r) => (
            <p key={r.id} style={{ margin: "0 0 0.35rem", fontSize: "0.9rem" }}>
              <span className="muted">{r.lane} · </span>
              {r.body}
            </p>
          ))
        )}
        <button type="button" className={btn("primary", "sm")} style={{ marginTop: "0.5rem" }}>
          Add reflection
        </button>
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
        Misc tasks stay in the completions log only. Overlap with the week log is fine.
      </p>
    </div>
  );
}

export default function PastWorkPrototypePage() {
  useVariant(VARIANTS);
  const metric = useParam(
    "metric",
    METRICS.map((m) => m.key),
  );
  const [selected, setSelected] = useState(TODAY);
  const [month, setMonth] = useState(monthAnchor(TODAY));
  const [kind, setKind] = useState<CompletionKind | "all">("all");
  const weekDays = useMemo(() => windowEndingOn(selected, 7), [selected]);
  const day = DAYS[selected] ?? emptyDay(selected);
  const weekRows = COMPLETIONS.filter((r) => weekDays.includes(r.localDate));

  return (
    <ProgressShell
      title="Past work · locked A"
      question="Calendar = day selector for the edit panel; completions = week filter. Explore intensity metric (Q67–Q68)."
      variants={VARIANTS}
      surfaceLabel="Past work"
      controls={
        <ParamToggle
          name="metric"
          label="Calendar intensity"
          options={METRICS.map((m) => ({ key: m.key, label: m.label }))}
        />
      }
      notes={
        <>
          <p>
            Locked: dual column; always-editable day panel; interviews above apps; no misc-task
            list; no Edit-this-day; drop weekly-goals filter (rows remain in all).
          </p>
          <p>
            Flip calendar intensity: “seeds (all)” spikes on Mondays with week-close lumps;
            “seeds (no weekly lump)” smooths that. Minutes / event count are alternatives.
          </p>
        </>
      }
    >
      <p className="f08p-state" aria-live="polite">
        selected={selected} · window={weekDays[0]}→{weekDays[6]} · kind={kind} · metric={metric} ·
        daySeeds={day.seeds}/{day.seedsWork}
      </p>
      <div className="f08p-dual">
        <div className="f08p-stack">
          <ProtoCalendar
            month={month}
            selected={selected}
            today={TODAY}
            metric={metric}
            onMonth={setMonth}
            onSelect={(d) => {
              setSelected(d);
              setMonth(monthAnchor(d));
            }}
          />
          <DayPanel day={day} />
        </div>
        <div className="f08p-panel">
          <h3>Completions · 7 days ending {formatDay(selected, TODAY)}</h3>
          <KindTabs kind={kind} onKind={setKind} />
          <CompletionsWeek
            days={weekDays}
            kind={kind}
            focus={selected}
            today={TODAY}
            rows={weekRows}
          />
        </div>
      </div>
    </ProgressShell>
  );
}
