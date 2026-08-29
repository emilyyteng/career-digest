import { describe, expect, it } from "vitest";
import { apiClient } from "./test/apiClient.js";
import {
  seedApplication,
  seedCompany,
  seedRankedPosting,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("home API", () => {
  it("GET /api/home returns job picks without todo applications", async () => {
    const company = await seedCompany({ name: "Home Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "home-ranked-1",
      companyId: company.id,
      title: "Strategy Intern",
      url: "https://boards.greenhouse.io/home/jobs/1",
      rankScore: 95,
    });
    await seedApplication({ postingId: posting.id, status: "todo" });

    const res = await apiClient().get("/api/home").expect(200);

    expect(res.body.todo).toBeUndefined();
    expect(res.body.todoTotal).toBeUndefined();
    expect(
      res.body.newAndTopPicks.topRanked.some((job: { id: string }) => job.id === posting.id),
    ).toBe(true);
    expect(res.body.newAndTopPicks.topRanked[0]).toMatchObject({
      id: posting.id,
      title: "Strategy Intern",
      company: "Home Co",
    });
  });
});
