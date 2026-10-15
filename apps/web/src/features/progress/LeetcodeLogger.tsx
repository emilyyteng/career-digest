import { useState } from "react";
import type { LeetcodeTier, LeetcodeTierCounts, LeetcodeType } from "../../api";

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

/**
 * The one LeetCode logging control. Today shows the weekly/misc switch; History passes
 * `type="misc"` and no switch, since past days are edited per tier only. Day and week
 * totals live outside this card. The stepper counts follow the selected type.
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
  const [chosenType, setChosenType] = useState<LeetcodeType>("weekly");
  const [busy, setBusy] = useState(false);
  const type = fixedType ?? chosenType;
  const weekly = weeklyTiers ?? { easy: 0, medium: 0, hard: 0 };
  const display = type === "weekly" ? weekly : subtractTiers(tiers, weekly);

  async function step(tier: LeetcodeTier, delta: 1 | -1) {
    setBusy(true);
    try {
      await onChange(tier, delta, type);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="lc-logger">
      {!fixedType && (
        <div className="ui-segmented" role="radiogroup" aria-label="Solve type">
          {(["weekly", "misc"] as const).map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={type === t}
              className={`secondary ui-btn ui-btn-ghost${type === t ? " is-active" : ""}`}
              onClick={() => setChosenType(t)}
            >
              {t === "weekly" ? "Weekly" : "Misc"}
            </button>
          ))}
        </div>
      )}
      <div className="lc-tier-list">
        {TIERS.map((tier) => {
          const removeDisabled =
            busy ||
            display[tier] <= 0 ||
            (type === "weekly" && (weeklyProgress ?? 0) <= 0);
          return (
            <div key={tier} className="lc-tier-stepper">
              <span className="lc-tier-name">
                {TIER_LABEL[tier]}
                <span className="lc-tier-pts"> +{TIER_POINTS[tier]}</span>
              </span>
              <button
                type="button"
                className="secondary ui-btn lc-step-btn"
                disabled={removeDisabled}
                aria-label={`Remove one ${TIER_LABEL[tier]} (${type})`}
                onClick={() => void step(tier, -1)}
              >
                −
              </button>
              <span className="lc-tier-count">{display[tier]}</span>
              <button
                type="button"
                className="secondary ui-btn lc-step-btn"
                disabled={busy}
                aria-label={`Add one ${TIER_LABEL[tier]} (${type})`}
                onClick={() => void step(tier, 1)}
              >
                +
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
