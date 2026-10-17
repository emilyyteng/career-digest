import { useState } from "react";
import type { LeetcodeTier, LeetcodeTierCounts, LeetcodeType } from "../../api";
import { Button } from "../../ui";

const TIERS: LeetcodeTier[] = ["easy", "medium", "hard"];
const TIER_LABEL: Record<LeetcodeTier, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };
/** Display only; matches API `POINTS.leetcodeByTier` (R8.3). */
const TIER_POINTS: Record<LeetcodeTier, number> = { easy: 20, medium: 30, hard: 50 };

export function lcCountsLine(label: string, t: LeetcodeTierCounts): string {
  const total = t.easy + t.medium + t.hard;
  return `${label}: ${total} solved · ${t.easy} easy · ${t.medium} medium · ${t.hard} hard`;
}

function subtractTiers(total: LeetcodeTierCounts, weekly: LeetcodeTierCounts): LeetcodeTierCounts {
  return {
    easy: Math.max(0, total.easy - weekly.easy),
    medium: Math.max(0, total.medium - weekly.medium),
    hard: Math.max(0, total.hard - weekly.hard),
  };
}

function TierStepper({
  tier,
  type,
  count,
  weeklyProgress,
  busy,
  onStep,
  showName,
}: {
  tier: LeetcodeTier;
  type: LeetcodeType;
  count: number;
  weeklyProgress?: number;
  busy: boolean;
  onStep: (tier: LeetcodeTier, delta: 1 | -1, type: LeetcodeType) => void;
  /** When false, only the − N + controls (matrix row already shows the name). */
  showName?: boolean;
}) {
  const removeDisabled =
    busy || count <= 0 || (type === "weekly" && (weeklyProgress ?? 0) <= 0);
  return (
    <div className="lc-tier-stepper">
      {showName !== false && (
        <span className="lc-tier-name">
          {TIER_LABEL[tier]}
          <span className="lc-tier-pts"> +{TIER_POINTS[tier]}</span>
        </span>
      )}
      <Button
        size="sm"
        className="lc-step-btn"
        disabled={removeDisabled}
        aria-label={`Remove one ${TIER_LABEL[tier]} (${type})`}
        onClick={() => onStep(tier, -1, type)}
      >
        −
      </Button>
      <span className="lc-tier-count">{count}</span>
      <Button
        size="sm"
        className="lc-step-btn"
        disabled={busy}
        aria-label={`Add one ${TIER_LABEL[tier]} (${type})`}
        onClick={() => onStep(tier, 1, type)}
      >
        +
      </Button>
    </div>
  );
}

/**
 * The one LeetCode logging control. Today uses a tier × (Weekly | Misc) matrix so
 * all six steppers stay visible. History passes `fixedType="misc"` for a single
 * column. Day and week totals live outside this card.
 */
export default function LeetcodeLogger({
  tiers,
  weeklyTiers,
  weeklyProgress,
  fixedType,
  onChange,
}: {
  /** Day totals per tier (all types). */
  tiers: LeetcodeTierCounts;
  /** Today's weekly-typed solves per tier. Misc = tiers − weekly. Defaults to zeros. */
  weeklyTiers?: LeetcodeTierCounts;
  /** This week's LC progress; weekly −1 is disabled at 0. */
  weeklyProgress?: number;
  fixedType?: LeetcodeType;
  onChange: (tier: LeetcodeTier, delta: 1 | -1, type: LeetcodeType) => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);
  const weekly = weeklyTiers ?? { easy: 0, medium: 0, hard: 0 };
  const misc = subtractTiers(tiers, weekly);

  async function step(tier: LeetcodeTier, delta: 1 | -1, type: LeetcodeType) {
    setBusy(true);
    try {
      await onChange(tier, delta, type);
    } finally {
      setBusy(false);
    }
  }

  if (fixedType) {
    const display = fixedType === "weekly" ? weekly : misc;
    return (
      <div className="lc-logger">
        <div className="lc-tier-list">
          {TIERS.map((tier) => (
            <TierStepper
              key={tier}
              tier={tier}
              type={fixedType}
              count={display[tier]}
              weeklyProgress={weeklyProgress}
              busy={busy}
              onStep={step}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="lc-logger lc-logger-matrix" role="group" aria-label="Today’s LeetCode">
      <p className="lc-logger-title">Today’s LC</p>
      <span className="lc-logger-head">Weekly</span>
      <span className="lc-logger-head">Misc</span>
      {TIERS.map((tier) => (
        <div key={tier} className="lc-logger-row-contents">
          <span className="lc-tier-name">
            {TIER_LABEL[tier]}
            <span className="lc-tier-pts"> +{TIER_POINTS[tier]}</span>
          </span>
          <TierStepper
            tier={tier}
            type="weekly"
            count={weekly[tier]}
            weeklyProgress={weeklyProgress}
            busy={busy}
            onStep={step}
            showName={false}
          />
          <TierStepper
            tier={tier}
            type="misc"
            count={misc[tier]}
            weeklyProgress={weeklyProgress}
            busy={busy}
            onStep={step}
            showName={false}
          />
        </div>
      ))}
    </div>
  );
}
