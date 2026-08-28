import { describe, expect, it } from "vitest";
import {
  buildOracleDetailsFinder,
  buildOracleJobUrl,
  buildOracleListFinder,
  extractOracleJobIdFromUrl,
  isOracleCloudAtsUrl,
  parseOracleBoardFromUrl,
  parseOracleBoardToken,
} from "./oracle.js";

describe("parseOracleBoardToken", () => {
  it("splits host and siteNumber", () => {
    expect(parseOracleBoardToken("elxb.fa.us2.oraclecloud.com|CX")).toEqual({
      apiHost: "elxb.fa.us2.oraclecloud.com",
      siteNumber: "CX",
    });
  });

  it("rejects invalid tokens", () => {
    expect(() => parseOracleBoardToken("invalid")).toThrow(/Invalid oracle boardToken/);
  });
});

describe("oracle finder strings", () => {
  it("builds list finder with literal separators", () => {
    expect(buildOracleListFinder("CX_1", 0)).toBe(
      "findReqs;siteNumber=CX_1,limit=200,sortBy=POSTING_DATES_DESC",
    );
    expect(buildOracleListFinder("CX", 200)).toBe(
      "findReqs;siteNumber=CX,limit=200,offset=200,sortBy=POSTING_DATES_DESC",
    );
  });

  it("builds details finder with quoted job id", () => {
    expect(buildOracleDetailsFinder("CX_1", "32629")).toBe(
      "ById;Id=\"32629\",siteNumber=CX_1",
    );
  });
});

describe("oracle URL helpers", () => {
  it("builds Candidate Experience job URLs", () => {
    expect(buildOracleJobUrl("elxb.fa.us2.oraclecloud.com", "CX", "1910")).toBe(
      "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
    );
  });

  it("extracts job ids from URLs", () => {
    expect(
      extractOracleJobIdFromUrl(
        "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
      ),
    ).toBe("1910");
  });

  it("parses board config from listing URLs", () => {
    const board = parseOracleBoardFromUrl(
      "https://fa-evmr-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX_1/job/28488",
    );
    expect(board).toEqual({
      apiHost: "fa-evmr-saasfaprod1.fa.ocs.oraclecloud.com",
      siteNumber: "CX_1",
      boardToken: "fa-evmr-saasfaprod1.fa.ocs.oraclecloud.com|CX_1",
    });
  });

  it("detects oracle cloud ATS URLs", () => {
    expect(
      isOracleCloudAtsUrl(
        "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
      ),
    ).toBe(true);
    expect(isOracleCloudAtsUrl("https://boards.greenhouse.io/embed/job_app")).toBe(
      false,
    );
  });
});
