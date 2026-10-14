import { useEffect, useMemo, useState } from "react";
import {
  getRewardsEarnings,
  type EarningsEvent,
  type EarningsRange,
  type EarningsSnapshot,
} from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";

const RANGE_OPTIONS: { key: EarningsRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This week" },
  { key: "last_7_days", label: "Last 7 days" },
  { key: "this_month", label: "This month" },
  { key: "all", label: "All time" },
];

const CATEGORY_LABELS: Record<string, string> = {
  task: "Tasks",
  leetcode: "LC",
  interview: "Interview",
  application: "Apps",
  reflection: "Reflection",
  weekly_goal: "Weekly goals",
  achievement: "Achievements",
  streak: "Streaks",
  gacha: "Cake",
};

function browserTz(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("en-CA"); // YYYY-MM-DD in local tz
}

function formatDayHeading(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function EventRow({ ev }: { ev: EarningsEvent }) {
  const deltaClass = ev.amount >= 0 ? "ledger-delta pos" : "ledger-delta neg";
  const unit = CURRENCY_DISPLAY.plural;
  const deltaText =
    ev.amount >= 0 ? `+${ev.amount} ${unit}` : `${ev.amount} ${unit}`;
  const msg = ev.message.includes("points")
    ? ev.message.replace(/\s*[+\−\-]?\d+\s*points?/i, "").trim()
    : ev.message;

  return (
    <article className="ledger-log-item">
      <div>
        <div className="ledger-log-msg">
          {msg}{" "}
          <span className={deltaClass}>{deltaText}</span>
        </div>
        <div className="ledger-log-when">
          {formatWhen(ev.createdAt)}
          {ev.kind !== "earn" ? ` · ${ev.kind}` : ""}
        </div>
        {ev.breakdown && ev.breakdown.length > 1 && (
          <div className="ledger-log-breakdown">
            {ev.breakdown.map((b) => (
              <span key={`${b.label}-${b.amount}`} className="ledger-log-chip">
                {b.label} +{b.amount}
              </span>
            ))}
          </div>
        )}
      </div>
      <span className="ledger-balance-badge">total: {ev.lifetimeAfter}</span>
    </article>
  );
}

export default function EarningsPage() {
  const tz = useMemo(() => browserTz(), []);
  const [range, setRange] = useState<EarningsRange>("all");
  const [data, setData] = useState<EarningsSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getRewardsEarnings({ range, tz, limit: 200 });
        if (!cancelled) setData(snap);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load earnings");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [range, tz]);

  const rows = useMemo(() => {
    if (!data) return [];
    return [
      ...data.categories
        .filter((c) => c.category !== "task")
        .map((c) => ({
          key: c.category,
          label: CATEGORY_LABELS[c.category] ?? c.category,
          points: c.points,
        })),
      ...data.taskCategories.map((c) => ({
        key: `task:${c.taskCategoryId ?? "deleted"}`,
        label: c.name,
        points: c.points,
      })),
    ].sort((a, b) => b.points - a.points);
  }, [data]);

  const max = Math.max(...rows.map((r) => r.points), 1);

  const byDay = useMemo(() => {
    if (!data) return [] as Array<{ day: string; events: EarningsEvent[] }>;
    const map = new Map<string, EarningsEvent[]>();
    for (const ev of data.events) {
      const key = dayKey(ev.createdAt);
      const list = map.get(key);
      if (list) list.push(ev);
      else map.set(key, [ev]);
    }
    return [...map.entries()].map(([day, events]) => ({ day, events }));
  }, [data]);

  return (
    <div className="ledger-points rewards-earnings">
      <div className="ui-segmented rewards-range" role="radiogroup" aria-label="Earnings range">
        {RANGE_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            type="button"
            className={`secondary ui-btn ui-btn-ghost${
              range === opt.key ? " is-active" : ""
            }`}
            aria-pressed={range === opt.key}
            onClick={() => setRange(opt.key)}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {error && <p className="error">{error}</p>}
      {loading && !data && <p className="muted">Loading earnings…</p>}

      {data && (
        <>
          <div className="ledger-balance-hero">
            <div>
              <span className="ledger-balance-value">{data.lifetimeEarned}</span>
              <span className="ledger-balance-label">
                {CURRENCY_DISPLAY.plural} lifetime
              </span>
            </div>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              {range === "all"
                ? `all earn-side ${CURRENCY_DISPLAY.plural}`
                : `${data.rangeEarned.toLocaleString()} in this range`}
            </span>
          </div>

          {rows.length > 0 ? (
            <div className="ledger-cats">
              {rows.map((row) => (
                <div key={row.key} className="ledger-cat-row">
                  <span>{row.label}</span>
                  <div className="ledger-cat-bar">
                    <span
                      style={{
                        width: `${(Math.max(row.points, 0) / max) * 100}%`,
                      }}
                    />
                  </div>
                  <span className="amt">{row.points}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="muted">No earnings in this range.</p>
          )}

          <h4 className="ledger-section-heading">Event log</h4>
          {byDay.length === 0 ? (
            <p className="muted">No earn events yet.</p>
          ) : (
            <div className="ledger-log">
              {byDay.map(({ day, events }) => (
                <div key={day} className="rewards-earn-day">
                  <h5 className="rewards-earn-day-heading">{formatDayHeading(day)}</h5>
                  {events.map((ev) => (
                    <EventRow key={ev.id} ev={ev} />
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
