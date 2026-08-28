import { describe, expect, it } from "vitest";
import {
  extractAshbyPostingId,
  extractGreenhouseJobId,
  extractLeverPostingId,
  extractOracleJobId,
} from "./mergeUrlExtractors.js";

describe("extractGreenhouseJobId", () => {
  it("extracts gh_jid from custom domain URLs", () => {
    expect(
      extractGreenhouseJobId("https://zipline.com/careers?gh_jid=12345"),
    ).toBe("12345");
  });

  it("extracts token from embed job_app URLs", () => {
    expect(
      extractGreenhouseJobId(
        "https://boards.greenhouse.io/embed/job_app?token=999",
      ),
    ).toBe("999");
  });

  it("returns null when no greenhouse id is present", () => {
    expect(extractGreenhouseJobId("https://example.com/jobs/1")).toBeNull();
  });
});

describe("extractLeverPostingId", () => {
  it("extracts uuid from lever apply URLs", () => {
    const uuid = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";
    expect(
      extractLeverPostingId(`https://jobs.lever.co/acme/${uuid}`),
    ).toBe(uuid);
  });
});

describe("extractAshbyPostingId", () => {
  it("extracts posting id from ashby URLs", () => {
    expect(
      extractAshbyPostingId(
        "https://jobs.ashbyhq.com/company/software-engineer-intern",
      ),
    ).toBe("software-engineer-intern");
  });
});

describe("extractOracleJobId", () => {
  it("extracts job id from Candidate Experience URLs", () => {
    expect(
      extractOracleJobId(
        "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
      ),
    ).toBe("1910");
    expect(
      extractOracleJobId(
        "https://fa-exjq-saasfaprod1.fa.ocs.oraclecloud.com/hcmUI/CandidateExperience/en/sites/SHEIN/job/USA87554940",
      ),
    ).toBe("USA87554940");
  });
});
