/**
 * F08 M8-01 · design question 3: Past work info split.
 * Calendar selects focus day; completions = 7 days ending on that day;
 * kind filters kept. Explore edit panel vs completions overlap (Q55).
 * Ticket: M8-01.
 */
import { useMemo, useState } from "react";
import ProgressShell, { btn, useVariant } from "./ProgressShell";
import {
  COMPLETIONS,
  DAYS,
  KIND_TABS,
  TODAY,
  formatDay,
  formatLong,
  heatMarks,
  windowEndingOn,
  type CompletionKind,
  type MockCompletion,
  type MockDay,
} from "./fixtures";

const VARIANTS = [
  {
    key: "A",
    name: "Dual column · full day panel + week log (your sketch)",
  },
  {
    key: "B",
    name: "Completions-led · slim LC/reflect only on the day",
  },
  {
    key: "C",
    name: "Unified feed · selected day actions inside the week list",
  },
] as const;

const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function monthAnchor(ymd: string): string {
  return `${ymd.slice(0, 7)}-01`;
}

function shiftMonth(anchor: string, delta: number): string {
  const [y, m] = anchor.split("-").map(Number);
  return localMonthStart(new Date(y, m - 1 + delta, 1));
}

function localMonthStart(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(anchor: string): string {
  const [y, m] = anchor.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function ProtoCalendar({
  month,
  selected,
  today,
  marks,
  onMonth,
  onSelect,
}: {
  month: string;
  selected: string;
  today: string;
  marks: Record<string, { earned: number; effort: boolean }>;
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
        {cells.map((date, i) =>
          date == null ? (
            <span key={`e-${i}`} className="f08p-cal-cell is-empty" />
          ) : (
            <button
              key={date}
              type="button"
              className={[
                "f08p-cal-cell",
                marks[date]?.earned ? "is-mark" : "",
                date === selected ? "is-selected" : "",
                date === today ? "is-today" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onSelect(date)}
            >
              {Number(date.slice(8))}
            </button>
          ),
        )}
      </div>
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
          if (group.length === 0) {
            return (
              <div
                key={date}
                className={`f08p-day-group${date === focus ? " is-focus" : ""}`}
              >
                <p className="f08p-day-heading">{formatDay(date, today)}</p>
                <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
                  No completions this day
                  {kind !== "all" ? ` in “${kind}”` : ""}.
                </p>
              </div>
            );
          }
          return (
            <div
              key={date}
              className={`f08p-day-group${date === focus ? " is-focus" : ""}`}
            >
              <p className="f08p-day-heading">{formatDay(date, today)}</p>
              {group.map((r) => (
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
              ))}
            </div>
          );
        })}
    </div>
  );
}

function LcBlock({ day, showPoints }: { day: MockDay; showPoints?: boolean }) {
  const tiers: Array<{ key: "lcEasy" | "lcMedium" | "lcHard"; label: string; pts: number }> = [
    { key: "lcEasy", label: "Easy", pts: 20 },
    { key: "lcMedium", label: "Medium", pts: 30 },
    { key: "lcHard", label: "Hard", pts: 50 },
  ];
  return (
    <div>
      <span className="f08p-kicker">LeetCode (misc edit)</span>
      {tiers.map((t) => (
        <div key={t.key} className="f08p-lc-row">
          <span>
            {t.label}
            {showPoints && <span className="f08p-lc-pts"> · +{t.pts}</span>}
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
  );
}

function FullDayPanel({ day }: { day: MockDay }) {
  return (
    <div className="f08p-panel f08p-stack">
      <div>
        <span className="f08p-kicker">Selected day</span>
        <h3 style={{ margin: 0 }}>{formatLong(day.date)}</h3>
        <label className="muted" style={{ display: "inline-flex", gap: "0.35rem", marginTop: "0.35rem" }}>
          <input type="checkbox" defaultChecked /> Edit this day
        </label>
      </div>
      <LcBlock day={day} showPoints />
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
        Overlap: apps and reflections also appear in the completions column.
      </p>
    </div>
  );
}

function SlimDayPanel({ day }: { day: MockDay }) {
  return (
    <div className="f08p-panel f08p-stack">
      <div>
        <span className="f08p-kicker">Day actions</span>
        <h3 style={{ margin: 0 }}>{formatLong(day.date)}</h3>
        <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
          Apps and past notes live only in the log →
        </p>
      </div>
      <LcBlock day={day} showPoints />
      <button type="button" className={btn("primary", "sm")}>
        Add reflection
      </button>
    </div>
  );
}

export default function PastWorkPrototypePage() {
  const variant = useVariant(VARIANTS);
  const [selected, setSelected] = useState(TODAY);
  const [month, setMonth] = useState(monthAnchor(TODAY));
  const [kind, setKind] = useState<CompletionKind | "all">("all");
  const marks = useMemo(() => heatMarks(), []);
  const weekDays = windowEndingOn(selected, 7);
  const day = DAYS[selected] ?? {
    date: selected,
    lcEasy: 0,
    lcMedium: 0,
    lcHard: 0,
    apps: [],
    reflections: [],
  };
  const weekRows = COMPLETIONS.filter((r) => weekDays.includes(r.localDate));

  const stateLine = `selected=${selected} · window=${weekDays[0]}→${weekDays[6]} · kind=${kind} · variant=${variant}`;

  return (
    <ProgressShell
      title="Past work · edit vs completions"
      question="Q3 / Q55: Calendar picks the day. Completions show the 7 days ending on that day (filters kept). How do we avoid duplicating apps/reflections between the day panel and the log?"
      variants={VARIANTS}
      surfaceLabel="Past work"
      notes={
        <>
          <p>
            Locked for this exploration: kind filters; calendar as selector; no standalone
            1-/7-day pagination control; Lifetime owns lifetime totals.
          </p>
          <p>
            A keeps today&apos;s full day panel (clear overlap). B strips the day panel to
            actions only. C folds day actions into the focused day inside the week feed.
          </p>
        </>
      }
    >
      <p className="f08p-state" aria-live="polite">
        {stateLine}
      </p>

      {variant === "A" && (
        <div className="f08p-dual">
          <div className="f08p-stack">
            <ProtoCalendar
              month={month}
              selected={selected}
              today={TODAY}
              marks={marks}
              onMonth={setMonth}
              onSelect={(d) => {
                setSelected(d);
                setMonth(monthAnchor(d));
              }}
            />
            <FullDayPanel day={day} />
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
      )}

      {variant === "B" && (
        <div className="f08p-stack">
          <ProtoCalendar
            month={month}
            selected={selected}
            today={TODAY}
            marks={marks}
            onMonth={setMonth}
            onSelect={(d) => {
              setSelected(d);
              setMonth(monthAnchor(d));
            }}
          />
          <div className="f08p-dual">
            <SlimDayPanel day={day} />
            <div className="f08p-panel">
              <h3>Completions · week through {formatDay(selected, TODAY)}</h3>
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
        </div>
      )}

      {variant === "C" && (
        <div className="f08p-dual">
          <ProtoCalendar
            month={month}
            selected={selected}
            today={TODAY}
            marks={marks}
            onMonth={setMonth}
            onSelect={(d) => {
              setSelected(d);
              setMonth(monthAnchor(d));
            }}
          />
          <div className="f08p-panel">
            <h3>Week through {formatDay(selected, TODAY)}</h3>
            <KindTabs kind={kind} onKind={setKind} />
            {weekDays
              .slice()
              .reverse()
              .map((date) => {
                const d = DAYS[date] ?? {
                  date,
                  lcEasy: 0,
                  lcMedium: 0,
                  lcHard: 0,
                  apps: [],
                  reflections: [],
                };
                const group = weekRows.filter(
                  (r) =>
                    r.localDate === date && (kind === "all" || r.kind === kind),
                );
                const focus = date === selected;
                return (
                  <div
                    key={date}
                    className={`f08p-unified-day${focus ? " is-focus" : ""}`}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        alignItems: "baseline",
                      }}
                    >
                      <strong>{formatDay(date, TODAY)}</strong>
                      {!focus && (
                        <button
                          type="button"
                          className={btn("ghost", "sm")}
                          onClick={() => setSelected(date)}
                        >
                          Focus
                        </button>
                      )}
                    </div>
                    {focus && (
                      <div style={{ margin: "0.55rem 0" }}>
                        <LcBlock day={d} showPoints />
                        <button
                          type="button"
                          className={btn("primary", "sm")}
                          style={{ marginTop: "0.45rem" }}
                        >
                          Add reflection
                        </button>
                      </div>
                    )}
                    {group.length === 0 ? (
                      <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>
                        No rows{kind !== "all" ? ` in “${kind}”` : ""}.
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
        </div>
      )}
    </ProgressShell>
  );
}
