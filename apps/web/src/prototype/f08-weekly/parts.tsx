/** Small building blocks shared by the F08 M5-06 prototype pages. */
import { useCallback, useRef, useState } from "react";
import type { PointsEarnInfo } from "../../api";
import EarnFlash from "../../features/completion/EarnFlash";
import { btn } from "./F08Shell";
import { computePace, TIER_LABEL, type DayCounts, type Tier } from "./fixtures";

/** Bar that fills to the target; with `showOverflow`, units past the target get their own segment. */
export function GoalBar({
  done,
  total,
  showOverflow,
}: {
  done: number;
  total: number;
  showOverflow?: boolean;
}) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  const over = showOverflow && total > 0 && done > total ? done - total : 0;
  return (
    <div className="f08-bar-wrap">
      <div
        className="weekly-goal-bar"
        role="progressbar"
        aria-valuenow={done}
        aria-valuemin={0}
        aria-valuemax={total}
      >
        <span style={{ width: `${pct}%` }} />
      </div>
      {over > 0 && (
        <span className="f08-bar-over" aria-label={`${over} past target`}>
          +{over}
        </span>
      )}
    </div>
  );
}

export function PaceText({ done, total }: { done: number; total: number }) {
  const pace = computePace(done, total);
  if (pace.met) return <span className="weekly-pace on-track">met</span>;
  if (pace.label === "ahead") return <span className="weekly-pace on-track">{pace.amount} ahead</span>;
  if (pace.label === "behind") return <span className="weekly-pace behind">{pace.amount} behind</span>;
  return <span className="weekly-pace on-track">on track</span>;
}

export function TierStepper({
  tier,
  count,
  onAdd,
  onRemove,
  removeDisabled,
  compact,
  hideCount,
}: {
  tier: Tier;
  count: number;
  onAdd: () => void;
  onRemove: () => void;
  removeDisabled?: boolean;
  compact?: boolean;
  /** The day stores tiers but not types, so a weekly-only control can't show its own per-tier count. */
  hideCount?: boolean;
}) {
  return (
    <div className={compact ? "f08-tier-stepper is-compact" : "f08-tier-stepper"}>
      <span className="f08-tier-name">{compact ? TIER_LABEL[tier].slice(0, 1) : TIER_LABEL[tier]}</span>
      <button
        type="button"
        className={btn("secondary", "sm", "f08-step-btn")}
        disabled={removeDisabled || count <= 0}
        aria-label={`Remove one ${TIER_LABEL[tier]}`}
        onClick={onRemove}
      >
        −
      </button>
      {!hideCount && <span className="f08-tier-count">{count}</span>}
      <button
        type="button"
        className={btn("secondary", "sm", "f08-step-btn")}
        aria-label={`Add one ${TIER_LABEL[tier]}`}
        onClick={onAdd}
      >
        +
      </button>
    </div>
  );
}

export function DayCountsLine({ day }: { day: DayCounts }) {
  const total = day.easy + day.medium + day.hard;
  return (
    <p className="muted f08-day-line">
      Today: {total} solved · {day.easy} easy · {day.medium} medium · {day.hard} hard
    </p>
  );
}

/** Mock points balance + the production `EarnFlash`. */
export function useMockEarn(startBalance = 1240) {
  const balanceRef = useRef(startBalance);
  const [balance, setBalance] = useState(startBalance);
  const [earn, setEarn] = useState<PointsEarnInfo | null>(null);
  const dismiss = useCallback(() => setEarn(null), []);
  const flash = useCallback((amount: number, message: string) => {
    balanceRef.current += amount;
    setBalance(balanceRef.current);
    setEarn({ amount, message, balanceAfter: balanceRef.current });
  }, []);
  const node = <EarnFlash earn={earn} onDismiss={dismiss} />;
  return { balance, flash, node };
}
