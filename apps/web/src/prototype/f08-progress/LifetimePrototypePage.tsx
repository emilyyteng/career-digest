/**
 * F08 M8-01 · Lifetime — accumulation record: richer header, full achievements,
 * heatmaps + activity chart. Explores metrics (Q67–Q69). Ticket: M8-01.
 */
import ProgressShell, { ParamToggle, useParam, useVariant } from "./ProgressShell";
import {
  ACHIEVEMENTS,
  DAYS,
  LIFETIME_STATS,
  TODAY,
  addDays,
  intensityForDay,
  series,
  type IntensityMetric,
} from "./fixtures";

const VARIANTS = [
  { key: "A", name: "Header + chart + heatmaps + full achievements" },
  { key: "B", name: "Header + heatmaps + chart below + full achievements" },
] as const;

const METRICS: Array<{ key: IntensityMetric; label: string }> = [
  { key: "seeds", label: "seeds (all)" },
  { key: "seedsWork", label: "seeds (no weekly)" },
  { key: "minutes", label: "minutes" },
  { key: "events", label: "events" },
];

const RANGES = [
  { key: "7", label: "1 week" },
  { key: "30", label: "1 month" },
  { key: "90", label: "~3 months" },
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
          <strong style={{ fontSize: "1.75rem" }}>4,820</strong>
          <div className="muted">minutes worked</div>
        </div>
        <div>
          <strong style={{ fontSize: "1.75rem" }}>12,640</strong>
          <div className="muted">seeds earned (lifetime)</div>
        </div>
      </div>
      <div className="f08p-stats" style={{ marginBottom: 0 }}>
        {(
          [
            ["Tasks", s.tasks],
            ["Interviews", s.interviews],
            ["Reflections", s.reflections],
            ["Weekly records", s.weekly],
            ["Longest LC streak", 14],
            ["Longest apps streak", 9],
          ] as const
        ).map(([label, n]) => (
          <div key={label} className="f08p-stat">
            <strong>{n}</strong>
            <span className="muted">{label}</span>
          </div>
        ))}
      </div>
      <p className="muted" style={{ margin: 0, fontSize: "0.8rem" }}>
        Header content still open (Q69) — this mock mixes counts, time, seeds earned, and streak
        highs to feel like a record, not a sparse strip.
      </p>
    </div>
  );
}

function ActivityChart({
  metric,
  days,
}: {
  metric: IntensityMetric;
  days: number;
}) {
  const points = series(Math.min(days, 42), metric);
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
      <span className="f08p-kicker">Activity · last {days} days · {metric}</span>
      <svg viewBox={`0 0 ${w} ${h}`} className="f08p-chart" role="img" aria-label="Activity over time">
        <polyline
          fill="none"
          stroke="var(--accent-blue-deep)"
          strokeWidth="2.5"
          points={coords.join(" ")}
        />
      </svg>
      <div className="muted" style={{ fontSize: "0.75rem" }}>
        Peak {max}
        {metric.startsWith("seeds") ? " seeds" : metric === "minutes" ? " min" : " events"} · mock
        Mondays spike when metric includes weekly-close lumps
      </div>
    </div>
  );
}

function Heatmaps({ metric }: { metric: IntensityMetric }) {
  const dates = Array.from({ length: 28 }, (_, i) => addDays(TODAY, -(27 - i)));
  return (
    <div className="f08p-panel f08p-stack">
      <span className="f08p-kicker">
        Prep heatmaps · 28 days (stand-in) · intensity = {metric} · no effort marks
      </span>
      <div>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Application lane
        </span>
        <div className="f08p-heat-grid" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
          {dates.map((d) => {
            const day = DAYS[d]!;
            const level = intensityForDay(day, metric);
            return <span key={`a-${d}`} className={`f08p-rhythm-cell${level ? ` is-i${level}` : ""}`} />;
          })}
        </div>
      </div>
      <div>
        <span className="muted" style={{ fontSize: "0.8rem" }}>
          Technical lane
        </span>
        <div className="f08p-heat-grid" style={{ gridTemplateColumns: "repeat(14, 1fr)" }}>
          {dates.map((d) => {
            const day = DAYS[d]!;
            const level = intensityForDay(
              { ...day, seeds: day.reflections.length ? day.seedsWork : 0, seedsWork: day.reflections.length ? day.seedsWork : 0 },
              metric === "events" ? "events" : metric,
            );
            return <span key={`t-${d}`} className={`f08p-rhythm-cell${level ? ` is-i${level}` : ""}`} />;
          })}
        </div>
      </div>
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
  const metric = useParam(
    "metric",
    METRICS.map((m) => m.key),
  );
  const rangeKey = useParam(
    "range",
    RANGES.map((r) => r.key),
  );
  const days = Number(rangeKey);

  return (
    <ProgressShell
      title="Lifetime · accumulation"
      question="Richer header (Q69); activity chart + heatmaps (Q67–Q68); full achievements. Next-ups live on This week."
      variants={VARIANTS}
      surfaceLabel="Lifetime"
      controls={
        <>
          <ParamToggle
            name="metric"
            label="Activity metric"
            options={METRICS.map((m) => ({ key: m.key, label: m.label }))}
          />
          <ParamToggle
            name="range"
            label="Chart range"
            options={RANGES.map((r) => ({ key: r.key, label: r.label }))}
          />
        </>
      }
      notes={
        <p>
          Seeds-as-activity on Progress is change-over-time, not Rewards purse chrome. Toggle
          “seeds (all)” vs “seeds (no weekly)” to see week-close bias on the chart and heatmaps.
        </p>
      }
    >
      <p className="f08p-state">
        variant={variant} · metric={metric} · range={days}d
      </p>
      <div className="f08p-stack">
        <AccumulationHeader />
        {variant === "A" ? (
          <>
            <ActivityChart metric={metric} days={days} />
            <Heatmaps metric={metric} />
          </>
        ) : (
          <>
            <Heatmaps metric={metric} />
            <ActivityChart metric={metric} days={days} />
          </>
        )}
        <AchievementsList />
      </div>
    </ProgressShell>
  );
}
