/**
 * F08 M8-01 · Lifetime — accumulation record.
 * Chart = seeds/day with in-container range; heatmaps = existing ProgressHeatmap
 * side by side; days worked in secondary stats. Ticket: M8-01.
 */
import { useState } from "react";
import ProgressHeatmap from "../../features/progress/ProgressHeatmap";
import ProgressShell, { btn, useVariant } from "./ProgressShell";
import {
  ACHIEVEMENTS,
  LIFETIME_STATS,
  mockHeatmapDays,
  series,
} from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Chart above heatmaps" },
  { key: "B", name: "Heatmaps above chart" },
] as const;

const RANGES = [
  { key: 7, label: "1 week" },
  { key: 30, label: "1 month" },
  { key: 90, label: "~3 months" },
] as const;

function AccumulationHeader() {
  const s = LIFETIME_STATS;
  return (
    <div className="f08p-panel f08p-stack">
      <span className="f08p-kicker">Lifetime record</span>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
        <div>
          <strong style={{ fontSize: "1.75rem" }}>{s.leetcode}</strong>
          <div className="muted">LC solves</div>
        </div>
        <div>
          <strong style={{ fontSize: "1.75rem" }}>{s.apps}</strong>
          <div className="muted">applications</div>
        </div>
        <div>
          <strong style={{ fontSize: "1.75rem" }}>{s.minutes.toLocaleString()}</strong>
          <div className="muted">minutes worked</div>
        </div>
        <div>
          <strong style={{ fontSize: "1.75rem" }}>{s.seedsLifetime.toLocaleString()}</strong>
          <div className="muted">seeds earned (lifetime)</div>
        </div>
      </div>
      <div className="f08p-stats" style={{ marginBottom: 0 }}>
        {(
          [
            ["Tasks", s.tasks],
            ["Interviews", s.interviews],
            ["Reflections", s.reflections],
            ["Days worked", s.daysWorked],
            ["Longest LC streak", s.longestLcStreak],
            ["Longest apps streak", s.longestAppsStreak],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="f08p-stat">
            <strong>{n}</strong>
            <span className="muted">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ActivityChart() {
  const [days, setDays] = useState<(typeof RANGES)[number]["key"]>(30);
  const points = series(Math.min(days, 90), "seeds");
  const max = Math.max(1, ...points.map((p) => p.value));
  const w = 560;
  const h = 120;
  const pad = 8;
  const coords = points.map((p, i) => {
    const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
    const y = h - pad - (p.value / max) * (h - pad * 2);
    return `${x},${y}`;
  });
  return (
    <div className="f08p-panel">
      <div className="f08p-chart-head">
        <span className="f08p-kicker" style={{ marginBottom: 0 }}>
          Activity · seeds earned / day
        </span>
        <div className="f08p-kind-tabs" style={{ marginBottom: 0 }} role="group" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={btn("ghost", "sm", days === r.key ? "is-active" : "")}
              aria-pressed={days === r.key}
              onClick={() => setDays(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <svg viewBox={`0 0 ${w} ${h}`} className="f08p-chart" role="img" aria-label="Seeds earned over time">
        <polyline
          fill="none"
          stroke="var(--accent-blue-deep)"
          strokeWidth="2.5"
          points={coords.join(" ")}
        />
      </svg>
      <div className="muted" style={{ fontSize: "0.75rem" }}>
        Last {days} days · peak {max} seeds · week-close lumps may spike Mondays (accepted for now)
      </div>
    </div>
  );
}

function HeatmapsRow() {
  const appDays = mockHeatmapDays("application");
  const techDays = mockHeatmapDays("technical");
  const today = appDays[appDays.length - 1]!.date;
  return (
    <div className="f08p-heat-row">
      <ProgressHeatmap title="Application prep" days={appDays} today={today} />
      <ProgressHeatmap title="Technical prep" days={techDays} today={today} />
    </div>
  );
}

function AchievementsList() {
  const families = [...new Set(ACHIEVEMENTS.map((a) => a.family))];
  const nextIds = new Set(
    families
      .map((f) => ACHIEVEMENTS.find((a) => a.family === f && !a.unlocked)?.id)
      .filter(Boolean),
  );
  return (
    <div className="f08p-panel">
      <h3 style={{ marginTop: 0 }}>Achievements</h3>
      <ul className="f08p-ach">
        {ACHIEVEMENTS.map((a) => {
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

export default function LifetimePrototypePage() {
  const variant = useVariant(VARIANTS);

  return (
    <ProgressShell
      title="Lifetime · accumulation"
      question="Header with days worked; seeds activity chart (range in-container); existing heatmaps side by side; full achievements."
      variants={VARIANTS}
      surfaceLabel="Lifetime"
      notes={
        <p>
          Chart metric locked to seeds/day (R8.14). Heatmaps reuse production{" "}
          <code>ProgressHeatmap</code> + colors. Past work calendar intensity is still open (Q68).
        </p>
      }
    >
      <p className="f08p-state">variant={variant} · chart=seeds · heatmaps=existing side-by-side</p>
      <div className="f08p-stack">
        <AccumulationHeader />
        {variant === "A" ? (
          <>
            <ActivityChart />
            <HeatmapsRow />
          </>
        ) : (
          <>
            <HeatmapsRow />
            <ActivityChart />
          </>
        )}
        <AchievementsList />
      </div>
    </ProgressShell>
  );
}
