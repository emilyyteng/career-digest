# Board: Accomplishment, detail pages & rewards (F08)

Index of every ticket in this feature. Each ticket file's `Status:` line is the source of truth; update this board in the same commit. Spec: [spec.md](./spec.md).

Milestones M0, M1, M2 and M4 shipped before tickets existed, so they have no ticket history here.

## M0: Quick fixes

**Milestone status:** Done

## M1: Detail pages

**Milestone status:** Done

## M2: Reflections and completion modals

**Milestone status:** Done, with open tickets

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M2-01](./tickets/M2/M2-01-merge-moves-reflections.md) | Merging duplicate postings moves reflections to the surviving application | bug | Ready | |

## M3: Recurring tasks

**Milestone status:** Not started

## M4: Global points ledger

**Milestone status:** Done, with open tickets

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M4-01](./tickets/M4/M4-01-unify-mark-applied.md) | Mark applied from Jobs has the same outcome as from Tasks | bug | Ready | Scheduled with M5; includes blocking edits on to-do-backed applications (R2.21) |
| [M4-02](./tickets/M4/M4-02-category-totals-double-reverse.md) | Category totals subtract a reversed earn twice | bug | Ready | Scheduled with M5; before M5-03 |
| [M4-03](./tickets/M4/M4-03-recomplete-earns-delta.md) | Reversed earns can be revived: re-completed tasks and re-raised LeetCode days | bug | Ready | Scheduled with M5; after or with M4-02; before M5-01 |

## M5: Weekly goals, streaks & achievements, points rules, celebration

**Milestone status:** Design

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M5-01](./tickets/M5/M5-01-lc-weekly-misc-tiers.md) | Log LeetCode as weekly or misc, by difficulty tier, through one write path | build | Draft | Open: Q32 (settle before build) |
| [M5-02](./tickets/M5/M5-02-weekly-congrats-banner.md) | Weekly targets congrats banner on Home | build | Draft | Needs R5.8, Q23; documents banner patterns in the design system |
| [M5-03](./tickets/M5/M5-03-points-by-task-category.md) | Points breakdown splits tasks by task category | build | Ready | After M4-02 |

## M6: Board departures log

**Milestone status:** Not started

## M7: Cat Cake Collection v1

**Milestone status:** Not started

## M8: Progress redesign, LeetCode tier polish, information architecture

**Milestone status:** Not started
