/**
 * F08 M8-01 · This week — locked composition (no heatmap peek).
 * LC · apps · tasks · interviews · reflections / minutes (Q70).
 * Ticket: M8-01.
 */
import ProgressShell, { btn, useVariant } from "./ProgressShell";
import { ACHIEVEMENTS, PULSE, TODAY, WEEKLY_GOALS, formatDay } from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Locked · streaks, pulse, next achievements, goals, log" },
] as const;

function GoalBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div
      className="f08p-goal-bar"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
    >
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

function PulseCards() {
  return (
    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
      {(
        [
          ["This week", PULSE.week],
          ["This month", PULSE.month],
        ] as const
      ).map(([label, p]) => (
        <div key={label} className="f08p-panel" style={{ flex: "1 1 14rem" }}>
          <span className="f08p-kicker">{label}</span>
          <strong style={{ fontSize: "0.95rem" }}>{p.line}</strong>
          <div className="muted" style={{ fontSize: "0.85rem", marginTop: "0.25rem" }}>
            {p.minutes} minutes worked
          </div>
        </div>
      ))}
    </div>
  );
}

function NextAchievements() {
  const families = [...new Set(ACHIEVEMENTS.map((a) => a.family))];
  const next = families
    .map((f) => ACHIEVEMENTS.find((a) => a.family === f && !a.unlocked))
    .filter(Boolean) as typeof ACHIEVEMENTS;

  return (
    <div className="f08p-panel">
      <h3 style={{ marginTop: 0 }}>Next achievements</h3>
      <ul className="f08p-ach">
        {next.map((a) => {
          const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
          return (
            <li key={a.id} className="is-next">
              <div>
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  {a.family}
                </span>
                <div>
                  <strong>{a.label}</strong>
                </div>
              </div>
              <span className="muted">+{a.points}</span>
              <div className="f08p-ach-bar" aria-hidden>
                <span style={{ width: `${pct}%` }} />
              </div>
              <span className="muted" style={{ fontSize: "0.8rem" }}>
                {a.current}/{a.threshold}
              </span>
            </li>
          );
        })}
      </ul>
      <p className="muted" style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
        Full list on Lifetime →
      </p>
    </div>
  );
}

function WeeklyBlock() {
  const { lc, apps } = WEEKLY_GOALS;
  return (
    <div className="f08p-panel f08p-stack">
      <h3 style={{ margin: 0 }}>Weekly goals</h3>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <strong>LeetCode · {lc.label}</strong>
          <span className="muted">
            {lc.done}/{lc.total} · {lc.pace}
            {lc.streak >= 2 ? ` · ${lc.streak} weeks in a row` : ""}
          </span>
        </div>
        <GoalBar done={lc.done} total={lc.total} />
      </div>
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
          <strong>Applications</strong>
          <span className="muted">
            {apps.done}/{apps.total} · {apps.pace}
            {apps.streak >= 2 ? ` · ${apps.streak} weeks in a row` : ""}
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

function LcLogger() {
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
            <span className="f08p-lc-pts"> +{t.pts}</span>
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

function DailyProgress() {
  return (
    <div className="f08p-panel">
      <h4 style={{ marginTop: 0 }}>Daily progress</h4>
      <p className="muted" style={{ marginTop: 0, fontSize: "0.85rem" }}>
        Reflection compose (separate from LC)
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
  );
}

export default function ThisWeekPrototypePage() {
  useVariant(VARIANTS);

  return (
    <ProgressShell
      title="This week · locked layout"
      question="Day streaks; week+month pulse (LC · apps · tasks · interviews · reflections / minutes); next achievement per family; weekly goals with weekly streaks; LC and compose separate. No heatmap peek."
      variants={VARIANTS}
      surfaceLabel="This week"
      notes={
        <p>
          Achievements block placement vs a long apps member list is still worth a glance in the
          browser — everything above the apps list by default.
        </p>
      }
    >
      <p className="f08p-state">pulse order = LC · apps · tasks · interviews · reflections</p>
      <div className="f08p-week">
        <StreakStrip />
        <PulseCards />
        <div className="f08p-week-top">
          <div className="f08p-stack">
            <NextAchievements />
            <WeeklyBlock />
          </div>
          <div className="f08p-stack">
            <LcLogger />
            <DailyProgress />
          </div>
        </div>
      </div>
    </ProgressShell>
  );
}
