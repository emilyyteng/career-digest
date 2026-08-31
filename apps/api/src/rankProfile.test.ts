import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import {
  RankProfileError,
  getRankSystemPrompt,
  resetRankProfileCache,
  resolveRankProfilePath,
} from "./rankProfile.js";

const fixturePath = path.join(
  fileURLToPath(new URL(".", import.meta.url)),
  "__fixtures__",
  "rank-profile.md",
);

describe("rankProfile", () => {
  const originalProfilePath = process.env.RANK_PROFILE_PATH;

  afterEach(() => {
    resetRankProfileCache();
    if (originalProfilePath === undefined) {
      delete process.env.RANK_PROFILE_PATH;
    } else {
      process.env.RANK_PROFILE_PATH = originalProfilePath;
    }
  });

  it("loads the profile from RANK_PROFILE_PATH", () => {
    process.env.RANK_PROFILE_PATH = fixturePath;
    const prompt = getRankSystemPrompt();
    expect(prompt).toContain("Test Candidate");
    expect(getRankSystemPrompt()).toBe(prompt);
  });

  it("throws a clear error when the profile file is missing", () => {
    process.env.RANK_PROFILE_PATH = path.join(
      path.dirname(fixturePath),
      "missing-rank-profile.md",
    );
    expect(() => getRankSystemPrompt()).toThrow(RankProfileError);
    expect(() => getRankSystemPrompt()).toThrow(/not found/);
    expect(() => getRankSystemPrompt()).toThrow(/rank-profile\.example\.md/);
  });

  it("resolves override paths absolutely", () => {
    process.env.RANK_PROFILE_PATH = fixturePath;
    expect(resolveRankProfilePath()).toBe(path.resolve(fixturePath));
  });
});
