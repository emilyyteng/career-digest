/**
 * F08 M8-01 · design questions 1–2 + 5: This week composition, heatmap peek,
 * LC tier polish (+20 / +30 / +50 on the steppers).
 * Ticket: M8-01.
 */
import ProgressShell, { btn, useVariant } from "./ProgressShell";
import {
  TODAY,
  WEEKLY_GOALS,
  addDays,
  heatMarks,
  formatDay,
} from "./fixtures";

const VARIANTS = [
  {
    key: "A",
    name: "Goals hero · log beside · 7-day rhythm peek",
  },
  {
    key: "B",
    name: "Goals + 14-day short grids · log below",
  },
  {
    key: "C",
    name: "Collapsed peek · goals/log side by side · LC points loud",
  },
] as const;

function GoalBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div className="f08p-goal-bar" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total}>
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function StreakStrip() {
  return (
    <div className="f08p-panel" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      <span className="f08p-kicker" style={{ width: "100%", marginBottom: 0 }}>
        Today · {formatDay(TODAY, TODAY)}
      </span>
      <div>
        <strong style={{ fontSize: "1.4rem" }}>4</strong>
        <div className="muted" style={{ fontSize: "0.8rem" }}>
          Apps daily streak · ✓ · 1 completed today
        </div>
      </div>
      <div>
        <strong style={{ fontSize: "1.4rem" }}>6</strong>
        <div className="muted" style={{ fontSize: "0.8rem" }}>
          LC daily streak · ✓ · 2 completed today
        </div>
      </div>
    </div>
  );
}

function WeeklyBlock() {
  const { lc, apps } = WEEKLY_GOALS;
  return (
    <div className="f08p-panel f08p-stack">
      <h3 style={{ margin: 0 }}>This week</h3>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
          <strong>LeetCode · {lc.label}</strong>
          <span className="muted">
            {lc.done}/{lc.total} · {lc.pace}
          </span>
        </div>
        <GoalBar done={lc.done} total={lc.total} />
        {lc.streak >= 2 && (
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            {lc.streak} weeks in a row
          </span>
        )}
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem" }}>
          <strong>Applications</strong>
          <span className="muted">
            {apps.done}/{apps.total} · {apps.pace}
          </span>
        </div>
        <GoalBar done={apps.done} total={apps.total} />
        <ul className="f08p-list">
          {apps.members.map((m) => (
            <li key={m.label}>
              {m.label}
              {m.applied && (
                <span className="muted" style={{ marginLeft: "0.35rem" }}>
                  applied
                </span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function LcLogger({ loud }: { loud?: boolean }) {
  const tiers = [
    { label: "Easy", count: 0, pts: 20 },
    { label: "Medium", count: 1, pts: 30 },
    { label: "Hard", count: 1, pts: 50 },
  ];
  return (
    <div className="f08p-panel">
      <h4 style={{ marginTop: 0 }}>LeetCode</h4>
      <div className="f08p-kind-tabs" style={{ marginBottom: "0.5rem" }}>
        <button type="button" className={btn("ghost", "sm", "is-active")}>
          Weekly
        </button>
        <button type="button" className={btn("ghost", "sm")}>
          Misc
        </button>
      </div>
      {tiers.map((t) => (
        <div key={t.label} className="f08p-lc-row">
          <span>
            <strong>{t.label}</strong>
            {loud ? (
              <span className="f08p-lc-pts"> +{t.pts}</span>
            ) : (
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                {" "}
                (+{t.pts})
              </span>
            )}
          </span>
          <span>
            <button type="button" className={btn("ghost", "sm")} disabled>
              −
            </button>{" "}
            {t.count}{" "}
            <button type="button" className={btn("ghost", "sm")} disabled>
              +
            </button>
          </span>
        </div>
      ))}
      <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
        Today: 2 solved · 0 easy · 1 medium · 1 hard
      </p>
    </div>
  );
}

function LogColumn({ loudLc }: { loudLc?: boolean }) {
  return (
    <div className="f08p-stack">
      <LcLogger loud={loudLc} />
      <div className="f08p-panel">
        <h4 style={{ marginTop: 0 }}>Daily progress</h4>
        <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
          Reflection compose (mock)
        </p>
        <textarea rows={3} defaultValue="" placeholder="Write a note…" style={{ width: "100%" }} />
        <button type="button" className={btn("primary", "sm")} style={{ marginTop: "0.45rem" }}>
          Save note
        </button>
        <div style={{ marginTop: "0.75rem" }}>
          <span className="f08p-kicker">Today&apos;s notes</span>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>
            Worked two medium graphs; still slow on DFS framing.
          </p>
        </div>
        <div style={{ marginTop: "0.75rem" }}>
          <span className="f08p-kicker">Apps</span>
          <p style={{ margin: 0, fontSize: "0.9rem" }}>Notion · Software Engineer Intern</p>
        </div>
      </div>
    </div>
  );
}

function RhythmPeek({ days }: { days: 7 | 14 }) {
  const marks = heatMarks();
  const dates = Array.from({ length: days }, (_, i) => addDays(TODAY, -(days - 1 - i)));
  return (
    <div className="f08p-panel">
      <span className="f08p-kicker">Heatmap peek · last {days} days</span>
      <div className="f08p-rhythm" aria-label={`Last ${days} days`}>
        {dates.map((d) => {
          const e = marks[d]?.earned ?? 0;
          return (
            <span
              key={d}
              className={`f08p-rhythm-cell${e ? ` e${e}` : ""}`}
              title={`${d}: ${e}`}
            />
          );
        })}
      </div>
    </div>
  );
}

function ShortGrids() {
  const marks = heatMarks();
  const dates = Array.from({ length: 14 }, (_, i) => addDays(TODAY, -(13 - i)));
  return (
    <div className="f08p-panel f08p-stack">
      <span className="f08p-kicker">Application prep · 14 days</span>
      <div className="f08p-heat-grid">
        {dates.map((d) => {
          const e = marks[d]?.earned ?? 0;
          return <span key={`a-${d}`} className={`f08p-rhythm-cell${e ? ` e${e}` : ""}`} />;
        })}
      </div>
      <span className="f08p-kicker">Technical prep · 14 days</span>
      <div className="f08p-heat-grid">
        {dates.map((d) => {
          const e = marks[d]?.effort ? 2 : marks[d]?.earned ?? 0;
          return <span key={`t-${d}`} className={`f08p-rhythm-cell${e ? ` e${Math.min(3, e)}` : ""}`} />;
        })}
      </div>
    </div>
  );
}

export default function ThisWeekPrototypePage() {
  const variant = useVariant(VARIANTS);

  return (
    <ProgressShell
      title="This week · hub landing"
      question="Q1–Q2 / Q5: First viewport = on track + log work. Heatmap is a peek (7 / 14 / collapsed). LC steppers show tier + points."
      variants={VARIANTS}
      surfaceLabel="This week"
      notes={
        <p>
          Full ~26-week dual heatmaps are intentionally absent. Lifetime decides whether
          longer heatmaps still exist (Q57).
        </p>
      }
    >
      <p className="f08p-state">variant={variant} · today={TODAY}</p>

      {variant === "A" && (
        <div className="f08p-week">
          <StreakStrip />
          <div className="f08p-week-top">
            <WeeklyBlock />
            <LogColumn />
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <div className="f08p-panel" style={{ flex: "1 1 10rem" }}>
              <span className="f08p-kicker">This week</span>
              <strong>2 apps · 7 LC · 3 reflections</strong>
            </div>
            <div className="f08p-panel" style={{ flex: "1 1 10rem" }}>
              <span className="f08p-kicker">Next achievement</span>
              <strong>50 applications</strong>
              <div className="muted" style={{ fontSize: "0.8rem" }}>
                36/50 · Lifetime →
              </div>
            </div>
            <div style={{ flex: "1 1 12rem" }}>
              <RhythmPeek days={7} />
            </div>
          </div>
        </div>
      )}

      {variant === "B" && (
        <div className="f08p-week">
          <StreakStrip />
          <WeeklyBlock />
          <ShortGrids />
          <LogColumn />
        </div>
      )}

      {variant === "C" && (
        <div className="f08p-week">
          <StreakStrip />
          <details className="f08p-panel">
            <summary style={{ cursor: "pointer" }}>Heatmap peek · last 7 days (collapsed)</summary>
            <div style={{ marginTop: "0.65rem" }}>
              <RhythmPeek days={7} />
            </div>
          </details>
          <div className="f08p-week-top">
            <WeeklyBlock />
            <LogColumn loudLc />
          </div>
        </div>
      )}
    </ProgressShell>
  );
}
