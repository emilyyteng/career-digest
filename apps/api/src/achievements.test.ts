import { describe, expect, it } from "vitest";
import { ACHIEVEMENT_CATALOG } from "./achievements.js";
import { POINTS } from "./pointsFormulas.js";

describe("achievement catalog (R5.26)", () => {
  it("pays spot-check amounts", () => {
    expect(ACHIEVEMENT_CATALOG.find((a) => a.id === "apps:100")?.points).toBe(300);
    expect(ACHIEVEMENT_CATALOG.find((a) => a.id === "lc:100")?.points).toBe(500);
    expect(ACHIEVEMENT_CATALOG.find((a) => a.id === "assessment:5")?.points).toBe(
      POINTS.interviewByKind.assessment * 5,
    );
    expect(ACHIEVEMENT_CATALOG.find((a) => a.id === "offer:1")?.points).toBe(
      POINTS.interviewByKind.offer,
    );
  });

  it("has no custom-step achievements", () => {
    expect(ACHIEVEMENT_CATALOG.some((a) => a.family === "custom")).toBe(false);
  });
});
