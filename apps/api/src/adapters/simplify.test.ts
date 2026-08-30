import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  boardConfigKeyFromAtsUrl,
  fetchSimplifyMiscellaneousJobs,
  isConfiguredAtsBoardUrl,
  isMiscellaneousApplyUrl,
  SIMPLIFY_LISTINGS_URL,
} from "./simplify.js";

const fixturesDir = path.join(fileURLToPath(new URL(".", import.meta.url)), "__fixtures__");

describe("fetchSimplifyMiscellaneousJobs", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url === SIMPLIFY_LISTINGS_URL) {
          const body = await readFile(path.join(fixturesDir, "simplify-listings.json"), "utf8");
          return new Response(body, { status: 200 });
        }
        return new Response("not found", { status: 404 });
      }),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("ingests misc URLs and ATS URLs without configured board ingest", async () => {
    const { postings, seenIds } = await fetchSimplifyMiscellaneousJobs();

    expect(postings).toHaveLength(3);
    expect(postings.map((p) => p.externalId)).toEqual(
      expect.arrayContaining([
        "misc-workday-1",
        "greenhouse-skip-1",
        "smartrecruiters-deferred-1",
      ]),
    );
    expect(postings[0]).toMatchObject({
      source: "simplify",
      externalId: "misc-workday-1",
      title: "Operations Intern",
      url: "https://careers.customco.com/job/12345",
      location: "Chicago, IL",
      department: "Custom Careers",
    });
    expect(seenIds).toEqual([
      "misc-workday-1",
      "oracle-hybrid-1",
      "smartrecruiters-hybrid-1",
      "smartrecruiters-deferred-1",
      "greenhouse-skip-1",
    ]);
    expect(seenIds).not.toContain("inactive-1");
  });
});

describe("isMiscellaneousApplyUrl", () => {
  it("treats ATS hosts as non-miscellaneous", () => {
    expect(isMiscellaneousApplyUrl("https://boards.greenhouse.io/acme/jobs/1")).toBe(false);
    expect(isMiscellaneousApplyUrl("https://jobs.lever.co/acme/uuid")).toBe(false);
    expect(isMiscellaneousApplyUrl("https://jobs.ashbyhq.com/acme/job")).toBe(false);
    expect(
      isMiscellaneousApplyUrl(
        "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
      ),
    ).toBe(false);
    expect(
      isMiscellaneousApplyUrl(
        "https://jobs.smartrecruiters.com/WesternDigital/744000143171017",
      ),
    ).toBe(false);
  });

  it("treats custom careers pages as miscellaneous", () => {
    expect(isMiscellaneousApplyUrl("https://careers.customco.com/job/12345")).toBe(true);
    expect(isMiscellaneousApplyUrl("https://zipline.com/careers?gh_jid=12345")).toBe(true);
  });
});

describe("isConfiguredAtsBoardUrl", () => {
  it("recognizes configured oracle and smartrecruiters boards", () => {
    expect(
      isConfiguredAtsBoardUrl(
        "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
      ),
    ).toBe(true);
    expect(
      isConfiguredAtsBoardUrl(
        "https://jobs.smartrecruiters.com/WesternDigital/744000143171017",
      ),
    ).toBe(true);
  });

  it("treats unconfigured ATS boards as not covered by ingest", () => {
    expect(isConfiguredAtsBoardUrl("https://boards.greenhouse.io/acme/jobs/1")).toBe(false);
    expect(
      isConfiguredAtsBoardUrl("https://jobs.smartrecruiters.com/BoschGroup/744000100000001"),
    ).toBe(false);
  });
});

describe("boardConfigKeyFromAtsUrl", () => {
  it("parses board keys from ATS URLs", () => {
    expect(boardConfigKeyFromAtsUrl("https://boards.greenhouse.io/Acme/jobs/1")).toBe(
      "greenhouse:acme",
    );
    expect(
      boardConfigKeyFromAtsUrl("https://job-boards.eu.greenhouse.io/imc/jobs/4780585101"),
    ).toBe("greenhouse:imc");
    expect(
      boardConfigKeyFromAtsUrl(
        "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
      ),
    ).toBe("oracle:elxb.fa.us2.oraclecloud.com|cx");
  });

  it("treats regional greenhouse boards as covered when configured", () => {
    expect(
      isConfiguredAtsBoardUrl("https://job-boards.eu.greenhouse.io/imc/jobs/4780585101"),
    ).toBe(true);
  });
});
