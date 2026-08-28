import { describe, expect, it } from "vitest";
import { classifyLocation, isAllowedUsLocation } from "./location.js";

describe("isAllowedUsLocation", () => {
  it("allows US and unknown locations", () => {
    expect(isAllowedUsLocation("San Francisco, CA")).toBe(true);
    expect(isAllowedUsLocation("Remote US")).toBe(true);
    expect(isAllowedUsLocation(null)).toBe(true);
    expect(isAllowedUsLocation("")).toBe(true);
  });

  it("rejects clear non-US locations", () => {
    expect(isAllowedUsLocation("London, UK")).toBe(false);
    expect(isAllowedUsLocation("Toronto, ON")).toBe(false);
    expect(isAllowedUsLocation("Bengaluru, India")).toBe(false);
  });

  it("keeps mixed US + international when US signal present", () => {
    expect(isAllowedUsLocation("New York, NY | London, UK")).toBe(true);
  });
});

describe("classifyLocation", () => {
  it("classifies US states and cities", () => {
    expect(classifyLocation("Austin, TX")).toBe("us");
    expect(classifyLocation("United States")).toBe("us");
  });

  it("classifies foreign countries", () => {
    expect(classifyLocation("Paris, France")).toBe("non_us");
    expect(classifyLocation("Singapore")).toBe("non_us");
  });

  it("returns unknown for ambiguous or empty input", () => {
    expect(classifyLocation(null)).toBe("unknown");
    expect(classifyLocation("Paris")).toBe("unknown");
  });
});
