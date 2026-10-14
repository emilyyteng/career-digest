import { useState } from "react";
import type { LeetcodeTier, LeetcodeTierCounts, LeetcodeType } from "../../api";

const TIERS: LeetcodeTier[] = ["easy", "medium", "hard"];
const TIER_LABEL: Record<LeetcodeTier, string> = { easy: "Easy", medium: "Medium", hard: "Hard" };

export function lcCountsLine(label: string, t: LeetcodeTierCounts): string {
  const total = t.easy + t.medium + t.hard;
  return `${label}: ${total} solved · ${t.easy} easy · ${t.medium} medium · ${t.hard} hard`;
}

/**
 * The one LeetCode logging control. Today shows the weekly/misc switch; History passes
 * `type="misc"` and no switch, since past days are edited per tier only. Day and week
 * counts live outside this card (right-justified on the Progress panel).
 */
export default function LeetcodeLogger({
  tiers,
  weeklyProgress,
  fixedType,
  onChange,
}: {
  tiers: LeetcodeTierCounts;
  /** This week's LC progress; weekly −1 is disabled at 0. */
  weeklyProgress?: number;
  fixedType?: LeetcodeType;
  onChange: (tier: LeetcodeTier, delta: 1 | -1, type: LeetcodeType) => Promise<void>;
}) {
  const [chosenType, setChosenType] = useState<LeetcodeType>("weekly");
  const [busy, setBusy] = useState(false);
  const type = fixedType ?? chosenType;

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
            busy || tiers[tier] <= 0 || (type === "weekly" && (weeklyProgress ?? 0) <= 0);
          return (
            <div key={tier} className="lc-tier-stepper">
              <span className="lc-tier-name">{TIER_LABEL[tier]}</span>
              <button
                type="button"
                className="secondary ui-btn lc-step-btn"
                disabled={removeDisabled}
                aria-label={`Remove one ${TIER_LABEL[tier]} (${type})`}
                onClick={() => void step(tier, -1)}
              >
                −
              </button>
              <span className="lc-tier-count">{tiers[tier]}</span>
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
