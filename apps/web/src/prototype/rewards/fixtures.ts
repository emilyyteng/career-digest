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

/** Several weeks in: all classics with dupes, a few CEs. */
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
    "strawberry:collector": 1,
    "matcha:collector": 1,
    "sesame:collector": 2,
  },
});
