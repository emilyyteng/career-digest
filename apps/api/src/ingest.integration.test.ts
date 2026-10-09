import { describe, expect, it } from "vitest";
import { dropUntrackedRejected, reconcileRemovedFromBoard } from "./ingest.js";
import { pool } from "./db.js";
import { integrationReady } from "./test/integrationSetup.js";
import {
  getPosting,
  postingExists,
  seedApplication,
  seedCompany,
  seedPosting,
  seedTask,
} from "./test/dbHarness.js";

describe.skipIf(!integrationReady)("ingest retention", () => {
  it("reconcile retains applied postings missing from seenIds", async () => {
    const company = await seedCompany({ source: "simplify", boardToken: "listings" });
    const posting = await seedPosting({
      source: "simplify",
      externalId: "gone-from-simplify",
      companyId: company.id,
      url: "https://careers.example.com/job/1",
      title: "Software Engineer Intern",
      location: "New York, NY",
    });
    await seedApplication({ postingId: posting.id, status: "applied" });

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

  it("reconcile deletes open application tasks and todo apps when posting leaves", async () => {
    const company = await seedCompany({ source: "simplify", boardToken: "listings-todo-gone" });
    const posting = await seedPosting({
      source: "simplify",
      externalId: "gone-with-todo-task",
      companyId: company.id,
      url: "https://careers.example.com/job/3",
      title: "Software Engineer Intern",
      location: "Austin, TX",
    });
    const app = await seedApplication({ postingId: posting.id, status: "todo" });
    const task = await seedTask({
      category: "application",
      title: "Apply to Example",
      organization: "Example",
      postingId: posting.id,
      applicationId: app.id,
    });

    const result = await reconcileRemovedFromBoard(company.id, ["still-on-board"]);

    expect(result.deleted).toBe(1);
    expect(result.retained).toBe(0);
    expect(await postingExists(posting.id)).toBe(false);

    const tasks = await pool.query(`SELECT id FROM tasks WHERE id = $1`, [task.id]);
    expect(tasks.rowCount).toBe(0);
    const apps = await pool.query(`SELECT id FROM applications WHERE id = $1`, [app.id]);
    expect(apps.rowCount).toBe(0);
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
