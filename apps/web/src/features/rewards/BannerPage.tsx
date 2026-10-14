import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  getRewardsCollection,
  postRewardsPull,
  type GachaPullResult,
} from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";
import CatCake from "./CatCake";
import CatCakeCard from "./CatCakeCard";
import {
  FRIENDSHIP_MAX,
  GACHA_DISPLAY,
  collectorRateAt,
  friendshipLevel,
  refundableCount,
  refundValue,
} from "./catCakeMath";
import { FLAVORS, type FlavorId } from "./flavors";
import type { RewardsOutletContext } from "./RewardsLayout";

const STAGGER_MS = 90;

function pct(rate: number): string {
  return `${(rate * 100).toFixed(rate < 0.1 ? 1 : 0)}%`;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

type BatchPhase = "idle" | "waiting" | "revealed";

export default function BannerPage() {
  const { balance, refreshSeeds } = useOutletContext<RewardsOutletContext>();
  const [pity, setPity] = useState(0);
  const [ownedCollectors, setOwnedCollectors] = useState(0);
  const [results, setResults] = useState<GachaPullResult[]>([]);
  const [batchPhase, setBatchPhase] = useState<BatchPhase>("idle");
  const [seqActive, setSeqActive] = useState(false);
  const [seqIndex, setSeqIndex] = useState(0);
  const [seqOpen, setSeqOpen] = useState(false);
  const [pulling, setPulling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void getRewardsCollection()
      .then((col) => {
        if (cancelled) return;
        setPity(col.pity);
        setOwnedCollectors(
          col.variants.filter((v) => v.edition === "collector" && v.copies > 0)
            .length,
        );
      })
      .catch(() => {
        /* pity defaults to 0 until a pull refreshes it */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const cfg = GACHA_DISPLAY;
  const inReveal = batchPhase !== "idle" || seqActive;
  const bal = balance ?? 0;
  const canPull1 =
    !inReveal && !pulling && balance != null && bal >= cfg.costPerPull;
  const canPull10 =
    !inReveal && !pulling && balance != null && bal >= cfg.costPerPull * 10;
  const nextPull = pity + 1;
  const nextRate = collectorRateAt(nextPull);
  const stageInteractive = seqActive || batchPhase === "waiting" || batchPhase === "revealed";
  const showSkip = seqActive || batchPhase === "waiting";
  const stageHint = seqActive
    ? seqOpen
      ? "Tap for next"
      : "Tap to open"
    : batchPhase === "waiting"
      ? "Tap to open all"
      : batchPhase === "revealed"
        ? "Tap to dismiss"
        : "";

  function resetReveal() {
    setBatchPhase("idle");
    setSeqActive(false);
    setSeqIndex(0);
    setSeqOpen(false);
  }

  async function doPull(count: 1 | 10) {
    if (inReveal || pulling) return;
    setPulling(true);
    setError(null);
    try {
      const out = await postRewardsPull(count);
      setResults(out.results);
      setPity(out.pity);
      setOwnedCollectors((n) => {
        const newly = out.results.filter(
          (r) => r.edition === "collector" && r.isNew,
        ).length;
        return Math.min(FLAVORS.length, n + newly);
      });
      await refreshSeeds();

      if (prefersReducedMotion()) {
        // Skip sequential; land on closed boxes (or revealed for a single pull).
        setSeqActive(false);
        setBatchPhase(out.results.length > 1 ? "waiting" : "revealed");
      } else {
        setSeqActive(true);
        setSeqIndex(0);
        setSeqOpen(false);
        setBatchPhase("idle");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pull failed");
    } finally {
      setPulling(false);
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
        // Finished one-by-one: show all results together; wait for dismiss.
        setSeqActive(false);
        setSeqOpen(false);
        setBatchPhase("revealed");
        return;
      }
      setSeqIndex(next);
      setSeqOpen(false);
      return;
    }
    if (batchPhase === "waiting") {
      setBatchPhase("revealed");
      return;
    }
    if (batchPhase === "revealed") {
      resetReveal();
    }
  }

  function handleSkip() {
    if (seqActive) {
      // Jump to all gift boxes still closed.
      setSeqActive(false);
      setSeqOpen(false);
      setBatchPhase("waiting");
      return;
    }
    if (batchPhase === "waiting") {
      setBatchPhase("revealed");
    }
  }

  return (
    <div className="rw-page">
      <div className="rw-banner">
        <div>
          <h3>Bakery Banner</h3>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Every pull bakes a random cat cake. Collector&apos;s Editions are rare (
            {pct(cfg.collectorBaseRate)} base), get likelier from pull {cfg.softPityStart},
            and guaranteed by pull {cfg.hardPity}. {cfg.costPerPull}{" "}
            {CURRENCY_DISPLAY.plural} per pull.
          </p>
          <div className="rw-ce-showcase" aria-label="Collector's Editions on this banner">
            {FLAVORS.map((f) => (
              <span key={f.id} title={f.collectorName}>
                <CatCake
                  flavor={f.id}
                  edition="collector"
                  collectorStyle="day"
                  size={52}
                  animated
                />
              </span>
            ))}
          </div>
          <PityMeter pity={pity} />
          <div className="muted" style={{ fontSize: "0.8rem" }}>
            Pity {pity} / {cfg.hardPity} · next pull&apos;s Collector&apos;s Edition chance{" "}
            <strong className="rw-stat">{pct(nextRate)}</strong> · {ownedCollectors} /{" "}
            {FLAVORS.length} Collector&apos;s Editions owned
          </div>
          <div className="rw-pull-actions">
            <button
              type="button"
              className="secondary ui-btn ui-btn-primary"
              onClick={() => void doPull(1)}
              disabled={!canPull1}
            >
              Pull ×1 · {cfg.costPerPull}
            </button>
            <button
              type="button"
              className="secondary ui-btn ui-btn-primary"
              onClick={() => void doPull(10)}
              disabled={!canPull10}
            >
              Pull ×10 · {(cfg.costPerPull * 10).toLocaleString()}
            </button>
          </div>
          {balance != null && balance < cfg.costPerPull && (
            <p className="rw-error" style={{ marginTop: "0.35rem" }}>
              Need {cfg.costPerPull - Math.max(balance, 0)} more{" "}
              {CURRENCY_DISPLAY.plural} to pull
              {balance < 0 ? " (balance is negative)" : ""}.
            </p>
          )}
          {error && (
            <p className="error" style={{ marginTop: "0.35rem" }}>
              {error}
            </p>
          )}
        </div>
      </div>

      <div
        className={[
          "rw-stage",
          batchPhase === "idle" && !seqActive ? "rw-stage--empty" : "",
          batchPhase === "waiting" || seqActive ? "rw-stage--waiting" : "",
          batchPhase === "revealed" ? "rw-stage--waiting" : "",
          seqActive ? "rw-stage--sequential" : "",
        ].join(" ")}
        role={stageInteractive ? "button" : undefined}
        tabIndex={stageInteractive ? 0 : undefined}
        onClick={stageInteractive ? handleStageClick : undefined}
        onKeyDown={(e) => {
          if (!stageInteractive) return;
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
                flavor={results[seqIndex]!.flavorId as FlavorId}
                edition={results[seqIndex]!.edition}
                collectorStyle="day"
                size={results[seqIndex]!.edition === "collector" ? 130 : 110}
              />
              <SlotMeta result={results[seqIndex]!} />
            </div>
          ) : (
            <BoxOnly shaking />
          ))}

        {!seqActive &&
          batchPhase !== "idle" &&
          results.map((r, i) => (
            <BoxSlot
              key={`${i}-${r.flavorId}-${r.edition}`}
              result={r}
              waiting={batchPhase === "waiting"}
              index={i}
            />
          ))}

        {stageInteractive && (
          <>
            {seqActive && (
              <span className="rw-seq-progress">
                {seqIndex + 1} / {results.length}
              </span>
            )}
            {stageHint && <span className="rw-stage-hint">{stageHint}</span>}
            {showSkip && (
              <button
                type="button"
                className="secondary ui-btn ui-btn-ghost rw-stage-skip"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSkip();
                }}
              >
                Skip
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function PityMeter({ pity }: { pity: number }) {
  const cfg = GACHA_DISPLAY;
  return (
    <div className="rw-pity" aria-label={`Pity ${pity} of ${cfg.hardPity}`}>
      {Array.from({ length: cfg.hardPity }, (_, i) => {
        const n = i + 1;
        const zone =
          n >= cfg.hardPity ? "hard" : n >= cfg.softPityStart ? "soft" : "base";
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

function SlotMeta({ result }: { result: GachaPullResult }) {
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
  } else if (refundableCount(result.copiesAfter) > 0) {
    text = `Refundable dupe · +${refundValue(result.edition)}`;
    kind = "dupe";
  } else {
    text = "Dupe";
    kind = "dupe";
  }
  if (result.viaHardPity) text += " · pity";
  return (
    <span
      className={`rw-slot-meta rw-slot-meta--${
        kind === "new" ? "new" : kind === "friend" ? "friend" : "dupe"
      }`}
    >
      {text}
    </span>
  );
}

function BoxOnly({ shaking }: { shaking: boolean }) {
  return (
    <div className={`rw-box ${shaking ? "rw-box--shaking" : ""} rw-box--normal`}>
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
}: {
  result: GachaPullResult;
  waiting: boolean;
  index: number;
}) {
  const ce = result.edition === "collector";
  if (waiting) {
    return (
      <div style={{ animationDelay: `${index * 70}ms` }}>
        <BoxOnly shaking />
      </div>
    );
  }
  return (
    <div
      className="rw-slot rw-pop"
      style={{ animationDelay: `${index * STAGGER_MS}ms` }}
    >
      <CatCakeCard
        flavor={result.flavorId as FlavorId}
        edition={result.edition}
        collectorStyle="day"
        size={ce ? 110 : 88}
      />
      <SlotMeta result={result} />
    </div>
  );
}
