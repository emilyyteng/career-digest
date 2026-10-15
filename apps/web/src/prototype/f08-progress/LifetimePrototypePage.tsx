/**
 * F08 M8-01 · design question 4 (+ Q57): Lifetime totals, achievements,
 * optional full heatmaps.
 * Ticket: M8-01.
 */
import ProgressShell, { useVariant } from "./ProgressShell";
import {
  ACHIEVEMENTS,
  LIFETIME_STATS,
  TODAY,
  addDays,
  heatMarks,
} from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Totals + achievements only (no heatmaps)" },
  { key: "B", name: "Totals + dual full-ish heatmaps + achievements" },
  { key: "C", name: "Totals + next unlocks emphasized · single rhythm strip" },
] as const;

function Totals() {
  const s = LIFETIME_STATS;
  return (
    <div className="f08p-stats">
      {(
        [
          ["Tasks", s.tasks],
          ["Apps", s.apps],
          ["Interviews", s.interviews],
          ["Reflections", s.reflections],
          ["LC solves", s.leetcode],
          ["Weekly records", s.weekly],
        ] as const
      ).map(([label, n]) => (
        <div key={label} className="f08p-stat f08p-panel">
          <strong>{n}</strong>
          <span className="muted">{label}</span>
        </div>
      ))}
    </div>
  );
}

function AchievementsList({ nextOnly }: { nextOnly?: boolean }) {
  const families = [...new Set(ACHIEVEMENTS.map((a) => a.family))];
  const nextIds = new Set(
    families
      .map((f) => ACHIEVEMENTS.find((a) => a.family === f && !a.unlocked)?.id)
      .filter(Boolean),
  );
  const rows = nextOnly
    ? ACHIEVEMENTS.filter((a) => nextIds.has(a.id))
    : ACHIEVEMENTS;

  return (
    <div className="f08p-panel">
      <h3 style={{ marginTop: 0 }}>{nextOnly ? "Next unlocks" : "Achievements"}</h3>
      <ul className="f08p-ach">
        {rows.map((a) => {
          const pct = Math.min(100, Math.round((a.current / a.threshold) * 100));
          const isNext = nextIds.has(a.id);
          return (
            <li key={a.id} className={isNext ? "is-next" : undefined}>
              <div>
                <span className="muted" style={{ fontSize: "0.75rem" }}>
                  {a.family}
                </span>
                <div>
                  <strong>{a.label}</strong>
                  {a.unlocked && (
                    <span className="muted" style={{ marginLeft: "0.35rem" }}>
                      unlocked
                    </span>
                  )}
                </div>
              </div>
              <span className={a.unlocked ? "f08p-pts" : "muted"}>+{a.points}</span>
              {!a.unlocked && (
                <>
                  <div className="f08p-ach-bar" aria-hidden>
                    <span style={{ width: `${pct}%` }} />
                  </div>
                  <span className="muted" style={{ fontSize: "0.8rem" }}>
                    {a.current}/{a.threshold}
                  </span>
                </>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function DualHeat() {
  const marks = heatMarks();
  const dates = Array.from({ length: 28 }, (_, i) => addDays(TODAY, -(27 - i)));
  return (
    <div className="f08p-panel f08p-stack">
      <span className="f08p-kicker">Application prep · 28 days (prototype stand-in for ~26 weeks)</span>
      <div className="f08p-heat-grid" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
        {dates.map((d) => {
          const e = marks[d]?.earned ?? 0;
          return <span key={`a-${d}`} className={`f08p-rhythm-cell${e ? ` e${e}` : ""}`} />;
        })}
      </div>
      <span className="f08p-kicker">Technical prep · 28 days</span>
      <div className="f08p-heat-grid" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
        {dates.map((d) => {
          const e = marks[d]?.effort ? 2 : 0;
          return <span key={`t-${d}`} className={`f08p-rhythm-cell${e ? ` e${e}` : ""}`} />;
        })}
      </div>
    </div>
  );
}

function SingleRhythm() {
  const marks = heatMarks();
  const dates = Array.from({ length: 28 }, (_, i) => addDays(TODAY, -(27 - i)));
  return (
    <div className="f08p-panel">
      <span className="f08p-kicker">Combined rhythm · 28 days</span>
      <div className="f08p-rhythm">
        {dates.map((d) => {
          const e = Math.max(marks[d]?.earned ?? 0, marks[d]?.effort ? 1 : 0);
          return <span key={d} className={`f08p-rhythm-cell${e ? ` e${e}` : ""}`} />;
        })}
      </div>
    </div>
  );
}

export default function LifetimePrototypePage() {
  const variant = useVariant(VARIANTS);

  return (
    <ProgressShell
      title="Lifetime · accumulated work"
      question="Q4 / Q57: All-time totals and achievements live here (not seeds). Do full heatmaps belong here, or only the This week peek?"
      variants={VARIANTS}
      surfaceLabel="Lifetime"
      notes={
        <p>
          No seeds balance or Earnings chrome — currency stays on Rewards. Lifetime
          numbers answer the “global” view that Past work no longer tries to be.
        </p>
      }
    >
      <p className="f08p-state">variant={variant}</p>
      <Totals />
      {variant === "A" && <AchievementsList />}
      {variant === "B" && (
        <>
          <DualHeat />
          <AchievementsList />
        </>
      )}
      {variant === "C" && (
        <>
          <SingleRhythm />
          <AchievementsList nextOnly />
          <details className="f08p-panel">
            <summary style={{ cursor: "pointer" }}>All achievements</summary>
            <div style={{ marginTop: "0.5rem" }}>
              <AchievementsList />
            </div>
          </details>
        </>
      )}
    </ProgressShell>
  );
}
