import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchAshbyJobs } from "./ashby.js";
import { fetchGreenhouseJobs, fetchGreenhouseJobContent } from "./greenhouse.js";
import { fetchLeverJobs } from "./lever.js";
import { fetchOracleJobDetails, fetchOracleJobs } from "./oracle.js";
import {
  fetchSmartrecruitersJobContent,
  fetchSmartrecruitersJobs,
} from "./smartrecruiters.js";

const fixturesDir = path.join(fileURLToPath(new URL(".", import.meta.url)), "__fixtures__");

async function readFixture(name: string): Promise<string> {
  return readFile(path.join(fixturesDir, name), "utf8");
}

function mockFetchFromFixtures(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL) => {
      const url = String(input);
      if (url.includes("boards-api.greenhouse.io") && url.endsWith("/jobs")) {
        return new Response(await readFixture("greenhouse-jobs.json"), { status: 200 });
      }
      if (url.includes("boards-api.greenhouse.io") && url.includes("/jobs/")) {
        const body = await readFixture("greenhouse-jobs.json");
        const parsed = JSON.parse(body) as { jobs?: Array<{ id: number; content?: string }> };
        const job = parsed.jobs?.[0];
        return new Response(
          JSON.stringify({ ...job, content: job?.content ?? "<p>detail</p>" }),
          { status: 200 },
        );
      }
      if (url.includes("api.lever.co")) {
        return new Response(await readFixture("lever-jobs.json"), { status: 200 });
      }
      if (url.includes("api.ashbyhq.com")) {
        return new Response(await readFixture("ashby-jobs.json"), { status: 200 });
      }
      if (url.includes("recruitingCEJobRequisitions")) {
        return new Response(await readFixture("oracle-list.json"), { status: 200 });
      }
      if (url.includes("recruitingCEJobRequisitionDetails")) {
        return new Response(await readFixture("oracle-details.json"), { status: 200 });
      }
      if (url.includes("api.smartrecruiters.com") && url.includes("/postings/")) {
        return new Response(await readFixture("smartrecruiters-detail.json"), { status: 200 });
      }
      if (url.includes("api.smartrecruiters.com")) {
        return new Response(await readFixture("smartrecruiters-list.json"), { status: 200 });
      }
      return new Response("not found", { status: 404 });
    }),
  );
}

describe("adapter fixtures", () => {
  beforeEach(() => {
    mockFetchFromFixtures();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("normalizes greenhouse list fixtures", async () => {
    const postings = await fetchGreenhouseJobs("acme");
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      source: "greenhouse",
      externalId: "12345",
      title: "Software Engineer Intern",
      location: "San Francisco, CA",
      department: "Engineering",
      url: "https://boards.greenhouse.io/acme/jobs/12345",
      isInternship: true,
    });
  });

  it("loads greenhouse job content fixtures", async () => {
    const html = await fetchGreenhouseJobContent("acme", "12345");
    expect(html).toContain("Build cool things");
  });

  it("normalizes lever list fixtures", async () => {
    const postings = await fetchLeverJobs("acme");
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      source: "lever",
      externalId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      title: "Product Intern",
      location: "New York, NY",
      department: "Product",
      isInternship: true,
    });
  });

  it("normalizes ashby list fixtures", async () => {
    const postings = await fetchAshbyJobs("acme");
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      source: "ashby",
      externalId: "software-engineer-intern",
      title: "Software Engineer Intern",
      location: "Remote",
      department: "Engineering",
      isInternship: true,
    });
  });

  it("normalizes oracle list fixtures", async () => {
    const postings = await fetchOracleJobs("elxb.fa.us2.oraclecloud.com|CX");
    expect(postings).toHaveLength(1);
    expect(postings[0]).toMatchObject({
      source: "oracle",
      externalId: "1910",
      title: "Summer Analyst Intern",
      location: "Washington, DC",
      url: "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
      isInternship: true,
    });
  });

  it("merges oracle detail fixture sections", async () => {
    const details = await fetchOracleJobDetails("elxb.fa.us2.oraclecloud.com|CX", "1910");
    expect(details).toContain("Oracle job description.");
    expect(details).toContain("Support the team.");
    expect(details).toContain("Currently enrolled student.");
  });

  it("normalizes smartrecruiters list fixtures", async () => {
    const postings = await fetchSmartrecruitersJobs("WesternDigital");
    expect(postings).toHaveLength(2);
    expect(postings[0]).toMatchObject({
      source: "smartrecruiters",
      externalId: "744000143171017",
      title: "Summer 2027 Intern - Software Engineering",
      location: "San Jose, CA, United States",
      url: "https://jobs.smartrecruiters.com/WesternDigital/744000143171017",
      isInternship: true,
    });
  });

  it("loads smartrecruiters job content fixtures", async () => {
    const html = await fetchSmartrecruitersJobContent("WesternDigital", "744000143171017");
    expect(html).toContain("Build firmware and tools.");
    expect(html).toContain("BS in CS.");
  });

  it("merges object-shaped jobAd sections from live API", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: string | URL) => {
        const url = String(input);
        if (url.includes("/postings/744000143171017")) {
          return new Response(
            JSON.stringify({
              id: "744000143171017",
              jobAd: {
                sections: {
                  jobDescription: {
                    title: "Job Description",
                    text: "<p>Live API shaped section.</p>",
                  },
                },
              },
            }),
            { status: 200 },
          );
        }
        return new Response("not found", { status: 404 });
      }),
    );
    const html = await fetchSmartrecruitersJobContent("WesternDigital", "744000143171017");
    expect(html).toContain("Live API shaped section.");
  });
});
