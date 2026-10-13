/**
 * F08 M5-06 · design question 5: a closed week's record in the completion log.
 * How the week's entries look in the Progress → Completions diary.
 * Must satisfy R5.8 (one entry per goal per week, e.g. Apps 6/10, LC 12/10),
 * R5.12 (0/0 earns nothing), R5.14 (LC past target) and R5.23 (points dated
 * at close, labelled with the week).
 */
import type { ReactNode } from "react";
import F08Shell, { ParamToggle, useParam, useVariant } from "./F08Shell";
import {
  dayLabel,
  LAST_MONDAY,
  LAST_WEEK_LABEL,
  THIS_MONDAY,
  WEEKLY_MET_BONUS,
  WEEKLY_UNIT_POINTS,
  weeklyGoalPoints,
} from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Ledger rows · Weekly kind + tab" },
  { key: "B", name: "Week-closed group on the close day" },
  { key: "C", name: "Divider at the week boundary" },
] as const;

type WeekEntry = { goal: "Apps" | "LC"; done: number; target: number };

const LAST_SUNDAY = new Date(LAST_MONDAY.getFullYear(), LAST_MONDAY.getMonth(), LAST_MONDAY.getDate() + 6);
const CLOSE_TIME = "9:02 AM";

function breakdown(e: WeekEntry): string {
  if (e.target <= 0) return "no tagged applications";
  const units = `${e.done} × ${WEEKLY_UNIT_POINTS}`;
  return e.done >= e.target ? `${units} + ${WEEKLY_MET_BONUS} · target met` : units;
}

function entryTitle(e: WeekEntry): string {
  return `${e.goal} ${e.done}/${e.target}`;
}

type DiaryRow = { id: string; kind: string; title: string; meta: string; at: string; points: number };

const MONDAY_ROWS: DiaryRow[] = [
  { id: "m1", kind: "task", title: "Mock interview prep", meta: "Admin · est 30 / actual 40", at: "11:15 AM", points: 50 },
];
const SUNDAY_ROWS: DiaryRow[] = [
  { id: "s1", kind: "app", title: "Ramp · Software Engineer Intern", meta: "Applied · actual 25", at: "4:40 PM", points: 30 },
  { id: "s2", kind: "reflection", title: "Graph BFS patterns clicked", meta: "Technical", at: "8:10 PM", points: 20 },
];

function PlainRow({ row }: { row: DiaryRow }) {
  return (
    <article className="ledger-row">
      <div>
        <div className="ledger-row-title">
          <span className="ledger-kind">{row.kind}</span>
          {row.title}
        </div>
        <div className="ledger-row-meta">{row.meta}</div>
      </div>
      <div className="ledger-row-aside">
        <span>{row.at}</span>
        <span className="ledger-pts">+{row.points} pts</span>
      </div>
    </article>
  );
}

function WeekRow({ entry, withWeek }: { entry: WeekEntry; withWeek: boolean }) {
  const pts = weeklyGoalPoints(entry.done, entry.target);
  return (
    <article className="ledger-row f08-week-row">
      <div>
        <div className="ledger-row-title">
          <span className="ledger-kind">weekly</span>
          {entryTitle(entry)}
        </div>
        <div className="ledger-row-meta">
          {withWeek ? `${LAST_WEEK_LABEL} · ` : ""}
          {breakdown(entry)}
        </div>
      </div>
      <div className="ledger-row-aside">
        <span>{CLOSE_TIME}</span>
        {pts > 0 && <span className="ledger-pts">+{pts} pts</span>}
      </div>
    </article>
  );
}

function Tabs({ withWeekly }: { withWeekly: boolean }) {
  const tabs = ["all", "tasks", "apps", "interviews", "reflections", ...(withWeekly ? ["weekly"] : [])];
  return (
    <div className="ledger-subtabs" role="tablist" aria-label="Completion type">
      {tabs.map((t) => (
        <button key={t} type="button" className={t === "all" ? "ledger-subtab on" : "ledger-subtab"}>
          {t}
        </button>
      ))}
    </div>
  );
}

function Day({ date, children }: { date: Date; children: ReactNode }) {
  return (
    <div className="ledger-day">
      <h5 className="ledger-day-label">{dayLabel(date)}</h5>
      {children}
    </div>
  );
}

export default function WeeklyRecordPrototypePage() {
  const variant = useVariant(VARIANTS);
  const apps = useParam("apps", ["partial", "met", "zero"] as const);
  const entries: WeekEntry[] = [
    apps === "zero"
      ? { goal: "Apps", done: 0, target: 0 }
      : apps === "met"
        ? { goal: "Apps", done: 6, target: 6 }
        : { goal: "Apps", done: 6, target: 10 },
    { goal: "LC", done: 12, target: 10 },
  ];

  return (
    <F08Shell
      title="Progress · Completions · weekly record"
      question="Q5: how a closed week's entries look in the completion log diary."
      variants={VARIANTS}
      surfaceLabel="Q5 Weekly record"
      controls={
        <ParamToggle
          name="apps"
          label="Last week's apps"
          options={[
            { key: "partial", label: "6/10" },
            { key: "met", label: "6/6" },
            { key: "zero", label: "0/0" },
          ]}
        />
      }
      notes={
        <p>
          The week closed on the first request after it ended (here Monday {CLOSE_TIME}), so the points are
          dated Monday and labelled “{LAST_WEEK_LABEL}” (R5.23). If the app wasn&apos;t opened for days, the
          close date is later. C places the record at the week boundary instead of on the close day
          (Proposed). A 0/0 apps week still gets its entry, with no points (R5.8, R5.12; showing it is
          Proposed).
        </p>
      }
    >
      <div className="card f08-card f08-narrow ledger-completions" key={variant}>
        <Tabs withWeekly={variant === "A"} />
        {variant === "A" && (
          <>
            <Day date={THIS_MONDAY}>
              {MONDAY_ROWS.map((r) => (
                <PlainRow key={r.id} row={r} />
              ))}
              {entries.map((e) => (
                <WeekRow key={e.goal} entry={e} withWeek />
              ))}
            </Day>
            <Day date={LAST_SUNDAY}>
              {SUNDAY_ROWS.map((r) => (
                <PlainRow key={r.id} row={r} />
              ))}
            </Day>
          </>
        )}
        {variant === "B" && (
          <>
            <Day date={THIS_MONDAY}>
              <div className="f08-week-group">
                <div className="f08-week-group-head">
                  <strong>{LAST_WEEK_LABEL} closed</strong>
                  <span className="ledger-pts">
                    +{entries.reduce((s, e) => s + weeklyGoalPoints(e.done, e.target), 0)} pts
                  </span>
                </div>
                {entries.map((e) => (
                  <WeekRow key={e.goal} entry={e} withWeek={false} />
                ))}
              </div>
              {MONDAY_ROWS.map((r) => (
                <PlainRow key={r.id} row={r} />
              ))}
            </Day>
            <Day date={LAST_SUNDAY}>
              {SUNDAY_ROWS.map((r) => (
                <PlainRow key={r.id} row={r} />
              ))}
            </Day>
          </>
        )}
        {variant === "C" && (
          <>
            <Day date={THIS_MONDAY}>
              {MONDAY_ROWS.map((r) => (
                <PlainRow key={r.id} row={r} />
              ))}
            </Day>
            <div className="f08-week-divider" role="separator" aria-label={`${LAST_WEEK_LABEL} record`}>
              <span className="f08-week-divider-label">{LAST_WEEK_LABEL}</span>
              {entries.map((e) => {
                const pts = weeklyGoalPoints(e.done, e.target);
                return (
                  <span key={e.goal} className="f08-week-divider-entry">
                    {entryTitle(e)}
                    {pts > 0 ? <strong> +{pts}</strong> : <span className="muted"> · no reward</span>}
                  </span>
                );
              })}
              <span className="muted f08-hint">closed Mon {CLOSE_TIME}</span>
            </div>
            <Day date={LAST_SUNDAY}>
              {SUNDAY_ROWS.map((r) => (
                <PlainRow key={r.id} row={r} />
              ))}
            </Day>
          </>
        )}
      </div>
    </F08Shell>
  );
}
