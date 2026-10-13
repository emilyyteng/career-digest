import { useEffect, useState } from "react";
import {
  getPointsEvents,
  getPointsSummary,
  type PointsEvent,
  type PointsSummary,
} from "../../api";

const CATEGORY_LABELS: Record<string, string> = {
  task: "Tasks",
  leetcode: "LC",
  interview: "Interview",
  application: "Apps",
  reflection: "Reflection",
  weekly_goal: "Weekly goals",
  achievement: "Achievements",
};

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

function EventRow({ ev }: { ev: PointsEvent }) {
  const deltaClass = ev.amount >= 0 ? "ledger-delta pos" : "ledger-delta neg";
  const deltaText =
    ev.amount >= 0 ? `+${ev.amount} points` : `${ev.amount} points`;
  // Prefer server message; ensure delta is visible once.
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
      <span className="ledger-balance-badge">balance: {ev.balanceAfter}</span>
    </article>
  );
}

export default function LedgerPointsPanel() {
  const [summary, setSummary] = useState<PointsSummary | null>(null);
  const [events, setEvents] = useState<PointsEvent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [s, e] = await Promise.all([
          getPointsSummary(),
          getPointsEvents({ limit: 60 }),
        ]);
        if (cancelled) return;
        setSummary(s);
        setEvents(e.events);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load points");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (error && !summary) return <p className="error">{error}</p>;
  if (loading && !summary) return <p className="muted">Loading points…</p>;
  if (!summary) return null;

  const rows = [
    ...summary.categories
      .filter((c) => c.category !== "task")
      .map((c) => ({
        key: c.category,
        label: CATEGORY_LABELS[c.category] ?? c.category,
        points: c.points,
      })),
    ...summary.taskCategories.map((c) => ({
      key: `task:${c.taskCategoryId ?? "deleted"}`,
      label: c.name,
      points: c.points,
    })),
  ].sort((a, b) => b.points - a.points);
  const max = Math.max(...rows.map((r) => r.points), 1);

  return (
    <div className="ledger-points">
      {error && <p className="error">{error}</p>}
      <div className="ledger-balance-hero">
        <div>
          <span className="ledger-balance-value">{summary.balance}</span>
          <span className="ledger-balance-label">points</span>
        </div>
        <span className="muted" style={{ fontSize: "0.82rem" }}>
          since ledger start · redeem later (Rewards)
        </span>
      </div>

      {rows.length > 0 && (
        <div className="ledger-cats">
          {rows.map((row) => (
            <div key={row.key} className="ledger-cat-row">
              <span>{row.label}</span>
              <div className="ledger-cat-bar">
                <span style={{ width: `${(Math.max(row.points, 0) / max) * 100}%` }} />
              </div>
              <span className="amt">{row.points}</span>
            </div>
          ))}
        </div>
      )}

      <h4 className="ledger-section-heading">Event log</h4>
      {events.length === 0 ? (
        <p className="muted">No points events yet.</p>
      ) : (
        <div className="ledger-log">
          {events.map((ev) => (
            <EventRow key={ev.id} ev={ev} />
          ))}
        </div>
      )}
    </div>
  );
}
