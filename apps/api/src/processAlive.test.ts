import { describe, expect, it } from "vitest";
import { isProcessAlive } from "./processAlive.js";

describe("isProcessAlive", () => {
  it("returns true for this process", () => {
    expect(isProcessAlive(process.pid)).toBe(true);
  });

  it("returns false for an invalid pid", () => {
    expect(isProcessAlive(0)).toBe(false);
    expect(isProcessAlive(-1)).toBe(false);
  });

  it("returns false for a likely-dead pid", () => {
    // PIDs this high are unused on typical macOS/Linux hosts.
    expect(isProcessAlive(2_147_483_646)).toBe(false);
  });
});
