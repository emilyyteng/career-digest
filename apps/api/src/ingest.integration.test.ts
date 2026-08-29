import { describe, expect, it } from "vitest";
import { dropUntrackedRejected, reconcileRemovedFromBoard } from "./ingest.js";
import { integrationReady } from "./test/integrationSetup.js";
import {
  getPosting,
  postingExists,
  seedApplication,
  seedCompany,
  seedPosting,
} from "./test/dbHarness.js";

describe.skipIf(!integrationReady)("ingest retention", () => {
  it("reconcile retains tracked postings missing from seenIds", async () => {
    const company = await seedCompany({ source: "simplify", boardToken: "listings" });
    const posting = await seedPosting({
      source: "simplify",
      externalId: "gone-from-simplify",
      companyId: company.id,
      url: "https://careers.example.com/job/1",
      title: "Software Engineer Intern",
      location: "New York, NY",
    });
    await seedApplication({ postingId: posting.id, status: "todo" });

    const result = await reconcileRemovedFromBoard(company.id, ["other-id"]);

    expect(result.deleted).toBe(0);
    expect(result.retained).toBe(1);
    expect(await postingExists(posting.id)).toBe(true);
    const row = await getPosting(posting.id);
    expect(row?.removed_from_board_at).not.toBeNull();
  });

  it("reconcile deletes untracked postings missing from seenIds", async () => {
    const company = await seedCompany({ source: "simplify", boardToken: "listings-retain" });
    const posting = await seedPosting({
      source: "simplify",
      externalId: "gone-no-app",
      companyId: company.id,
      url: "https://careers.example.com/job/2",
      title: "Software Engineer Intern",
      location: "New York, NY",
    });

    const result = await reconcileRemovedFromBoard(company.id, ["other-id"]);

    expect(result.deleted).toBe(1);
    expect(result.retained).toBe(0);
    expect(await postingExists(posting.id)).toBe(false);
  });

  it("dropUntrackedRejected removes expired intern terms without applications", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "stale-board" });
    const posting = await seedPosting({
      source: "greenhouse",
      externalId: "summer-2025",
      companyId: company.id,
      url: "https://boards.greenhouse.io/stale/jobs/1",
      title: "Summer 2025 Engineering Intern",
      location: "Boston, MA",
    });

    const dropped = await dropUntrackedRejected(company.id);

    expect(dropped).toBe(1);
    expect(await postingExists(posting.id)).toBe(false);
  });
});
