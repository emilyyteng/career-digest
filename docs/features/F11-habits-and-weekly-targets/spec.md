# Spec: Custom habits & weekly targets (F11)

**ID:** F11
**Status:** Draft
**Last updated:** 2026-10-15

## Problem

Daily streaks today only cover career prep (applications and LeetCode). Life focus outside those lanes has nowhere to live: no named habit to check off, no archive when priorities change, and no weekly quota for things that aren't every day (for example gym a few times a week). Stretching "daily streak" into custom frequencies would fight the existing weekly-goals model; those belong as weekly targets instead.

## Goals

- Track several **daily** personal habits alongside the existing LC and apps day streaks, with the same streak-points rules.
- Check a habit off for today in a natural place; see length and whether today counts.
- Archive a habit when it shouldn't be tracked, and restore it when it should be visible again.
- Rename a habit without turning it into a different habit: a new focus gets a **new** habit.
- Cover **non-daily** quotas (N times this week) as an extension of **weekly goals**, not as alternate streak schedules.
- Keep Seeds economy and Rules understandable: one shared daily-streak formula; no per-habit custom points in this feature.

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | Lock requirements (grilling); settle open questions that block M1–M3; **prototypes** for contested UX (daily habits strip/manage, then weekly targets as needed) | In progress |
| M1 | Daily custom habits: data, API, points hooks | Not started |
| M2 | Daily custom habits: UI (checkoff, manage, archive/restore) | Not started |
| M3 | Custom weekly targets (non-daily quotas): design lock, then data/API/UI | Not started |

M0 includes throwaway prototypes under `apps/web/src/prototype/f11-habits-and-weekly-targets/` (DEV-only routes), per `AGENTS.md` Prototypes. M1 and M2 may be merged or split further once M0 closes. M3 stays after daily habits so weekly-target design can learn from that surface.

## Requirements

### Cross-cutting

- **R.0** (Established 2026-10-15) M0 includes **prototypes** before M1–M3 build tickets: design questions named in tickets, variants that satisfy every locked requirement, DEV-only routes, cleanup before the feature closes (see `AGENTS.md` → Prototypes).
- **R.1** (Established 2026-10-15) F11 has two related expansions: (1) **multi-habit daily tracker** and (2) **custom weekly targets** for non-daily actions. They share the feature but ship in separate milestones.
- **R.2** (Established 2026-10-15) Non-daily schedules (for example "at least 3× this week") are **not** custom streak frequencies. They belong under the weekly-goals model (target count for the week, met or not).
- **R.3** (Established 2026-10-15) Daily custom habits use the **same** streak points rules as LC/apps daily streaks (F08 R5.25): daily `min(20, 2×length)` capped at 20; milestones at 5 / 10 / 20 / 30 / 50 / 100 for `5×length`; award/reverse only for today; ledger category `streak`.
- **R.4** (Established 2026-10-15) No per-habit or per-target custom point rates in F11. Shared formulas only.
- **R.5** (Established 2026-10-15) LC and apps **daily** streaks stay **derived** from existing domain actions (solves / mark applied). They are not migrated into the custom-habit checkoff store.
- **R.6** (Proposed 2026-10-15) Days are local calendar days in the user's timezone (same as F08 B2 / existing streaks). Today does not break a daily habit streak until the day ends.

### M1–M2: Daily custom habits

- **R1.1** (Established 2026-10-15) The user can have **multiple** named daily habits at once.
- **R1.2** (Established 2026-10-15) At most **5** non-archived (active) daily habits. Creating another while at the cap is rejected with a clear message.
- **R1.3** (Established 2026-10-15) Each habit has a user-set **name**.
- **R1.4** (Established 2026-10-15) **Rename** is allowed (correcting or clarifying the label of the same habit). Renaming does not reset history or start a new streak identity.
- **R1.5** (Established 2026-10-15) Each habit is a **separate identity**. A different life focus gets a **new** habit; do not repurpose an existing habit's history for a different practice. Archive the old one and create another when priorities change.
- **R1.6** (Established 2026-10-15) The user can **check off** a habit for today and **undo** today's checkoff.
- **R1.7** (Established 2026-10-15) The user can **archive** a habit (hide from active tracking) and **restore** it (make it active/visible again), within the active cap on restore.
- **R1.8** (Proposed 2026-10-15) While archived, a habit does not appear on the today strip / active list and does not earn streak points. Calendar time still advances: restoring after missed days can show a broken streak (no freeze/pause in F11).
- **R1.9** (Proposed 2026-10-15) Checkoff and points apply to **today** only. No History backfill that awards or reverses past-day habit streak points (align with F08 R5.25 timing).
- **R1.10** (Proposed 2026-10-15) Active custom habits appear with the LC/apps day-streak surface (today strip on Progress; Home if the shared strip includes them), as interactive checkoffs for customs and still display-only for derived LC/apps.
- **R1.11** (Proposed 2026-10-15) A manage surface (on Progress) supports create, rename, archive, and restore (archived list). Modals use `ModalLayer`.
- **R1.12** (Proposed 2026-10-15) Hard delete is out of v1; archive is enough. (Open if restore-from-archive and the cap need a "delete forever".)

### M3: Custom weekly targets

- **R3.1** (Established 2026-10-15) The user can define **custom weekly targets**: a name and a target count of actions for the week (for example "Gym 3"). Progress is "actions done this week" toward that number, in the same family as apps/LC weekly goals.
- **R3.2** (Proposed 2026-10-15) Custom weekly targets appear with the existing weekly goals UI (Progress weekly block and/or Home Targets), without inventing a third "frequency streak" product.
- **R3.3** (Proposed 2026-10-15) Progress toward a custom weekly target is advanced by an explicit check-in (or equivalent), not by domain tables, unless a later requirement ties a target to existing work.
- **R3.4** (Proposed 2026-10-15) Scoring for custom weekly targets follows the existing weekly-goal close model in spirit (F08 R5.9 / R5.15): points at week close, not a parallel daily-streak pay for the same actions. Exact numbers and whether the +20 / +100 schedule applies unchanged are open (Q6).
- **R3.5** (Proposed 2026-10-15) Custom weekly targets can be archived or removed from the active set when no longer wanted; details open (Q7).
- **R3.6** (Proposed 2026-10-15) Cap on how many custom weekly targets may be active (separate from the 5 daily habits); number open (Q8).

## Behavior rules

- **B1** (Established) Daily habit identity is stable: rename changes the label only; history and streak length stay with that habit.
- **B2** (Established) Switching life focus means archive (or leave idle) + create new, not renaming a habit into a different practice.
- **B3** (Established) Non-daily quotas are weekly targets, not daily streaks with custom schedules.
- **B4** (Proposed) Archived daily habits do not consume the 5-active cap.
- **B5** (Proposed) Custom daily habits never affect LC/apps qualifying days or weekly LC/apps goals.

## Current behavior

Verified by reading code (2026-10-15). No F11 requirements are implemented yet.

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| Only two daily streak kinds, `lc` and `apps`, hardcoded | [`streaks.ts`](../../../apps/api/src/streaks.ts) `StreakKind` | Conflicts R1.1 (absent) | |
| Qualifying days derived from `leetcode_daily` / `applications.applied_at`; no checkoff table | [`streaks.ts`](../../../apps/api/src/streaks.ts) | Conflicts R1.6 (absent) | |
| Streak points: daily `min(20, 2×length)`, milestones `5×length`, today-only award/reverse, category `streak` | [`streaks.ts`](../../../apps/api/src/streaks.ts), [`pointsFormulas.ts`](../../../apps/api/src/pointsFormulas.ts) | Conforms R.3 (formula exists for LC/apps) | Reuse for habits |
| `GET /progress/today` returns `streaks.lc` / `streaks.apps` only | [`progress.ts`](../../../apps/api/src/progress.ts), [`api.ts`](../../../apps/web/src/api.ts) | Conflicts R1.10 (absent) | |
| Today strip: two read-only pills (Apps, LC) | [`TodayStrip.tsx`](../../../apps/web/src/features/progress/TodayStrip.tsx) | Conflicts R1.10 (absent) | Production shows "N completed today"; F08 R5.27 asked for `+N today` streak points — display drift, not F11's to fix unless touched |
| Weekly goals: apps (tagged tasks) + LC (weekly solves) only; close pays +20/unit and +100 if met | [`weeklyGoals.ts`](../../../apps/api/src/weeklyGoals.ts), F08 R5.15 | Conflicts R3.1 (absent) | Natural extension point for M3 |
| Weekly-goal streak is display-only | F08 R5.28 | Unspecified for F11 | Custom weekly targets may or may not show a weeks-in-a-row flame (Q9) |
| No habit archive/restore UI | — | Conflicts R1.7 (absent) | Closest patterns: Tasks Completed view; jobs hide-from-board |

## Out of scope

- Custom streak **frequencies** (N×/week or specific weekdays as a streak schedule).
- Per-habit or per-target **custom point rates**.
- Migrating LC/apps daily streaks into the habit checkoff table.
- Freezing / pausing a daily habit so archived time does not break the streak (unless a later decision reverses R1.8).
- A general-purpose habit app (reminders, notifications, social, etc.).

## Open questions

Grouped by the milestone that must answer them. Nothing blocked by an open question may be implemented.

| # | Question | Blocks | Due by |
|---|----------|--------|--------|
| Q1 | Today strip layout with LC + apps + up to 5 habits: wrap on Progress only, shared Home+Progress, or customs only on Progress with a manage entry on Home? | R1.10, M2 | M0 |
| Q2 | Confirm archive semantics (R1.8): time advances and restore can show a broken streak (recommended), vs freeze while archived? | R1.8 | M0 |
| Q3 | Name length limit and empty/duplicate name rules? | R1.3, R1.4 | M0 |
| Q4 | Past-day edits for habits (display-only History) in F11, or today-only forever? | R1.9 | M0 / M1 |
| Q5 | How does the user record one "action" toward a custom weekly target? Simple +1/−1 stepper, checklist of sessions, or something else? | R3.3 | M0 / M3 design |
| Q6 | Do custom weekly targets use the same week-close points as apps/LC (+20/unit, +100 if met), a reduced schedule, or progress-only (no Seeds)? | R3.4 | M0 / M3 design |
| Q7 | Archive vs delete for custom weekly targets; do targets and target numbers carry week to week like LC? | R3.5, R3.1 | M0 / M3 design |
| Q8 | Cap on active custom weekly targets? | R3.6 | M0 / M3 design |
| Q9 | Do custom weekly targets get a display-only weeks-in-a-row streak (like F08 R5.28)? | — | M3 design |
| Q10 | Should creating a daily habit and a weekly target with the same name be allowed (separate namespaces)? | R1.5, R3.1 | M0 |
| Q11 | Feature display name in the UI ("Habits", "Daily habits", …)? | M2 | M0 |

## Resolved questions

<details>
<summary>Resolved questions (5)</summary>

| # | Question | Answer (date) | Now in |
|---|----------|---------------|--------|
| Q0a | One custom streak vs many? | Multiple daily habits (2026-10-15) | R1.1 |
| Q0b | Points for daily customs? | Same as LC/apps R5.25 (2026-10-15) | R.3 |
| Q0c | Active cap? | 5 is enough (2026-10-15) | R1.2 |
| Q0d | Non-daily frequency as streak schedules? | No — extend weekly goals instead (2026-10-15) | R.2, R3.1 |
| Q0e | Rename vs new identity? | Rename OK for the same habit; new focus = new habit (2026-10-15) | R1.4, R1.5, B1, B2 |

</details>

## Decisions log

- **2026-10-15:** Scope is multi-habit **daily** tracker (not a single custom streak), same points as LC/apps, max 5 active habits, rename allowed but habits are not reused for different practices.
- **2026-10-15:** Non-daily actions (e.g. gym a few times a week) are an extension of **weekly goals**, not custom streak frequencies. F11 covers both expansions across milestones (daily habits first; custom weekly targets after).
- **2026-10-15:** Per-habit custom points deferred / out of scope for F11 to avoid Rules and economy complexity.
- **2026-10-15:** LC/apps daily streaks remain derived; customs use stored checkoffs (Proposed plumbing; formula Established).
- **2026-10-15:** M0 includes prototypes (R.0), not grilling/docs alone.
