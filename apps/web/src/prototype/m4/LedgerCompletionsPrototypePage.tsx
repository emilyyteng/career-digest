/**
 * Progress → Ledger → Completions diary variants.
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import {
  completionStats,
  completions,
  type ProtoCompletion,
  type ProtoCompletionKind,
} from "./fixtures";
import "./prototype-m4.css";

const VARIANTS = [
  { key: "A", name: "Preferred · stats cards + type tabs" },
  { key: "B", name: "Stats as chips · denser rows" },
  { key: "C", name: "Type filter pills · quieter pts" },
] as const;

const DAY_LABELS: Record<string, string> = {
  today: "Today",
  yesterday: "Yesterday",
  mon: "Mon · Mar 9",
};

const TYPE_TABS: Array<{ key: "all" | ProtoCompletionKind; label: string }> = [
  { key: "all", label: "all" },
  { key: "task", label: "tasks" },
  { key: "application", label: "apps" },
  { key: "interview", label: "interview" },
  { key: "reflection", label: "reflections" },
];

function allTimeCount(key: "all" | ProtoCompletionKind): number {
  if (key === "all") {
    const s = completionStats.allTime;
    return s.tasks + s.apps + s.interview + s.reflections;
  }
  if (key === "task") return completionStats.allTime.tasks;
  if (key === "application") return completionStats.allTime.apps;
  if (key === "interview") return completionStats.allTime.interview;
  return completionStats.allTime.reflections;
}

function disparity(est?: number | null, actual?: number | null) {
  if (est == null || actual == null) return null;
  const delta = actual - est;
  if (delta === 0) return { text: "on estimate", tone: "" };
  if (delta > 0) return { text: `+${delta}m over`, tone: "over" };
  return { text: `${delta}m under`, tone: "under" };
}

function CompletionRow({
  row,
  quietPts,
  dense,
}: {
  row: ProtoCompletion;
  quietPts?: boolean;
  dense?: boolean;
}) {
  const disp = disparity(row.estimateMin, row.actualMin);
  return (
    <article className="proto-m4-row">
      <div>
        <div className="proto-m4-row-title">
          {!dense && <span className="proto-m4-kind">{row.kind}</span>}
          {row.title}
        </div>
        <div className="proto-m4-row-meta">
          {dense && <span className="proto-m4-kind">{row.kind}</span>}
          {row.subtitle}
          {(row.estimateMin != null || row.actualMin != null) && (
            <>
              {" · "}
              {row.estimateMin != null ? `est ${row.estimateMin}` : "est —"}
              {" / "}
              {row.actualMin != null ? `actual ${row.actualMin}` : "actual —"}
              {disp && (
                <span className={`proto-m4-disparity ${disp.tone}`}> · {disp.text}</span>
              )}
            </>
          )}
        </div>
        {row.reflections && row.reflections.length > 0 && (
          <div className="proto-m4-nested">
            {row.reflections.map((r) => (
              <div key={r.id} className="proto-m4-nested-item">
                ✎ {r.preview}
                {r.minutes != null ? ` · ${r.minutes}m` : ""}
                {r.deepWork ? " · dw" : ""}
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="proto-m4-row-aside">
        <span>{row.when}</span>
        {row.points != null && (
          <span className="pts" style={quietPts ? { fontWeight: 500, opacity: 0.75 } : undefined}>
            {row.points > 0 ? `+${row.points} pts` : "—"}
          </span>
        )}
      </div>
    </article>
  );
}

export default function LedgerCompletionsPrototypePage() {
  const [params] = useSearchParams();
  const variant = (params.get("variant") ?? "A").toUpperCase();
  const [type, setType] = useState<"all" | ProtoCompletionKind>("all");

  const filtered = useMemo(() => {
    if (type === "all") return completions;
    return completions.filter((c) => c.kind === type);
  }, [type]);

  const byDay = useMemo(() => {
    const map = new Map<string, ProtoCompletion[]>();
    for (const row of filtered) {
      const list = map.get(row.dayKey) ?? [];
      list.push(row);
      map.set(row.dayKey, list);
    }
    return [...map.entries()];
  }, [filtered]);

  const quietPts = variant === "C";
  const dense = variant === "B";

  return (
    <section className="proto-m4-page">
      <p className="prototype-banner">
        Completions diary under Progress → Ledger. Counts are week/month (not
        points-first). Type tabs show all-time. Nested reflections stay on work
        rows;         Reflections tab lists standalone. Locked A: titles link to work; nested
        reflections open edit. Tabs use borders (no shadow).{" "}
        <Link to="/prototype/m4">← M4 hub</Link>
      </p>

      <div className="proto-m4-host">
        <span className="proto-m4-host-label">Progress</span>
        <div className="proto-m4-tabs" role="tablist" aria-label="Progress tabs">
          <button type="button" className="tab">
            today
          </button>
          <button type="button" className="tab">
            history
          </button>
          <button type="button" className="tab on">
            ledger
          </button>
        </div>
        <div className="proto-m4-subtabs" role="tablist" aria-label="Ledger">
          <button type="button" className="proto-m4-subtab on">
            Completions
          </button>
          <Link
            className="proto-m4-subtab"
            to={`/prototype/m4/ledger-points?variant=${variant}`}
            style={{ textDecoration: "none" }}
          >
            Points
          </Link>
        </div>

        {variant === "B" ? (
          <div className="proto-m4-stats-chips">
            <span className="proto-m4-chip">
              This week · {completionStats.week.tasks} tasks · {completionStats.week.apps} apps ·{" "}
              {completionStats.week.interview} interview · {completionStats.week.reflections} refl
            </span>
            <span className="proto-m4-chip">
              This month · {completionStats.month.tasks}/{completionStats.month.apps}/
              {completionStats.month.interview}/{completionStats.month.reflections}
            </span>
            <span className="proto-m4-chip">{completionStats.minutesWeek}m this week</span>
            <span className="proto-m4-chip">{completionStats.minutesMonth}m this month</span>
          </div>
        ) : (
          <div className="proto-m4-stats">
            <div className="proto-m4-stat-card">
              <span className="kicker">This week</span>
              <strong>
                {completionStats.week.tasks} tasks · {completionStats.week.apps} apps ·{" "}
                {completionStats.week.interview} interview · {completionStats.week.reflections}{" "}
                reflections
              </strong>
              <span className="mins">{completionStats.minutesWeek} minutes worked</span>
            </div>
            <div className="proto-m4-stat-card">
              <span className="kicker">This month</span>
              <strong>
                {completionStats.month.tasks} tasks · {completionStats.month.apps} apps ·{" "}
                {completionStats.month.interview} interview · {completionStats.month.reflections}{" "}
                reflections
              </strong>
              <span className="mins">{completionStats.minutesMonth} minutes worked</span>
            </div>
          </div>
        )}

        <div className="proto-m4-subtabs" role="tablist" aria-label="Completion type">
          {TYPE_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              className={type === tab.key ? "proto-m4-subtab on" : "proto-m4-subtab"}
              onClick={() => setType(tab.key)}
            >
              {tab.label}
              <span className="count">{allTimeCount(tab.key)}</span>
            </button>
          ))}
        </div>

        {byDay.map(([dayKey, rows]) => (
          <div key={dayKey} className="proto-m4-day">
            <h5 className="proto-m4-day-label">{DAY_LABELS[dayKey] ?? dayKey}</h5>
            {rows.map((row) => (
              <CompletionRow
                key={row.id}
                row={row}
                quietPts={quietPts}
                dense={dense}
              />
            ))}
          </div>
        ))}
      </div>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Completions" />
    </section>
  );
}
