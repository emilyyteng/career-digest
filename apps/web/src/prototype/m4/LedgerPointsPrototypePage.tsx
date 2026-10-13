/**
 * Progress → Ledger → Points variants.
 */
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import { balance, categoryTotals, pointsEvents } from "./fixtures";
import "./prototype-m4.css";

const VARIANTS = [
  { key: "A", name: "Preferred · balance + bars + log" },
  { key: "B", name: "Balance + pie + log" },
  { key: "C", name: "Log-first · breakdown collapsed" },
] as const;

const PIE_COLORS = [
  "var(--accent-mint-deep)",
  "var(--accent-blue-deep)",
  "var(--accent-purple)",
  "var(--accent-pink-deep)",
  "var(--accent-yellow-deep)",
  "var(--accent-blue)",
];

function CategoryBars() {
  const max = Math.max(...categoryTotals.map((c) => c.points), 1);
  return (
    <div className="proto-m4-cats">
      {categoryTotals.map((cat) => (
        <div key={cat.key} className="proto-m4-cat-row">
          <span>{cat.label}</span>
          <div className="proto-m4-cat-bar">
            <span style={{ width: `${(cat.points / max) * 100}%` }} />
          </div>
          <span className="amt">{cat.points}</span>
        </div>
      ))}
    </div>
  );
}

function CategoryPie() {
  let cursor = 0;
  const stops = categoryTotals.map((cat, i) => {
    const pct = (cat.points / balance) * 100;
    const start = cursor;
    cursor += pct;
    return `${PIE_COLORS[i % PIE_COLORS.length]} ${start}% ${cursor}%`;
  });
  return (
    <div className="proto-m4-pie-wrap">
      <div
        className="proto-m4-pie"
        style={{ background: `conic-gradient(${stops.join(", ")})` }}
        aria-hidden="true"
      />
      <div className="proto-m4-pie-legend">
        {categoryTotals.map((cat, i) => (
          <span key={cat.key} style={{ ["--swatch" as string]: PIE_COLORS[i % PIE_COLORS.length] }}>
            {cat.label} · {cat.points}
          </span>
        ))}
      </div>
    </div>
  );
}

function EventLog({ showBreakdown }: { showBreakdown: boolean }) {
  return (
    <div className="proto-m4-log">
      {pointsEvents.map((ev) => (
        <article key={ev.id} className="proto-m4-log-item">
          <div>
            <div className="proto-m4-log-msg">
              {ev.message.replace(/\s*[+\−\-]\d+\s*points?/i, "").trim()}{" "}
              <span className={ev.delta >= 0 ? "proto-m4-delta pos" : "proto-m4-delta neg"}>
                {ev.delta >= 0 ? `+${ev.delta}` : ev.delta} points
              </span>
            </div>
            <div className="proto-m4-log-when">
              {ev.when}
              {ev.kind && ev.kind !== "earn" ? ` · ${ev.kind}` : ""}
            </div>
            {showBreakdown && ev.breakdown && (
              <div className="proto-m4-log-breakdown">
                {ev.breakdown.map((b) => (
                  <span key={b.label} className="proto-m4-log-chip">
                    {b.label} +{b.amount}
                  </span>
                ))}
              </div>
            )}
          </div>
          <span className="proto-m4-balance-badge">balance: {ev.balanceAfter}</span>
        </article>
      ))}
    </div>
  );
}

export default function LedgerPointsPrototypePage() {
  const [params] = useSearchParams();
  const variant = (params.get("variant") ?? "A").toUpperCase();

  return (
    <section className="proto-m4-page">
      <p className="prototype-banner">
        Points ledger: earn/reverse/adjust copy stays succinct;{" "}
        <strong>balance</strong> lives in a badge, not the sentence. Temporary home under
        Progress → Ledger until Rewards (M7).{" "}
        <Link to="/prototype/m4">← M4 hub</Link>
      </p>

      <div className="proto-m4-host">
        <span className="proto-m4-host-label">Progress</span>
        <div className="proto-m4-tabs" role="tablist" aria-label="Progress tabs">
          <button type="button" className="tab">
            today
          </button>
          <button type="button" className="tab">
            history
          </button>
          <button type="button" className="tab on">
            ledger
          </button>
        </div>
        <div className="proto-m4-subtabs" role="tablist" aria-label="Ledger">
          <Link
            className="proto-m4-subtab"
            to={`/prototype/m4/ledger-completions?variant=${variant}`}
            style={{ textDecoration: "none" }}
          >
            Completions
          </Link>
          <button type="button" className="proto-m4-subtab on">
            Points
          </button>
        </div>

        {variant === "C" ? (
          <div className="proto-m4-balance-strip">
            <span>
              Balance <strong>{balance}</strong>
            </span>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              breakdown ↓ in log chips
            </span>
          </div>
        ) : (
          <div className="proto-m4-balance-hero">
            <div>
              <span className="value">{balance}</span>
              <span className="label">balance</span>
            </div>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              since ledger start · redeem later (M7)
            </span>
          </div>
        )}

        {variant === "A" && <CategoryBars />}
        {variant === "B" && <CategoryPie />}
        {variant === "C" && (
          <details style={{ marginBottom: "0.75rem" }}>
            <summary className="muted" style={{ cursor: "pointer", fontSize: "0.85rem" }}>
              Category breakdown
            </summary>
            <div style={{ marginTop: "0.5rem" }}>
              <CategoryBars />
            </div>
          </details>
        )}

        <h4 style={{ margin: "0 0 0.45rem", fontSize: "0.92rem" }}>Event log</h4>
        <EventLog showBreakdown={variant !== "C"} />
      </div>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Points" />
    </section>
  );
}
