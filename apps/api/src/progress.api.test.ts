import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { apiClient } from "./test/apiClient.js";
import {
  seedApplication,
  seedCompany,
  seedLeetcodeDaily,
  seedRankedPosting,
  seedReflectionLog,
} from "./test/dbHarness.js";
import { integrationReady } from "./test/integrationSetup.js";

const TZ = "America/Los_Angeles";
const FIXED_NOW = new Date("2025-08-10T20:00:00.000Z");

describe.skipIf(!integrationReady)("progress API", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(FIXED_NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });
  it("GET /api/progress/today uses tz for local calendar day", async () => {
    const company = await seedCompany();
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "prog-app-1",
      companyId: company.id,
      url: "https://boards.greenhouse.io/acme/jobs/1",
    });
    await seedApplication({
      postingId: posting.id,
      appliedAt: new Date("2025-08-10T20:00:00.000Z"),
    });
    await seedLeetcodeDaily("2025-08-10", 2);
    await seedReflectionLog({
      lane: "technical",
      body: "Worked through DP",
      createdAt: new Date("2025-08-10T21:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/today")
      .query({ tz: TZ })
      .expect(200);

    expect(res.body.localDate).toBe("2025-08-10");
    expect(res.body.applications).toMatchObject({ raw: 1, earned: 1, cap: 5 });
    expect(res.body.leetcode).toMatchObject({ raw: 2, earned: 2, cap: 5 });
    expect(res.body.deepWork).toBe(true);
  });

  it("GET /api/progress/heatmap returns earned credit capped at 5", async () => {
    const company = await seedCompany();
    for (let i = 0; i < 7; i += 1) {
      const posting = await seedRankedPosting({
        source: "greenhouse",
        externalId: `prog-heat-${i}`,
        companyId: company.id,
        url: `https://boards.greenhouse.io/acme/jobs/${i + 10}`,
      });
      await seedApplication({
        postingId: posting.id,
        appliedAt: new Date(`2025-08-10T${10 + i}:00:00.000Z`),
      });
    }

    const res = await apiClient()
      .get("/api/progress/heatmap")
      .query({ tz: TZ, lane: "application", days: 30 })
      .expect(200);

    const day = res.body.days.find((row: { date: string }) => row.date === "2025-08-10");
    expect(day).toMatchObject({ raw: 7, earned: 5, effort: false });
  });

  it("PATCH /api/progress/leetcode sets and increments daily count", async () => {
    await apiClient()
      .patch("/api/progress/leetcode")
      .query({ tz: TZ })
      .send({ count: 3 })
      .expect(200);

    const bumped = await apiClient()
      .patch("/api/progress/leetcode")
      .query({ tz: TZ })
      .send({ delta: 2 })
      .expect(200);

    expect(bumped.body.count).toBe(5);
  });

  it("POST /api/progress/reflections creates effort entry", async () => {
    const res = await apiClient()
      .post("/api/progress/reflections")
      .send({ lane: "application", body: "Drafted project story" })
      .expect(201);

    expect(res.body).toMatchObject({
      lane: "application",
      body: "Drafted project story",
    });
  });

  it("GET /api/progress/outcome aggregates week totals", async () => {
    await seedLeetcodeDaily("2025-08-10", 1);
    await seedLeetcodeDaily("2025-08-11", 2);
    await seedReflectionLog({
      lane: "application",
      body: "Research",
      createdAt: new Date("2025-08-10T18:00:00.000Z"),
    });
    await seedReflectionLog({
      lane: "technical",
      body: "Trees review",
      createdAt: new Date("2025-08-11T18:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/outcome")
      .query({ tz: TZ, period: "week", date: "2025-08-10" })
      .expect(200);

    expect(res.body).toMatchObject({
      period: "week",
      leetcodeSolves: 3,
      deepWorkUnits: 2,
    });
    expect(res.body.startDate).toBe("2025-08-10");
    expect(res.body.endDate).toBe("2025-08-16");
  });

  it("GET /api/progress/day returns 400 for impossible calendar dates", async () => {
    await apiClient()
      .get("/api/progress/day/2025-02-30")
      .query({ tz: TZ })
      .expect(400);
  });

  it("GET /api/progress/heatmap defaults days when query is non-numeric", async () => {
    const res = await apiClient()
      .get("/api/progress/heatmap")
      .query({ tz: TZ, lane: "technical", days: "abc" })
      .expect(200);

    expect(res.body.days.length).toBeGreaterThan(0);
  });

  it("GET /api/progress/day returns drill-down for a date", async () => {
    const company = await seedCompany({ name: "Prog Co" });
    const posting = await seedRankedPosting({
      source: "greenhouse",
      externalId: "prog-day-1",
      companyId: company.id,
      title: "Intern",
      url: "https://boards.greenhouse.io/acme/jobs/99",
    });
    const app = await seedApplication({
      postingId: posting.id,
      appliedAt: new Date("2025-08-12T18:00:00.000Z"),
    });
    await seedLeetcodeDaily("2025-08-12", 4);
    await seedReflectionLog({
      lane: "application",
      body: "Tailored cover letter",
      applicationId: app.id,
      createdAt: new Date("2025-08-12T19:00:00.000Z"),
    });

    const res = await apiClient()
      .get("/api/progress/day/2025-08-12")
      .query({ tz: TZ })
      .expect(200);

    expect(res.body.applications).toMatchObject({ raw: 1, earned: 1 });
    expect(res.body.leetcode).toMatchObject({ raw: 4, earned: 4 });
    expect(res.body.deepWork).toBe(true);
    expect(res.body.applicationRows).toHaveLength(1);
    expect(res.body.reflections).toHaveLength(1);
  });
});
