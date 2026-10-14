/**
 * Mock banner: soft + hard pity, batch vs one-by-one reveal (variant C).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import CatCake from "./CatCake";
import CatCakeCard from "./CatCakeCard";
import { COLLECTOR_STYLES, FLAVORS, FLAVOR_BY_ID, variantName, type CollectorStyle } from "./flavors";
import {
  FRIENDSHIP_MAX,
  GACHA_CONFIG,
  KEPT_COPIES,
  collectorRateAt,
  friendshipLevel,
  pull,
  refundValue,
  seededRng,
  simulate,
  type GachaState,
  type PullResult,
  type SimulationStats,
} from "./gacha";
import { UNDO_TASK_POINTS, WEEKLY_EARN_ESTIMATE, freshPullState } from "./fixtures";
import "../m4/prototype-m4.css";
import "./prototype-rewards.css";

const VARIANTS = [
  { key: "A", name: "All boxes · tap opens all" },
  { key: "B", name: "Card flip · tap opens all" },
  { key: "C", name: "One-by-one · Skip → all boxes" },
];

const STAGGER_MS = 90;

let cachedStats: SimulationStats | null = null;

type BatchPhase = "idle" | "waiting" | "revealed";

function pct(rate: number): string {
  return `${(rate * 100).toFixed(rate < 0.1 ? 1 : 0)}%`;
}

function variantKey(params: URLSearchParams): "A" | "B" | "C" {
  const v = params.get("variant");
  if (v === "B") return "B";
  if (v === "C") return "C";
  return "A";
}

export default function PullPrototypePage() {
  const [params] = useSearchParams();
  const variant = variantKey(params);
  const [state, setState] = useState<GachaState>(freshPullState);
  const [results, setResults] = useState<PullResult[]>([]);
  const [history, setHistory] = useState<PullResult[]>([]);
  const [batchPhase, setBatchPhase] = useState<BatchPhase>("idle");
  const [seqActive, setSeqActive] = useState(false);
  const [seqIndex, setSeqIndex] = useState(0);
  const [seqOpen, setSeqOpen] = useState(false);
  const [ceStyle, setCeStyle] = useState<CollectorStyle>("day");
  const rngRef = useRef(seededRng(20261012));
  const [stats, setStats] = useState<SimulationStats | null>(cachedStats);
  useEffect(() => {
    if (cachedStats) return;
    const timer = window.setTimeout(() => {
      cachedStats = simulate(10_000);
      setStats(cachedStats);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const inReveal = batchPhase !== "idle" || seqActive;
  const cfg = GACHA_CONFIG;
  const canPull1 = !inReveal && state.balance >= 0 && state.balance >= cfg.costPerPull;
  const canPull10 = !inReveal && state.balance >= 0 && state.balance >= cfg.costPerPull * 10;

  function resetReveal() {
    setBatchPhase("idle");
    setSeqActive(false);
    setSeqIndex(0);
    setSeqOpen(false);
  }

  function doPull(count: number) {
    if (inReveal) return;
    const out = pull(state, count, rngRef.current);
    if ("error" in out) return;
    setState(out.state);
    setResults(out.results);
    setHistory((h) => [...out.results.slice().reverse(), ...h].slice(0, 40));

    if (variant === "C") {
      setSeqActive(true);
      setSeqIndex(0);
      setSeqOpen(false);
      setBatchPhase("idle");
    } else {
      setSeqActive(false);
      setBatchPhase("waiting");
    }
  }

  function handleStageClick() {
    if (seqActive) {
      if (!seqOpen) {
        setSeqOpen(true);
        return;
      }
      const next = seqIndex + 1;
      if (next >= results.length) {
        resetReveal();
        return;
      }
      setSeqIndex(next);
      setSeqOpen(false);
      return;
    }
    if (batchPhase === "waiting") setBatchPhase("revealed");
  }

  function handleSkip() {
    if (seqActive) {
      setSeqActive(false);
      setSeqOpen(false);
      setBatchPhase("waiting");
      return;
    }
    if (batchPhase === "waiting") setBatchPhase("revealed");
  }

  const nextPull = state.pity + 1;
  const nextRate = collectorRateAt(nextPull);
  const pullsAffordable = Math.max(0, Math.floor(state.balance / cfg.costPerPull));
  const negative = state.balance < 0;
  const ownedCollectors = FLAVORS.filter((f) => state.owned[`${f.id}:collector`]).length;
  const showSkip = seqActive || batchPhase === "waiting";
  const stageHint = seqActive
    ? seqOpen
      ? "Tap for next"
      : "Tap to open"
    : batchPhase === "waiting"
      ? "Tap to open all"
      : "";

  return (
    <section className="rw-page">
      <p className="prototype-banner">
        Rewards throwaway prototype · banner + reveal. ← / → flips reveal style.{" "}
        <Link to="/prototype/rewards">Rewards hub</Link>
      </p>

      <div className="rw-banner">
        <div>
          <h3>Bakery Banner</h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Every pull bakes a random cat cake. Collector's Editions are rare ({pct(cfg.collectorBaseRate)} base),
            get likelier from pull {cfg.softPityStart}, and guaranteed by pull {cfg.hardPity}.{" "}
            {cfg.costPerPull} pts per pull.
          </p>
          <div className="rw-ce-showcase" aria-label="Collector's Editions on this banner">
            {FLAVORS.map((f) => (
              <span key={f.id} title={variantName(f, "collector")}>
                <CatCake flavor={f.id} edition="collector" collectorStyle={ceStyle} size={52} animated />
              </span>
            ))}
          </div>
          <PityMeter pity={state.pity} />
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            Pity {state.pity} / {cfg.hardPity} · next pull's Collector's Edition chance{" "}
            <strong className="rw-stat">{pct(nextRate)}</strong> · {ownedCollectors} / {FLAVORS.length} Collector's
            Editions owned
          </div>
          <div className="rw-pull-actions">
            <button type="button" onClick={() => doPull(1)} disabled={!canPull1}>
              Pull ×1 · {cfg.costPerPull}
            </button>
            <button type="button" onClick={() => doPull(10)} disabled={!canPull10}>
              Pull ×10 · {(cfg.costPerPull * 10).toLocaleString()}
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setState((s) => ({ ...s, balance: s.balance + WEEKLY_EARN_ESTIMATE }))}
            >
              + one week of points ({WEEKLY_EARN_ESTIMATE.toLocaleString()})
            </button>
            <button
              type="button"
              className="secondary"
              onClick={() => setState((s) => ({ ...s, balance: s.balance - UNDO_TASK_POINTS }))}
            >
              Un-complete a task (−{UNDO_TASK_POINTS})
            </button>
          </div>
          {negative && (
            <p className="rw-error" style={{ marginTop: "0.35rem" }}>
              Balance is negative. Earn {(-state.balance).toLocaleString()} pts before pulling again.
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.5rem" }}>
          <span className={`rw-balance ${negative ? "rw-balance--negative" : ""}`}>
            {state.balance.toLocaleString()} pts
          </span>
          <span className="muted" style={{ fontSize: "0.75rem", textAlign: "right" }}>
            {negative
              ? "Pulls locked until balance is back to 0"
              : `${pullsAffordable} pull${pullsAffordable === 1 ? "" : "s"} available`}
          </span>
          <label className="muted" style={{ fontSize: "0.75rem" }}>
            CE look{" "}
            <select value={ceStyle} onChange={(e) => setCeStyle(e.target.value as CollectorStyle)}>
              {COLLECTOR_STYLES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div
        className={[
          "rw-stage",
          batchPhase === "idle" && !seqActive ? "rw-stage--empty" : "",
          batchPhase === "waiting" || seqActive ? "rw-stage--waiting" : "",
          seqActive ? "rw-stage--sequential" : "",
        ].join(" ")}
        role={showSkip ? "button" : undefined}
        tabIndex={showSkip ? 0 : undefined}
        onClick={showSkip ? handleStageClick : undefined}
        onKeyDown={(e) => {
          if (!showSkip) return;
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            handleStageClick();
          }
        }}
      >
        {batchPhase === "idle" && !seqActive && "Pull to bake something."}

        {seqActive &&
          results[seqIndex] &&
          (seqOpen ? (
            <div className="rw-slot rw-pop">
              <CatCakeCard
                flavor={results[seqIndex]!.flavor}
                edition={results[seqIndex]!.edition}
                collectorStyle={ceStyle}
                size={results[seqIndex]!.edition === "collector" ? 130 : 110}
              />
              <SlotMeta result={results[seqIndex]!} />
            </div>
          ) : (
            <BoxOnly result={results[seqIndex]!} shaking />
          ))}

        {!seqActive &&
          batchPhase !== "idle" &&
          results.map((r, i) =>
            variant === "B" ? (
              <FlipSlot
                key={`${i}-${r.flavor}-${r.edition}`}
                result={r}
                waiting={batchPhase === "waiting"}
                index={i}
                ceStyle={ceStyle}
              />
            ) : (
              <BoxSlot
                key={`${i}-${r.flavor}-${r.edition}`}
                result={r}
                waiting={batchPhase === "waiting"}
                index={i}
                ceStyle={ceStyle}
              />
            ),
          )}

        {showSkip && (
          <>
            {seqActive && (
              <span className="rw-seq-progress">
                {seqIndex + 1} / {results.length}
              </span>
            )}
            {stageHint && <span className="rw-stage-hint">{stageHint}</span>}
            <button
              type="button"
              className="secondary rw-stage-skip"
              onClick={(e) => {
                e.stopPropagation();
                handleSkip();
              }}
            >
              Skip
            </button>
          </>
        )}
      </div>

      {history.length > 0 && (
        <div className="rw-section">
          <h3>Pull history</h3>
          <div className="rw-thumb-strip">
            {history.map((r, i) => (
              <span
                key={i}
                title={`${variantName(FLAVOR_BY_ID[r.flavor], r.edition)}${r.isNew ? " (new)" : ""} · pull ${r.pityAt} since last CE`}
              >
                <CatCake flavor={r.flavor} edition={r.edition} collectorStyle={ceStyle} size={36} />
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="rw-section rw-sim">
        <h3>Rates and simulation</h3>
        <p className="muted">
          {cfg.costPerPull} points per pull ({(WEEKLY_EARN_ESTIMATE / cfg.costPerPull).toFixed(1)} pulls/week at
          ~{WEEKLY_EARN_ESTIMATE.toLocaleString()} points, treat as uncertain). Random CE flavor; no duplicate
          protection. Friendship keeps the first {KEPT_COPIES} copies (1 + {FRIENDSHIP_MAX} dupes); refundable dupes
          return {refundValue("classic")} (classic) / {refundValue("collector")} (Collector's Edition).
        </p>
        <RateLadder />
        {!stats ? (
          <p className="muted">Simulating 10,000 collections…</p>
        ) : (
          <table>
            <tbody>
              <tr>
                <th>Avg pulls per Collector's Edition</th>
                <td>
                  {stats.avgPullsPerCollector.toFixed(1)} (median {stats.p50PullsPerCollector}, 90th pct{" "}
                  {stats.p90PullsPerCollector}) ≈{" "}
                  {((stats.avgPullsPerCollector * cfg.costPerPull) / WEEKLY_EARN_ESTIMATE).toFixed(1)} weeks
                </td>
              </tr>
              <tr>
                <th>Consolidated Collector's Edition rate</th>
                <td>{pct(stats.consolidatedCollectorRate)} (HSR: 6.85%)</td>
              </tr>
              <tr>
                <th>Collector's Editions that needed hard pity</th>
                <td>{pct(stats.hardPityShare)}</td>
              </tr>
              <tr>
                <th>Avg pulls to own all {FLAVORS.length} classics</th>
                <td>{stats.avgPullsAllClassics.toFixed(1)}</td>
              </tr>
              <tr>
                <th>Avg pulls to complete all {FLAVORS.length * 2}</th>
                <td>{stats.avgPullsFullSet.toFixed(0)}</td>
              </tr>
              <tr>
                <th>Avg net points for full set (after refundable dupe refunds)</th>
                <td>
                  {Math.round(stats.avgNetPointsFullSet).toLocaleString()} ≈{" "}
                  {(stats.avgNetPointsFullSet / WEEKLY_EARN_ESTIMATE).toFixed(1)} weeks
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>

      <PrototypeSwitcher variants={VARIANTS} surfaceLabel="Bakery Banner" />
    </section>
  );
}

function PityMeter({ pity }: { pity: number }) {
  const cfg = GACHA_CONFIG;
  return (
    <div className="rw-pity" aria-label={`Pity ${pity} of ${cfg.hardPity}`}>
      {Array.from({ length: cfg.hardPity }, (_, i) => {
        const n = i + 1;
        const zone = n >= cfg.hardPity ? "hard" : n >= cfg.softPityStart ? "soft" : "base";
        return (
          <span
            key={n}
            title={`Pull ${n}: ${pct(collectorRateAt(n))}`}
            className={[
              "rw-pity-pip",
              `rw-pity-pip--${zone}`,
              n <= pity ? "rw-pity-pip--filled" : "",
              n === pity + 1 ? "rw-pity-pip--next" : "",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

function RateLadder() {
  const cfg = GACHA_CONFIG;
  const rows = Array.from({ length: cfg.hardPity - cfg.softPityStart + 2 }, (_, i) =>
    i === 0
      ? { label: `1–${cfg.softPityStart - 1}`, rate: cfg.collectorBaseRate }
      : {
          label: String(cfg.softPityStart + i - 1),
          rate: collectorRateAt(cfg.softPityStart + i - 1),
        },
  );
  return (
    <div className="rw-ladder">
      {rows.map((r) => (
        <div key={r.label} className="rw-ladder-col">
          <div className="rw-ladder-bar" style={{ height: `${Math.max(4, r.rate * 64)}px` }} />
          <span className="rw-ladder-rate">{pct(r.rate)}</span>
          <span className="rw-ladder-label">{r.label}</span>
        </div>
      ))}
    </div>
  );
}

function SlotMeta({ result }: { result: PullResult }) {
  const lvl = friendshipLevel(result.copiesAfter);
  const prevLvl = friendshipLevel(result.copiesAfter - 1);
  let text: string;
  let kind: "new" | "dupe" | "friend" = "dupe";
  if (result.isNew) {
    text = "New!";
    kind = "new";
  } else if (lvl > prevLvl) {
    text = `Friendship · ${lvl}/${FRIENDSHIP_MAX}`;
    kind = "friend";
  } else {
    text = `Refundable dupe · +${refundValue(result.edition)}`;
    kind = "dupe";
  }
  if (result.viaHardPity) text += " · pity";
  return (
    <span className={`rw-slot-meta rw-slot-meta--${kind === "new" ? "new" : kind === "friend" ? "friend" : "dupe"}`}>
      {text}
    </span>
  );
}

function BoxOnly({ result, shaking }: { result: PullResult; shaking: boolean }) {
  const ce = result.edition === "collector";
  return (
    <div className={`rw-box ${shaking ? "rw-box--shaking" : ""} ${ce ? "rw-box--ce" : "rw-box--normal"}`}>
      <div className="rw-box-body" />
      <div className="rw-box-ribbon" />
      <div className="rw-box-lid" />
      <div className="rw-box-bow" />
    </div>
  );
}

function BoxSlot({
  result,
  waiting,
  index,
  ceStyle,
}: {
  result: PullResult;
  waiting: boolean;
  index: number;
  ceStyle: CollectorStyle;
}) {
  const ce = result.edition === "collector";
  if (waiting) {
    return (
      <div style={{ animationDelay: `${index * 70}ms` }}>
        <BoxOnly result={result} shaking />
      </div>
    );
  }
  return (
    <div className="rw-slot rw-pop" style={{ animationDelay: `${index * STAGGER_MS}ms` }}>
      <CatCakeCard flavor={result.flavor} edition={result.edition} collectorStyle={ceStyle} size={ce ? 110 : 88} />
      <SlotMeta result={result} />
    </div>
  );
}

function FlipSlot({
  result,
  waiting,
  index,
  ceStyle,
}: {
  result: PullResult;
  waiting: boolean;
  index: number;
  ceStyle: CollectorStyle;
}) {
  const ce = result.edition === "collector";
  return (
    <div className="rw-slot">
      <div className={`rw-flip ${waiting ? "" : "rw-flip--open"}`}>
        <div className="rw-flip-inner" style={{ transitionDelay: `${index * STAGGER_MS}ms` }}>
          <div className={`rw-flip-face rw-flip-back ${ce ? "rw-flip-back--ce" : ""}`}>★</div>
          <div className="rw-flip-face rw-flip-front">
            <CatCakeCard
              flavor={result.flavor}
              edition={result.edition}
              collectorStyle={ceStyle}
              size={84}
              showName={false}
            />
          </div>
        </div>
      </div>
      {!waiting ? <SlotMeta result={result} /> : <span className="rw-slot-meta">&nbsp;</span>}
    </div>
  );
}
