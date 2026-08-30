import { describe, expect, it } from "vitest";
import { ACTIVITY_CREDIT_CAP, earnedCredit, isValidTimezone, localDateInTimezone, parseLocalDate } from "./progress.js";

describe("earnedCredit", () => {
  it("caps at activity credit limit", () => {
    expect(earnedCredit(0)).toBe(0);
    expect(earnedCredit(3)).toBe(3);
    expect(earnedCredit(5)).toBe(5);
    expect(earnedCredit(12)).toBe(ACTIVITY_CREDIT_CAP);
  });
});

describe("localDateInTimezone", () => {
  it("formats calendar date in IANA timezone", () => {
    const instant = new Date("2025-08-10T07:00:00.000Z");
    expect(localDateInTimezone(instant, "America/Los_Angeles")).toBe("2025-08-10");
  });
});

describe("parseLocalDate", () => {
  it("rejects impossible calendar dates", () => {
    expect(parseLocalDate("2025-02-30")).toBeNull();
    expect(parseLocalDate("2025-08-10")).toBe("2025-08-10");
  });
});

describe("isValidTimezone", () => {
  it("accepts IANA zones and rejects garbage", () => {
    expect(isValidTimezone("America/Los_Angeles")).toBe(true);
    expect(isValidTimezone("Not/AZone")).toBe(false);
  });
});
