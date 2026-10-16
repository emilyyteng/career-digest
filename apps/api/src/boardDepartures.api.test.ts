import { describe, expect, it } from "vitest";
import { pool } from "./db.js";
import { addCivilDays } from "./homeUpcoming.js";
import { localDateInTimezone } from "./progress.js";
import { apiClient } from "./test/apiClient.js";
import { integrationReady } from "./test/integrationSetup.js";

async function insertDeparture(input: {
  title: string;
  company?: string;
  location?: string | null;
  reason: "left_board" | "duplicate";
  taskRemoved?: boolean;
  departedAt: string;
}): Promise<string> {
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO board_departures (
       title, company, location, reason, task_removed, departed_at, departed_on
     )
     VALUES ($1, $2, $3, $4, $5, $6::timestamptz, (($6::timestamptz AT TIME ZONE 'UTC')::date))
     RETURNING id::text AS id`,
    [
      input.title,
      input.company ?? "Co",
      input.location ?? null,
      input.reason,
      input.taskRemoved ?? false,
      input.departedAt,
    ],
  );
  return rows[0]!.id;
}

async function countDepartures(): Promise<number> {
  const { rows } = await pool.query<{ n: string }>(
    `SELECT COUNT(*)::text AS n FROM board_departures`,
  );
  return Number(rows[0]?.n ?? 0);
}

describe.skipIf(!integrationReady)("GET /api/ops/board-departures (M6-02)", () => {
  it("returns an empty days list when there are no departures", async () => {
    const res = await apiClient()
      .get("/api/ops/board-departures")
      .query({ tz: "UTC" })
      .expect(200);

    expect(res.body.tz).toBe("UTC");
    expect(res.body.localDate).toBe(localDateInTimezone(new Date(), "UTC"));
    expect(res.body.days).toEqual([]);
  });

  it("groups by local day with reason labels, taskRemoved, and taskRemovedCount", async () => {
    const tz = "UTC";
    const today = localDateInTimezone(new Date(), tz);
    const yesterday = addCivilDays(today, -1);

    await insertDeparture({
      title: "Today Task Gone",
      reason: "left_board",
      taskRemoved: true,
      location: "Austin, TX",
      company: "Acme",
      departedAt: `${today}T18:00:00.000Z`,
    });
    await insertDeparture({
      title: "Today Dup",
      reason: "duplicate",
      taskRemoved: false,
      departedAt: `${today}T12:00:00.000Z`,
    });
    await insertDeparture({
      title: "Yesterday Bare",
      reason: "left_board",
      taskRemoved: false,
      departedAt: `${yesterday}T15:00:00.000Z`,
    });

    const res = await apiClient()
      .get("/api/ops/board-departures")
      .query({ tz })
      .expect(200);

    expect(res.body.days).toHaveLength(2);
    expect(res.body.days[0]).toMatchObject({
      date: today,
      taskRemovedCount: 1,
    });
    expect(res.body.days[0].rows).toEqual([
      expect.objectContaining({
        title: "Today Task Gone",
        company: "Acme",
        location: "Austin, TX",
        reason: "left_board",
        reasonLabel: "Left board",
        taskRemoved: true,
      }),
      expect.objectContaining({
        title: "Today Dup",
        reason: "duplicate",
        reasonLabel: "Duplicate",
        taskRemoved: false,
      }),
    ]);
    expect(res.body.days[1]).toMatchObject({
      date: yesterday,
      taskRemovedCount: 0,
      rows: [
        expect.objectContaining({
          title: "Yesterday Bare",
          reasonLabel: "Left board",
          taskRemoved: false,
        }),
      ],
    });
  });

  it("filters retention by browser TZ day and does not purge on read", async () => {
    const tz = "America/Los_Angeles";
    const todayLa = localDateInTimezone(new Date(), tz);
    const yesterdayLa = addCivilDays(todayLa, -1);
    const twoDaysAgoLa = addCivilDays(todayLa, -2);

    await insertDeparture({
      title: "In window",
      reason: "left_board",
      departedAt: `${yesterdayLa}T20:00:00.000Z`,
    });
    // Noon UTC on todayLa is morning in LA → same local day.
    await insertDeparture({
      title: "Today LA",
      reason: "left_board",
      departedAt: `${todayLa}T19:00:00.000Z`,
    });
    // Before 07:00 UTC in PDT (UTC−7), civil date in LA is still yesterday.
    await insertDeparture({
      title: "UTC morning / LA previous evening",
      reason: "duplicate",
      departedAt: `${todayLa}T06:00:00.000Z`,
    });
    await insertDeparture({
      title: "Too old for TZ window",
      reason: "duplicate",
      departedAt: `${twoDaysAgoLa}T20:00:00.000Z`,
    });

    const before = await countDepartures();
    expect(before).toBe(4);

    const res = await apiClient()
      .get("/api/ops/board-departures")
      .query({ tz })
      .expect(200);

    expect(await countDepartures()).toBe(before);

    const titles = res.body.days.flatMap((d: { rows: { title: string }[] }) =>
      d.rows.map((r) => r.title),
    );
    expect(titles.sort()).toEqual(
      ["In window", "Today LA", "UTC morning / LA previous evening"].sort(),
    );
    expect(titles).not.toContain("Too old for TZ window");

    const morningRow = res.body.days
      .flatMap((d: { date: string; rows: { title: string }[] }) =>
        d.rows.map((r) => ({ date: d.date, title: r.title })),
      )
      .find((r: { title: string }) => r.title === "UTC morning / LA previous evening");
    expect(morningRow?.date).toBe(yesterdayLa);

    const todayRow = res.body.days
      .flatMap((d: { date: string; rows: { title: string }[] }) =>
        d.rows.map((r) => ({ date: d.date, title: r.title })),
      )
      .find((r: { title: string }) => r.title === "Today LA");
    expect(todayRow?.date).toBe(todayLa);
  });

  it("rejects missing or invalid tz", async () => {
    await apiClient().get("/api/ops/board-departures").expect(400);
    await apiClient()
      .get("/api/ops/board-departures")
      .query({ tz: "Not/AZone" })
      .expect(400);
  });
});
