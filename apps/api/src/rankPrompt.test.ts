import { describe, expect, it } from "vitest";
import { parseRankResult } from "./rankPrompt.js";

describe("parseRankResult", () => {
  it("parses a valid eligible result", () => {
    const result = parseRankResult(
      JSON.stringify({
        eligible: true,
        score: 82,
        reason: "Strong SWE internship fit.",
        location_fit: "bay",
      }),
    );
    expect(result).toEqual({
      eligible: true,
      score: 82,
      reason: "Strong SWE internship fit.",
      location_fit: "bay",
    });
  });

  it("forces score to 0 when ineligible", () => {
    const result = parseRankResult(
      JSON.stringify({
        eligible: false,
        score: 90,
        reason: "Not SWE.",
        location_fit: "nyc",
      }),
    );
    expect(result.eligible).toBe(false);
    expect(result.score).toBe(0);
  });

  it("clamps score and defaults invalid numbers", () => {
    const result = parseRankResult(
      JSON.stringify({
        eligible: true,
        score: 150,
        reason: "High",
        location_fit: "la",
      }),
    );
    expect(result.score).toBe(100);

    const defaulted = parseRankResult(
      JSON.stringify({
        eligible: true,
        score: "bad",
        reason: "Fallback",
        location_fit: "la",
      }),
    );
    expect(defaulted.score).toBe(50);
  });

  it("falls back to unknown location_fit and default reasons", () => {
    const ineligible = parseRankResult(
      JSON.stringify({
        eligible: false,
        score: 0,
        reason: "",
        location_fit: "mars",
      }),
    );
    expect(ineligible.location_fit).toBe("unknown");
    expect(ineligible.reason).toBe("Does not meet hard requirements.");

    const eligible = parseRankResult(
      JSON.stringify({
        eligible: true,
        score: 70,
        reason: "",
        location_fit: "invalid",
      }),
    );
    expect(eligible.location_fit).toBe("unknown");
    expect(eligible.reason).toBe("Eligible, no reason returned.");
  });

  it("truncates long reasons", () => {
    const longReason = "x".repeat(700);
    const result = parseRankResult(
      JSON.stringify({
        eligible: true,
        score: 60,
        reason: longReason,
        location_fit: "remote",
      }),
    );
    expect(result.reason.length).toBe(600);
  });

  it("throws on invalid JSON", () => {
    expect(() => parseRankResult("not json")).toThrow();
  });
});
