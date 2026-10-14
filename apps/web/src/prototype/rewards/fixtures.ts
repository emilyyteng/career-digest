import type { GachaState } from "./gacha";

/** Roughly last week's real earn total (Oct 5–11, 2026). */
export const WEEKLY_EARN_ESTIMATE = 1740;

/** Points clawed back when un-completing a typical task, for the negative-balance demo. */
export const UNDO_TASK_POINTS = 300;

export const freshPullState = (): GachaState => ({
  balance: 2400,
  pity: 9,
  collectorDupeStreak: 0,
  owned: {
    "strawberry:classic": 1,
    "lemon:classic": 1,
  },
});

/**
 * Several months in: every classic, two-thirds of the CEs, friendship levels
 * from 0 to max, and a few refundable extras (copies beyond 6).
 */
export const midCollectionState = (): GachaState => ({
  balance: 512,
  pity: 6,
  collectorDupeStreak: 1,
  owned: {
    "strawberry:classic": 5,
    "matcha:classic": 3,
    "blueberry:classic": 2,
    "sesame:classic": 6,
    "peach:classic": 1,
    "lemon:classic": 4,
    "cherry:classic": 8,
    "redbean:classic": 4,
    "chocobanana:classic": 6,
    "raspberry:classic": 2,
    "caramel:classic": 9,
    "ube:classic": 3,
    "strawberry:collector": 1,
    "matcha:collector": 1,
    "sesame:collector": 2,
    "peach:collector": 3,
    "cherry:collector": 4,
    "chocobanana:collector": 1,
    "caramel:collector": 7,
    "ube:collector": 2,
  },
});
