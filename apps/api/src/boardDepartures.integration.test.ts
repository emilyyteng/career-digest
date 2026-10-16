import { describe, expect, it } from "vitest";
import { purgeExpiredBoardDepartures } from "./boardDepartures.js";
import { pool } from "./db.js";
import { dropUntrackedRejected, reconcileRemovedFromBoard } from "./ingest.js";
import { runMergeDuplicatePostings } from "./mergeDuplicatePostings.js";
import { integrationReady } from "./test/integrationSetup.js";
import {
  seedApplication,
  seedCompany,
  seedPosting,
  seedTask,
} from "./test/dbHarness.js";

type DepartureRow = {
  title: string;
  company: string;
  location: string | null;
  reason: string;
  task_removed: boolean;
  posting_id: string | null;
  departed_on: string;
};

async function listDepartures(): Promise<DepartureRow[]> {
  const { rows } = await pool.query<DepartureRow>(
    `SELECT title, company, location, reason, task_removed, posting_id,
            departed_on::text AS departed_on
     FROM board_departures
     ORDER BY title, reason`,
  );
  return rows;
}

describe.skipIf(!integrationReady)("board departures (M6-01)", () => {
  it("logs left_board with task_removed when an open application task is deleted", async () => {
    const company = await seedCompany({
      source: "simplify",
      boardToken: "dep-todo-gone",
      name: "Fallback Co",
    });
    const posting = await seedPosting({
      source: "simplify",
      externalId: "dep-with-task",
      companyId: company.id,
      url: "https://careers.example.com/job/dep-1",
      title: "Intern A",
      location: "Seattle, WA",
      department: "Acme Labs",
    });
    const app = await seedApplication({ postingId: posting.id, status: "todo" });
    await seedTask({
      category: "application",
      title: "Apply to Intern A",
      postingId: posting.id,
      applicationId: app.id,
    });

    await reconcileRemovedFromBoard(company.id, ["still-here"]);

    const rows = await listDepartures();
    expect(rows).toEqual([
      expect.objectContaining({
        title: "Intern A",
        company: "Acme Labs",
        location: "Seattle, WA",
        reason: "left_board",
        task_removed: true,
        posting_id: posting.id,
      }),
    ]);
  });

  it("logs left_board without task_removed when no open application task", async () => {
    const company = await seedCompany({
      source: "greenhouse",
      boardToken: "dep-no-task",
      name: "Green Co",
    });
    await seedPosting({
      source: "greenhouse",
      externalId: "dep-bare",
      companyId: company.id,
      url: "https://boards.greenhouse.io/green/jobs/1",
      title: "Intern B",
      location: "Remote",
    });

    await reconcileRemovedFromBoard(company.id, []);

    const rows = await listDepartures();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      title: "Intern B",
      company: "Green Co",
      reason: "left_board",
      task_removed: false,
    });
  });

  it("does not log when an applied posting is retained", async () => {
    const company = await seedCompany({
      source: "simplify",
      boardToken: "dep-applied",
    });
    const posting = await seedPosting({
      source: "simplify",
      externalId: "dep-applied",
      companyId: company.id,
      url: "https://careers.example.com/job/dep-applied",
      title: "Intern Applied",
    });
    await seedApplication({ postingId: posting.id, status: "applied" });

    await reconcileRemovedFromBoard(company.id, ["other"]);

    expect(await listDepartures()).toEqual([]);
  });

  it("does not log filter-reject deletes", async () => {
    const company = await seedCompany({
      source: "greenhouse",
      boardToken: "dep-filter",
    });
    await seedPosting({
      source: "greenhouse",
      externalId: "summer-2025-stale",
      companyId: company.id,
      url: "https://boards.greenhouse.io/stale/jobs/9",
      title: "Summer 2025 Engineering Intern",
      location: "Boston, MA",
    });

    const dropped = await dropUntrackedRejected(company.id);
    expect(dropped).toBe(1);
    expect(await listDepartures()).toEqual([]);
  });

  it("logs duplicate with task_removed false when the open task is only repointed", async () => {
    const company = await seedCompany({ source: "greenhouse", boardToken: "dep-merge" });
    const canonical = await seedPosting({
      source: "greenhouse",
      externalId: "555",
      companyId: company.id,
      url: "https://boards.greenhouse.io/dep-merge/jobs/555",
      title: "Canonical Intern",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-dep-merge",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=555",
      title: "Simplify Dup Intern",
      department: "Dup Co",
      location: "NYC",
    });
    await seedTask({
      category: "application",
      title: "Apply via Simplify",
      postingId: simplify.id,
    });

    await runMergeDuplicatePostings();

    const rows = await listDepartures();
    expect(rows).toEqual([
      expect.objectContaining({
        title: "Simplify Dup Intern",
        company: "Dup Co",
        location: "NYC",
        reason: "duplicate",
        task_removed: false,
        posting_id: simplify.id,
      }),
    ]);

    const tasks = await pool.query<{ posting_id: string }>(
      `SELECT posting_id::text AS posting_id FROM tasks WHERE title = 'Apply via Simplify'`,
    );
    expect(tasks.rows[0]?.posting_id).toBe(canonical.id);
  });

  it("does not log duplicate when the Simplify posting already has an applied application", async () => {
    const company = await seedCompany({
      source: "greenhouse",
      boardToken: "dep-merge-applied",
    });
    await seedPosting({
      source: "greenhouse",
      externalId: "777",
      companyId: company.id,
      url: "https://boards.greenhouse.io/dep-merge-applied/jobs/777",
    });
    const simplify = await seedPosting({
      source: "simplify",
      externalId: "simp-dep-applied",
      companyId: company.id,
      url: "https://boards.greenhouse.io/embed/job_app?token=777",
      title: "Applied Dup",
    });
    await seedApplication({ postingId: simplify.id, status: "applied" });

    await runMergeDuplicatePostings();

    expect(await listDepartures()).toEqual([]);
  });

  it("purgeExpiredBoardDepartures drops rows older than yesterday UTC and keeps recent ones", async () => {
    const company = await seedCompany({
      source: "greenhouse",
      boardToken: "dep-purge",
      name: "Purge Co",
    });
    await seedPosting({
      source: "greenhouse",
      externalId: "dep-purge-fresh",
      companyId: company.id,
      url: "https://boards.greenhouse.io/purge/jobs/1",
      title: "Fresh Departed",
    });
    await reconcileRemovedFromBoard(company.id, []);

    await pool.query(
      `INSERT INTO board_departures (title, company, location, reason, task_removed, departed_on)
       VALUES ('Stale Departed', 'Purge Co', NULL, 'left_board', false,
               ((now() AT TIME ZONE 'UTC')::date - 2))`,
    );

    const before = await listDepartures();
    expect(before.map((r) => r.title).sort()).toEqual(["Fresh Departed", "Stale Departed"]);

    const purged = await purgeExpiredBoardDepartures(pool);
    expect(purged).toBe(1);

    const after = await listDepartures();
    expect(after).toHaveLength(1);
    expect(after[0]?.title).toBe("Fresh Departed");
  });
});
