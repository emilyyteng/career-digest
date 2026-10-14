import { useEffect, useMemo, useState } from "react";
import {
  getRewardsHistory,
  type EarningsRange,
  type PullHistoryResult,
  type PullHistorySession,
  type PullHistorySnapshot,
} from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";
import { FRIENDSHIP_MAX, friendshipLevel, refundableCount } from "./catCakeMath";
import { FLAVOR_BY_ID, variantName, type FlavorId } from "./flavors";

const RANGE_OPTIONS: { key: EarningsRange; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "this_week", label: "This week" },
  { key: "last_7_days", label: "Last 7 days" },
  { key: "this_month", label: "This month" },
  { key: "all", label: "All time" },
];

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
  return d.toLocaleDateString("en-CA");
}

function formatDayHeading(ymd: string): string {
  const [y, m, d] = ymd.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function ordinal(n: number): string {
  const abs = Math.abs(n);
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`;
  switch (abs % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

function resultLabel(r: PullHistoryResult): string {
  const flavor = FLAVOR_BY_ID[r.flavorId as FlavorId];
  const name = flavor
    ? variantName(flavor, r.edition)
    : `${r.flavorId} (${r.edition})`;
  const bits: string[] = [];
  if (r.isNew) bits.push("New");
  else {
    const friend = friendshipLevel(r.copiesAfter);
    if (friend > 0 && friend <= FRIENDSHIP_MAX) {
      bits.push(`Friendship ${friend}/${FRIENDSHIP_MAX}`);
    }
    const ref = refundableCount(r.copiesAfter);
    if (ref > 0) bits.push(`${ref} refundable`);
  }
  if (r.viaHardPity) bits.push("hard pity");
  bits.push(`${ordinal(r.timesPulled)} pull of this variant`);
  bits.push(`pity ${r.pityAt}`);
  return `${name} · ${bits.join(" · ")}`;
}

function SessionCard({ session }: { session: PullHistorySession }) {
  const unit = CURRENCY_DISPLAY.plural;
  return (
    <article className="ledger-log-item rewards-pull-session">
      <div>
        <div className="ledger-log-msg">
          Pull ×{session.count}{" "}
          <span className="ledger-delta neg">
            −{session.cost} {unit}
          </span>
        </div>
        <div className="ledger-log-when">{formatWhen(session.createdAt)}</div>
        <ul className="rewards-pull-results">
          {session.results.map((r, i) => (
            <li key={`${session.id}-${i}`}>
              <span className={r.edition === "collector" ? "rewards-pull-ce" : undefined}>
                {resultLabel(r)}
              </span>
              <span className="muted">
                {" "}
                (−{r.seedsSpent} {unit})
              </span>
            </li>
          ))}
        </ul>
      </div>
      <span className="ledger-balance-badge">
        spent: {session.lifetimeSpendAfter}
      </span>
    </article>
  );
}

export default function PullHistoryPage() {
  const tz = useMemo(() => browserTz(), []);
  const [range, setRange] = useState<EarningsRange>("all");
  const [data, setData] = useState<PullHistorySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getRewardsHistory({ range, tz, limit: 200 });
        if (!cancelled) setData(snap);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load history");
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

  const byDay = useMemo(() => {
    if (!data) return [] as Array<{ day: string; sessions: PullHistorySession[] }>;
    const map = new Map<string, PullHistorySession[]>();
    for (const s of data.sessions) {
      const key = dayKey(s.createdAt);
      const list = map.get(key);
      if (list) list.push(s);
      else map.set(key, [s]);
    }
    return [...map.entries()].map(([day, sessions]) => ({ day, sessions }));
  }, [data]);

  return (
    <div className="ledger-points rewards-history">
      <div className="ui-segmented rewards-range" role="radiogroup" aria-label="Pull history range">
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
      {loading && !data && <p className="muted">Loading pull history…</p>}

      {data && (
        <>
          <div className="ledger-balance-hero">
            <div>
              <span className="ledger-balance-value">{data.lifetimeSpend}</span>
              <span className="ledger-balance-label">
                {CURRENCY_DISPLAY.plural} spent lifetime
              </span>
            </div>
            <span className="muted" style={{ fontSize: "0.82rem" }}>
              {range === "all"
                ? `all banner pulls`
                : `${data.rangeSpend.toLocaleString()} in this range`}
            </span>
          </div>

          <h4 className="ledger-section-heading">Pull log</h4>
          {byDay.length === 0 ? (
            <p className="muted">No pulls yet. Visit Banner to bake something.</p>
          ) : (
            <div className="ledger-log">
              {byDay.map(({ day, sessions }) => (
                <div key={day} className="rewards-earn-day">
                  <h5 className="rewards-earn-day-heading">{formatDayHeading(day)}</h5>
                  {sessions.map((s) => (
                    <SessionCard key={s.id} session={s} />
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
