/**
 * Live constants payload for Rewards Rules (F08 M7-10 / R7.9).
 * Values come from the same modules production uses — do not hand-copy.
 */
import { ACHIEVEMENT_CATALOG } from "./achievements.js";
import {
  FRIENDSHIP_MAX,
  KEPT_COPIES,
  CAT_CAKE_FLAVOR_IDS,
} from "./catCakeCatalog.js";
import { GACHA_CONFIG, collectorRateAt } from "./catCakeGacha.js";
import { POINTS } from "./pointsFormulas.js";

export type RewardsRulesPayload = {
  currency: { singular: string; plural: string };
  earning: {
    points: typeof POINTS;
    achievements: Array<{
      id: string;
      family: string;
      label: string;
      threshold: number;
      points: number;
    }>;
    notes: {
      weeklyGoalStreakEarnsNothing: true;
      reflectionIsNoteNotTime: true;
      blankTimeAddsZero: true;
    };
  };
  spending: {
    gacha: typeof GACHA_CONFIG;
    friendshipMax: number;
    keptCopies: number;
    flavorCount: number;
    nightUnlockAtCopies: 2;
    pityLadder: Array<{ pull: number; rate: number }>;
  };
};

/** Display names stay on the web via CURRENCY_DISPLAY; API echoes Seeds defaults for tests. */
export function getRewardsRulesPayload(): RewardsRulesPayload {
  const pityLadder: Array<{ pull: number; rate: number }> = [];
  for (let pull = 1; pull <= GACHA_CONFIG.hardPity; pull++) {
    pityLadder.push({ pull, rate: collectorRateAt(pull, GACHA_CONFIG) });
  }
  return {
    currency: { singular: "seed", plural: "seeds" },
    earning: {
      points: POINTS,
      achievements: ACHIEVEMENT_CATALOG.map((a) => ({
        id: a.id,
        family: a.family,
        label: a.label,
        threshold: a.threshold,
        points: a.points,
      })),
      notes: {
        weeklyGoalStreakEarnsNothing: true,
        reflectionIsNoteNotTime: true,
        blankTimeAddsZero: true,
      },
    },
    spending: {
      gacha: GACHA_CONFIG,
      friendshipMax: FRIENDSHIP_MAX,
      keptCopies: KEPT_COPIES,
      flavorCount: CAT_CAKE_FLAVOR_IDS.length,
      nightUnlockAtCopies: 2,
      pityLadder,
    },
  };
}
