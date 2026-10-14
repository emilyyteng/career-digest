/**
 * User-facing currency labels (F08 R7.10).
 * Change these two strings to rename seeds everywhere Rewards (and later Rules) imports this module.
 * API / storage may still say `points` / `points_*`.
 */
export const CURRENCY_DISPLAY = {
  singular: "seed",
  plural: "seeds",
} as const;

/** Plural when |n| !== 1; otherwise singular. */
export function currencyLabel(amount: number): string {
  return Math.abs(amount) === 1
    ? CURRENCY_DISPLAY.singular
    : CURRENCY_DISPLAY.plural;
}
