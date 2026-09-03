import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { loadRankContext } from "./rankContext.js";
import { apiClient } from "./test/apiClient.js";
import { getFeedbackByPosting, seedCompany, seedRankedPosting } from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

describe.skipIf(!integrationReady)("rank context feedback filtering", () => {
  it("omits quiet Hide-from-board dismissals from dismissed examples", async () => {
    const company = await seedCompany({ name: "Filter Co" });
    const teaching = await seedRankedPosting({
      source: "greenhouse",
      externalId: "rank-ctx-teach",
      companyId: company.id,
      title: "Teaching Mismatch Role",
      url: "https://boards.greenhouse.io/filter/jobs/1",
    });
    const quiet = await seedRankedPosting({
      source: "greenhouse",
      externalId: "rank-ctx-quiet",
      companyId: company.id,
      title: "Quiet Hide Role",
      url: "https://boards.greenhouse.io/filter/jobs/2",
    });

    await apiClient()
      .post(`/api/jobs/${teaching.id}/feedback`)
      .send({ kind: "dismiss", note: "Wrong domain", teach: true })
      .expect(201);
    await apiClient()
      .post(`/api/jobs/${quiet.id}/feedback`)
      .send({ kind: "dismiss", teach: false })
      .expect(201);

    expect(await getFeedbackByPosting(quiet.id)).toMatchObject({ teach: false });

    const context = await loadRankContext(pool);
    const titles = context.dismissals.map((row) => row.title);
    expect(titles).toContain("Teaching Mismatch Role");
    expect(titles).not.toContain("Quiet Hide Role");
  });
});
