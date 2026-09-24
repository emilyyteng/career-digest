import { describe, expect, it } from "vitest";
import {
  addCivilDays,
  buildFlatSectionItems,
  buildUpcomingGroups,
  interviewStepAt,
  keepEarliestSubtaskPerParent,
  upcomingDayLabel,
  type HomeUpcomingItem,
} from "./homeUpcoming.js";

const TZ = "America/Los_Angeles";

function item(partial: Partial<HomeUpcomingItem> & { at: string }): HomeUpcomingItem {
  return {
    kind: "task",
    id: partial.id ?? "t1",
    title: partial.title ?? "Task",
    categoryName: "Admin",
    deadlineLabel: "Due",
    dueKind: "deadline",
    priority: null,
    estimateMinutes: null,
    ...partial,
  };
}

describe("homeUpcoming helpers", () => {
  it("labels today / tomorrow / weekday · date", () => {
    expect(upcomingDayLabel("2026-09-22", "2026-09-22")).toBe("Today");
    expect(upcomingDayLabel("2026-09-23", "2026-09-22")).toBe("Tomorrow");
    expect(upcomingDayLabel("2026-09-25", "2026-09-22")).toBe("Friday · Sep 25");
  });

  it("addCivilDays crosses months", () => {
    expect(addCivilDays("2026-09-29", 3)).toBe("2026-10-02");
  });

  it("interviewStepAt prefers scheduled_at when status is scheduled", () => {
    expect(
      interviewStepAt({
        status: "scheduled",
        dueAt: "2026-09-22T10:00:00.000Z",
        scheduledAt: "2026-09-22T18:00:00.000Z",
      }),
    ).toBe("2026-09-22T18:00:00.000Z");
    expect(
      interviewStepAt({
        status: "pending",
        dueAt: "2026-09-22T10:00:00.000Z",
        scheduledAt: null,
      }),
    ).toBe("2026-09-22T10:00:00.000Z");
  });

  it("buildUpcomingGroups puts overdue first, then local days with items only", () => {
    // 2026-09-22 17:00 UTC = 10:00 America/Los_Angeles
    const now = new Date("2026-09-22T17:00:00.000Z");
    const groups = buildUpcomingGroups(
      [
        item({ id: "over", at: "2026-09-20T12:00:00.000Z", title: "Overdue task" }),
        item({ id: "today-am", at: "2026-09-22T15:00:00.000Z", title: "Past this morning" }),
        item({ id: "today-pm", at: "2026-09-23T02:00:00.000Z", title: "Later today PT" }),
        item({ id: "thu", at: "2026-09-25T18:00:00.000Z", title: "Thursday" }),
        item({ id: "far", at: "2026-10-05T18:00:00.000Z", title: "Too far" }),
        item({
          kind: "interview",
          threadId: "th1",
          stepId: "s1",
          at: "2026-09-24T18:00:00.000Z",
          company: "Acme",
          primaryTitle: "Intern",
          stepTitle: "Phone",
          deadlineLabel: "Scheduled",
          priority: null,
          estimateMinutes: null,
        }),
      ],
      now,
      TZ,
    );

    expect(groups.map((g) => g.key)).toEqual(["overdue", "2026-09-22", "2026-09-24", "2026-09-25"]);
    expect(groups[0]!.label).toBe("Overdue");
    expect(groups[0]!.items.map((i) => i.id ?? i.stepId)).toEqual(["over", "today-am"]);
    expect(groups[1]!.label).toBe("Today");
    expect(groups[1]!.items[0]!.id).toBe("today-pm");
    expect(groups[2]!.label).toBe("Thursday · Sep 24");
    expect(groups[2]!.items[0]!.kind).toBe("interview");
    expect(groups[3]!.label).toBe("Friday · Sep 25");
  });

  it("sorts by due then priority within a group", () => {
    const now = new Date("2026-09-22T00:00:00.000Z");
    const groups = buildUpcomingGroups(
      [
        item({ id: "p2", at: "2026-09-23T12:00:00.000Z", priority: 2 }),
        item({ id: "p0", at: "2026-09-23T12:00:00.000Z", priority: 0 }),
        item({ id: "none", at: "2026-09-23T12:00:00.000Z", priority: null }),
        item({ id: "later", at: "2026-09-23T18:00:00.000Z", priority: 0 }),
      ],
      now,
      "UTC",
    );
    expect(groups[0]!.items.map((i) => i.id)).toEqual(["p0", "p2", "none", "later"]);
  });

  it("buildFlatSectionItems is overdue then by date within the week", () => {
    const now = new Date("2026-09-22T17:00:00.000Z");
    const items = buildFlatSectionItems(
      [
        item({ id: "over", at: "2026-09-20T12:00:00.000Z", dueKind: "deadline" }),
        item({ id: "today", at: "2026-09-23T02:00:00.000Z", dueKind: "deadline" }),
        item({ id: "far", at: "2026-10-05T18:00:00.000Z", dueKind: "deadline" }),
        item({ id: "target", at: "2026-09-24T18:00:00.000Z", dueKind: "target" }),
      ],
      now,
      TZ,
    );
    expect(items.map((i) => i.id)).toEqual(["over", "today", "target"]);
  });

  it("buildUpcomingGroups includes Overdue then Today / Tomorrow labels", () => {
    const now = new Date("2026-09-22T17:00:00.000Z"); // Tue 10:00 PT
    const groups = buildUpcomingGroups(
      [
        item({ id: "over", at: "2026-09-20T12:00:00.000Z" }),
        item({ id: "today", at: "2026-09-23T02:00:00.000Z" }),
        item({ id: "tmw", at: "2026-09-23T20:00:00.000Z" }),
      ],
      now,
      TZ,
    );
    expect(groups.map((g) => g.label)).toEqual(["Overdue", "Today", "Tomorrow"]);
  });

  it("keepEarliestSubtaskPerParent keeps only the soonest subtask per parent", () => {
    const kept = keepEarliestSubtaskPerParent([
      item({
        kind: "subtask",
        id: "parent-1",
        parentId: "parent-1",
        subtaskId: "s-late",
        title: "Step 2",
        at: "2026-09-25T18:00:00.000Z",
        dueKind: "target",
      }),
      item({
        kind: "subtask",
        id: "parent-1",
        parentId: "parent-1",
        subtaskId: "s-early",
        title: "Step 1",
        at: "2026-09-23T18:00:00.000Z",
        dueKind: "target",
      }),
      item({
        kind: "subtask",
        id: "parent-2",
        parentId: "parent-2",
        subtaskId: "s-other",
        title: "Only step",
        at: "2026-09-24T18:00:00.000Z",
        dueKind: "target",
      }),
      item({
        kind: "task",
        id: "solo",
        title: "Parent task with date",
        at: "2026-09-24T12:00:00.000Z",
        dueKind: "target",
      }),
    ]);
    expect(
      kept
        .filter((i) => i.kind === "subtask")
        .map((i) => i.subtaskId)
        .sort(),
    ).toEqual(["s-early", "s-other"]);
    expect(kept.some((i) => i.id === "solo")).toBe(true);
  });
});
