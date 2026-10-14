import { describe, expect, it } from "vitest";
import {
  CAT_CAKE_FLAVOR_IDS,
  FRIENDSHIP_MAX,
  KEPT_COPIES,
  friendshipLevel,
  nightUnlocked,
  refundableCount,
} from "./catCakeCatalog.js";

describe("catCakeCatalog", () => {
  it("freezes twelve v1 flavor ids", () => {
    expect(CAT_CAKE_FLAVOR_IDS).toHaveLength(12);
    expect(new Set(CAT_CAKE_FLAVOR_IDS).size).toBe(12);
  });

  it("friendship and refundable match kept-copy rules", () => {
    expect(FRIENDSHIP_MAX).toBe(5);
    expect(KEPT_COPIES).toBe(6);
    expect(friendshipLevel(0)).toBe(0);
    expect(friendshipLevel(1)).toBe(0);
    expect(friendshipLevel(2)).toBe(1);
    expect(friendshipLevel(6)).toBe(5);
    expect(friendshipLevel(10)).toBe(5);
    expect(refundableCount(6)).toBe(0);
    expect(refundableCount(7)).toBe(1);
  });

  it("Night unlocks at the second CE copy", () => {
    expect(nightUnlocked(1)).toBe(false);
    expect(nightUnlocked(2)).toBe(true);
  });
});
