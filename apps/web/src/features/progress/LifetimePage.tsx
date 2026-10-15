/**
 * Progress Lifetime — R8.12–R8.14 / M8-05.
 */
import { useEffect, useMemo, useState } from "react";
import {
  getProgressHeatmap,
  getProgressLifetime,
  type LifetimeSnapshot,
  type ProgressHeatmapDay,
} from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";
import AchievementsPanel from "../achievements/AchievementsPanel";
import ProgressHeatmap from "./ProgressHeatmap";

const RANGES = [
  { key: 7, label: "1 week" },
  { key: 30, label: "1 month" },
  { key: 90, label: "3 months" },
] as const;

const HEATMAP_DAYS = 182;

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

/** Round a max up to a clean axis top. */
function niceCeiling(n: number): number {
  if (n <= 0) return 1;
  if (n <= 1) return 1;
  const exp = Math.floor(Math.log10(n));
  const pow = 10 ** exp;
  const m = n / pow;
  const nice = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return nice * pow;
}

function yTickValues(max: number): number[] {
  const top = niceCeiling(max);
  const steps = top <= 4 ? top : 4;
  const step = top / steps;
  const out: number[] = [];
  for (let i = 0; i <= steps; i++) out.push(Math.round(i * step));
  return out;
}

/** Evenly spaced indices including first and last. */
function tickIndices(length: number, count: number): number[] {
  if (length <= 0) return [];
  if (length === 1) return [0];
  const n = Math.min(count, length);
  if (n === 1) return [0];
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.round((i * (length - 1)) / (n - 1)));
  }
  return [...new Set(out)];
}

function formatAxisDate(iso: string, rangeDays: number): string {
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  if (rangeDays <= 7) {
    return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
  }
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function SeedsActivityChart({
  activity,
  rangeDays,
  onRangeDays,
}: {
  activity: Array<{ date: string; seeds: number }>;
  rangeDays: number;
  onRangeDays: (days: number) => void;
}) {
  const dataMax = Math.max(0, ...activity.map((p) => p.seeds));
  const yMax = niceCeiling(Math.max(1, dataMax));
  const yTicks = yTickValues(yMax);

  const w = 640;
  const h = 200;
  const padL = 36;
  const padR = 40;
  const padT = 12;
  const padB = 32;
  const plotW = w - padL - padR;
  const plotH = h - padT - padB;

  const xAt = (i: number) =>
    padL + (activity.length <= 1 ? plotW / 2 : (i / (activity.length - 1)) * plotW);
  const yAt = (seeds: number) => padT + plotH - (seeds / yMax) * plotH;

  const coords = activity.map((p, i) => `${xAt(i)},${yAt(p.seeds)}`);
  const xTickCount = rangeDays <= 7 ? Math.min(activity.length, 7) : rangeDays <= 30 ? 5 : 6;
  const xTicks = tickIndices(activity.length, xTickCount);

  return (
    <section className="card progress-lifetime-chart">
      <div className="progress-lifetime-chart-head">
        <span className="progress-kicker" style={{ marginBottom: 0 }}>
          Activity · {CURRENCY_DISPLAY.plural} earned / day
        </span>
        <div className="ui-segmented" role="group" aria-label="Chart range">
          {RANGES.map((r) => (
            <button
              key={r.key}
              type="button"
              className={`secondary ui-btn ui-btn-ghost${rangeDays === r.key ? " is-active" : ""}`}
              aria-pressed={rangeDays === r.key}
              onClick={() => onRangeDays(r.key)}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="progress-lifetime-svg"
        role="img"
        aria-label={`${CURRENCY_DISPLAY.plural} earned over time`}
      >
        {/* Axes */}
        <line
          x1={padL}
          y1={padT}
          x2={padL}
          y2={padT + plotH}
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        <line
          x1={padL}
          y1={padT + plotH}
          x2={padL + plotW}
          y2={padT + plotH}
          stroke="var(--border-strong)"
          strokeWidth="1"
        />
        {yTicks.map((v) => {
          const y = yAt(v);
          return (
            <g key={`y-${v}`}>
              {v > 0 && (
                <line
                  x1={padL}
                  y1={y}
                  x2={padL + plotW}
                  y2={y}
                  stroke="var(--border)"
                  strokeWidth="1"
                  strokeDasharray="3 3"
                />
              )}
              <text
                x={padL - 6}
                y={y}
                textAnchor="end"
                dominantBaseline="middle"
                className="progress-lifetime-axis-label"
              >
                {v}
              </text>
            </g>
          );
        })}
        {xTicks.map((i, tickIdx) => {
          const p = activity[i];
          if (!p) return null;
          const x = xAt(i);
          const anchor =
            tickIdx === 0 ? "start" : tickIdx === xTicks.length - 1 ? "end" : "middle";
          return (
            <g key={`x-${p.date}`}>
              <line
                x1={x}
                y1={padT + plotH}
                x2={x}
                y2={padT + plotH + 4}
                stroke="var(--border-strong)"
                strokeWidth="1"
              />
              <text
                x={x}
                y={padT + plotH + 16}
                textAnchor={anchor}
                className="progress-lifetime-axis-label"
              >
                {formatAxisDate(p.date, rangeDays)}
              </text>
            </g>
          );
        })}
        {coords.length > 0 && (
          <polyline
            fill="none"
            stroke="var(--accent-blue-deep)"
            strokeWidth="2.5"
            points={coords.join(" ")}
          />
        )}
      </svg>
      <p className="muted progress-lifetime-chart-foot">
        Last {rangeDays} days · peak {dataMax} {CURRENCY_DISPLAY.plural}
      </p>
    </section>
  );
}

export default function LifetimePage() {
  const tz = useMemo(() => browserTz(), []);
  const [rangeDays, setRangeDays] = useState<number>(30);
  const [snap, setSnap] = useState<LifetimeSnapshot | null>(null);
  const [appHeat, setAppHeat] = useState<ProgressHeatmapDay[]>([]);
  const [techHeat, setTechHeat] = useState<ProgressHeatmapDay[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [life, appRow, techRow] = await Promise.all([
          getProgressLifetime(tz, rangeDays),
          getProgressHeatmap(tz, "application", HEATMAP_DAYS + 14),
          getProgressHeatmap(tz, "technical", HEATMAP_DAYS + 14),
        ]);
        if (cancelled) return;
        setSnap(life);
        setAppHeat(appRow.days.slice(-HEATMAP_DAYS));
        setTechHeat(techRow.days.slice(-HEATMAP_DAYS));
        setError(null);
        setLoaded(true);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tz, rangeDays]);

  if (error && !loaded) return <p className="error">{error}</p>;
  if (!loaded || !snap) return <p className="muted">Loading…</p>;

  const t = snap.totals;
  const today = snap.localDate;

  const primaryStats = [
    { value: t.leetcode, label: "LC solves" },
    { value: t.apps, label: "applications" },
    { value: t.minutes, label: "minutes worked" },
    { value: t.seedsEarned, label: CURRENCY_DISPLAY.plural + " earned" },
  ] as const;
  const secondaryStats = [
    { value: t.tasks, label: "Tasks" },
    { value: t.interviews, label: "Interviews" },
    { value: t.reflections, label: "Reflections" },
    { value: t.daysWorked, label: "Days worked" },
  ] as const;

  return (
    <div className="progress-lifetime">
      {error && <p className="error">{error}</p>}

      <section className="card progress-lifetime-header">
        <span className="progress-kicker">Lifetime record</span>
        <div className="progress-lifetime-stats">
          {primaryStats.map((s) => (
            <div key={s.label} className="progress-lifetime-stat is-primary">
              <strong>{s.value.toLocaleString()}</strong>
              <span className="muted">{s.label}</span>
            </div>
          ))}
          {secondaryStats.map((s) => (
            <div key={s.label} className="progress-lifetime-stat is-secondary">
              <strong>{s.value.toLocaleString()}</strong>
              <span className="muted">{s.label}</span>
            </div>
          ))}
        </div>
      </section>

      <SeedsActivityChart
        activity={snap.activity}
        rangeDays={rangeDays}
        onRangeDays={setRangeDays}
      />

      <div className="progress-lifetime-heats">
        <ProgressHeatmap
          title="Application prep"
          days={appHeat}
          today={today}
          unitLabel="apps"
        />
        <ProgressHeatmap
          title="Technical prep"
          days={techHeat}
          today={today}
          unitLabel="LC"
        />
      </div>

      <AchievementsPanel />
    </div>
  );
}
