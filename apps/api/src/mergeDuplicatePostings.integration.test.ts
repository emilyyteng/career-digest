import { describe, expect, it } from "vitest";
import { runMergeDuplicatePostings } from "./mergeDuplicatePostings.js";
import { integrationReady } from "./test/integrationSetup.js";
import {
  countApplicationDocuments,
  getApplicationByPosting,
  getFeedbackByPosting,
  getPosting,
  interviewThreadExists,
  markPostingRemovedFromBoard,
  postingExists,
  seedApplication,
  seedApplicationDocument,
  seedCompany,
  seedFeedback,
  seedInterviewThread,
  seedPosting,
} from "./test/dbHarness.js";

describe.skipIf(!integrationReady)("runMergeDuplicatePostings", () => {
  it("merges greenhouse embed simplify rows into canonical greenhouse postings", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "acme" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "999",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/999",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-gh-embed",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=999",
    });

    const result = await runMergeDuplicatePostings();

    expect(result.greenhouse.pairs).toBe(1);
    expect(result.greenhouse.deletedSimplify).toBe(1);
    expect(await postingExists(simplify.id)).toBe(false);
    expect(await postingExists(canonical.id)).toBe(true);
  });

  it("merges regional greenhouse simplify rows into canonical greenhouse postings", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "imc" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "4780585101",
      companyId: company.id,
      url: "https://boards.greenhouse.io/imc/jobs/4780585101",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-gh-eu",
      companyId: company.id,
      url: "https://job-boards.eu.greenhouse.io/imc/jobs/4780585101",
    });

    const result = await runMergeDuplicatePostings();

    expect(result.greenhouse.pairs).toBeGreaterThanOrEqual(1);
    expect(await postingExists(simplify.id)).toBe(false);
    expect(await postingExists(canonical.id)).toBe(true);
  });

  it("merges oracle simplify rows by /job/{id} match", async () => {
    const company = await seedCompany({
      source: "oracle",
      boardToken: "elxb.fa.us2.oraclecloud.com|CX",
    });
    const canonical = await seedPosting({
      source: "oracle",
      externalId: "1910",
      companyId: company.id,
      url: "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-oracle-1910",
      companyId: company.id,
      url: "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/1910?source=simplify",
    });

    const result = await runMergeDuplicatePostings();

    expect(result.oracle.pairs).toBe(1);
    expect(result.oracle.deletedSimplify).toBe(1);
    expect(await postingExists(simplify.id)).toBe(false);
    expect(await postingExists(canonical.id)).toBe(true);
  });

  it("deletes simplify duplicate when smartrecruiters canonical exists", async () => {
    const company = await seedCompany({
      source: "smartrecruiters",
      boardToken: "WesternDigital",
    });
    const canonical = await seedPosting({
      source: "smartrecruiters",
      externalId: "744000143171017",
      companyId: company.id,
      url: "https://jobs.smartrecruiters.com/WesternDigital/744000143171017",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-sr-744000143171017",
      companyId: company.id,
      url: "https://jobs.smartrecruiters.com/WesternDigital/744000143171017?ref=simplify",
    });

    const result = await runMergeDuplicatePostings();

    expect(result.smartrecruiters.pairs).toBe(1);
    expect(result.smartrecruiters.deletedSimplify).toBe(1);
    expect(await postingExists(simplify.id)).toBe(false);
    expect(await postingExists(canonical.id)).toBe(true);
  });

  it("moves applications from simplify posting to canonical when only simplify has one", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "acme" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "1001",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1001",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-app-move",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=1001",
    });
    const application = await seedApplication({
      postingId: simplify.id,
      notes: "Applied via Simplify",
    });

    const result = await runMergeDuplicatePostings();

    expect(result.applicationsMoved).toBe(1);
    expect(await postingExists(simplify.id)).toBe(false);
    const moved = await getApplicationByPosting(canonical.id);
    expect(moved?.id).toBe(application.id);
    expect(moved?.notes).toBe("Applied via Simplify");
  });

  it("merges applications when both simplify and canonical have one", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "acme" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "1002",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1002",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-app-merge",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=1002",
    });
    const canonicalApp = await seedApplication({
      postingId: canonical.id,
      notes: "Tracked on board",
    });
    await seedApplication({
      postingId: simplify.id,
      notes: "Simplify note",
    });

    const result = await runMergeDuplicatePostings();

    expect(result.applicationsMerged).toBe(1);
    const merged = await getApplicationByPosting(canonical.id);
    expect(merged?.id).toBe(canonicalApp.id);
    expect(merged?.notes).toContain("Tracked on board");
    expect(merged?.notes).toContain("Simplify note");
    expect(await getApplicationByPosting(simplify.id)).toBeNull();
  });

  it("repoints feedback from simplify to canonical", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "acme" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "1003",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1003",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-feedback",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=1003",
    });
    const feedback = await seedFeedback({
      postingId: simplify.id,
      kind: "like",
      note: "Interesting role",
    });

    await runMergeDuplicatePostings();

    expect(await postingExists(simplify.id)).toBe(false);
    const moved = await getFeedbackByPosting(canonical.id);
    expect(moved?.id).toBe(feedback.id);
    expect(moved?.note).toBe("Interesting role");
  });

  it("merges simplify rows even when already marked removed from board", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "acme" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "1004",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1004",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-removed",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=1004",
    });
    await markPostingRemovedFromBoard(simplify.id);

    const result = await runMergeDuplicatePostings();

    expect(result.greenhouse.pairs).toBe(1);
    expect(result.greenhouse.deletedSimplify).toBe(1);
    expect(await postingExists(simplify.id)).toBe(false);
    expect(await postingExists(canonical.id)).toBe(true);
  });

  it("merges applications and keeps documents on the canonical application", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "acme" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "1005",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1005",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-docs",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=1005",
    });
    const canonicalApp = await seedApplication({
      postingId: canonical.id,
      status: "todo",
      notes: "Board todo",
    });
    const simplifyApp = await seedApplication({
      postingId: simplify.id,
      status: "interviewing",
      notes: "Simplify interviewing",
    });
    await seedApplicationDocument({
      applicationId: simplifyApp.id,
      originalName: "cover-letter.pdf",
    });

    await runMergeDuplicatePostings();

    const merged = await getApplicationByPosting(canonical.id);
    expect(merged?.id).toBe(canonicalApp.id);
    expect(merged?.status).toBe("interviewing");
    expect(merged?.notes).toContain("Board todo");
    expect(merged?.notes).toContain("Simplify interviewing");
    expect(await countApplicationDocuments(canonicalApp.id)).toBe(1);
    expect(await getApplicationByPosting(simplify.id)).toBeNull();
  });

  it("merges applications without deleting interview threads", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "acme" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "1006",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1006",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-thread",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=1006",
    });
    const canonicalApp = await seedApplication({
      postingId: canonical.id,
      status: "applied",
    });
    const simplifyApp = await seedApplication({
      postingId: simplify.id,
      status: "interviewing",
    });
    const { threadId } = await seedInterviewThread({
      primaryApplicationId: simplifyApp.id,
      stepTitle: "Hiring manager chat",
    });

    await runMergeDuplicatePostings();

    expect(await interviewThreadExists(threadId)).toBe(true);
    const merged = await getApplicationByPosting(canonical.id);
    expect(merged?.id).toBe(canonicalApp.id);
    expect(merged?.status).toBe("interviewing");
  });

  it("absorbs ranking from simplify when canonical is not ranked", async () => {
    const company = await seedCompany({ source: "oracle", boardToken: "elxb.fa.us2.oraclecloud.com|CX" });
    const canonical = await seedPosting({
      source: "oracle",
      externalId: "2000",
      companyId: company.id,
      url: "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/2000",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-rank",
      companyId: company.id,
      url: "https://elxb.fa.us2.oraclecloud.com/hcmUI/CandidateExperience/en/sites/CX/job/2000",
      rankScore: 85,
      rankEligible: true,
      rankReason: "Strong fit",
      rankLocationFit: "remote_ok",
      rankedAt: new Date("2025-06-01T12:00:00Z"),
      rankModel: "gpt-test",
      rankPromptVersion: "v1",
    });

    await runMergeDuplicatePostings();

    const row = await getPosting(canonical.id);
    expect(row?.rank_score).toBe(85);
    expect(row?.rank_eligible).toBe(true);
    expect(row?.rank_reason).toBe("Strong fit");
    expect(row?.rank_location_fit).toBe("remote_ok");
    expect(row?.rank_model).toBe("gpt-test");
    expect(row?.rank_prompt_version).toBe("v1");
    expect(row?.ranked_at).not.toBeNull();
    expect(await postingExists(simplify.id)).toBe(false);
  });
});
