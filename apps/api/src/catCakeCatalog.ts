/**
 * Frozen v1 Cat Cake catalog (F08 M7-03). Display art lives on the web;
 * the API only needs stable ids and friendship math.
 */

export const CAT_CAKE_FLAVOR_IDS = [
  "strawberry",
  "matcha",
  "blueberry",
  "sesame",
  "peach",
  "lemon",
  "cherry",
  "redbean",
  "chocobanana",
  "raspberry",
  "caramel",
  "ube",
] as const;

export type CatCakeFlavorId = (typeof CAT_CAKE_FLAVOR_IDS)[number];
export type CatCakeEdition = "classic" | "collector";
export type CatCakeLook = "day" | "night";

/** Extra copies that raise friendship before extras become refundable. */
export const FRIENDSHIP_MAX = 5;
/** Copies kept: the original plus `FRIENDSHIP_MAX` friendship dupes. */
export const KEPT_COPIES = 1 + FRIENDSHIP_MAX;

export function isCatCakeFlavorId(value: string): value is CatCakeFlavorId {
  return (CAT_CAKE_FLAVOR_IDS as readonly string[]).includes(value);
}

export function friendshipLevel(count: number): number {
  return Math.min(FRIENDSHIP_MAX, Math.max(0, count - 1));
}

export function refundableCount(count: number): number {
  return Math.max(0, count - KEPT_COPIES);
}

export function nightUnlocked(collectorCopies: number): boolean {
  return collectorCopies >= 2;
}
