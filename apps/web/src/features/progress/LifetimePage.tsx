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
  { key: 90, label: "~3 months" },
] as const;

const HEATMAP_DAYS = 182;

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
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
  const max = Math.max(1, ...activity.map((p) => p.seeds));
  const w = 560;
  const h = 120;
  const pad = 8;
  const coords = activity.map((p, i) => {
    const x = pad + (i / Math.max(1, activity.length - 1)) * (w - pad * 2);
    const y = h - pad - (p.seeds / max) * (h - pad * 2);
    return `${x},${y}`;
  });

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
        <polyline
          fill="none"
          stroke="var(--accent-blue-deep)"
          strokeWidth="2.5"
          points={coords.join(" ")}
        />
      </svg>
      <p className="muted progress-lifetime-chart-foot">
        Last {rangeDays} days · peak {max} {CURRENCY_DISPLAY.plural}
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

  return (
    <div className="progress-lifetime">
      {error && <p className="error">{error}</p>}

      <section className="card progress-lifetime-header">
        <span className="progress-kicker">Lifetime record</span>
        <div className="progress-lifetime-primaries">
          <div>
            <strong>{t.leetcode.toLocaleString()}</strong>
            <div className="muted">LC solves</div>
          </div>
          <div>
            <strong>{t.apps.toLocaleString()}</strong>
            <div className="muted">applications</div>
          </div>
          <div>
            <strong>{t.minutes.toLocaleString()}</strong>
            <div className="muted">minutes worked</div>
          </div>
          <div>
            <strong>{t.seedsEarned.toLocaleString()}</strong>
            <div className="muted">{CURRENCY_DISPLAY.plural} earned</div>
          </div>
        </div>
        <div className="progress-lifetime-secondaries">
          {(
            [
              ["Tasks", t.tasks],
              ["Interviews", t.interviews],
              ["Reflections", t.reflections],
              ["Days worked", t.daysWorked],
            ] as const
          ).map(([label, n]) => (
            <div key={label} className="progress-lifetime-stat">
              <strong>{n.toLocaleString()}</strong>
              <span className="muted">{label}</span>
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
