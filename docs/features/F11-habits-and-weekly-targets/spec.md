# Spec: Custom habits & weekly targets (F11)

**ID:** F11
**Status:** Active
**Last updated:** 2026-10-16 (M1 Done — customs schema, streaks/points, HTTP + today payload)

## Problem

Daily streaks today only cover career prep (applications and LeetCode). Life focus outside those lanes has nowhere to live: no named habit to check off, no archive when priorities change, and no weekly quota for things that aren't every day (for example gym a few times a week). Stretching "daily streak" into custom frequencies would fight the existing weekly-goals model; those belong as weekly targets instead.

## Goals

- Track several **daily** personal habits alongside the existing LC and apps day streaks, with the same streak-points rules.
- Check a habit off for today in a natural place; see length and whether today counts.
- Archive a habit when it shouldn't be tracked, and restore it when it should be visible again.
- Rename a habit without turning it into a different habit: a new focus gets a **new** habit.
- Cover **non-daily** quotas (N times this week) as an extension of **weekly goals**, not as alternate streak schedules.
- Make Progress → **This week** the habits hub (daily strip + weekly goals + weekly incrementer), with a design-system-sized layout.
- Keep Seeds economy and Rules understandable: one shared daily-streak formula; no per-habit custom points in this feature.

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | Lock requirements (done in grilling); **prototypes** for contested UX (habits strip → weekly column + incrementer) | Done |
| M1 | Daily custom habits: data, API, points hooks | Done |
| M2 | Daily habits UI + This week / Home strip remodel (checkoff, archive, reflection pencil, today-LC home from prototype verdict) | Done |
| M3 | Custom weekly targets: data/API/UI (Progress weekly column, incrementer, Home Targets) | Not started |

M0 prototypes live under `apps/web/src/prototype/f11-habits-and-weekly-targets/` (DEV-only routes), per `AGENTS.md` Prototypes. Sequence: **(1)** Habits strip (Home + Progress), **(2)** weekly goals column + multi-goal incrementer + Home Targets mock. M3 follows daily habits so weekly design can learn from that surface.

## Requirements

### Cross-cutting

- **R.0** (Established 2026-10-15) M0 includes **prototypes** before M1–M3 build tickets: design questions named in tickets, variants that satisfy every locked requirement, DEV-only routes, cleanup before the feature closes (see `AGENTS.md` → Prototypes).
- **R.1** (Established 2026-10-15) F11 has two related expansions: (1) **multi-habit daily tracker** and (2) **custom weekly targets** for non-daily actions. They share the feature but ship in separate milestones.
- **R.2** (Established 2026-10-15) Non-daily schedules (for example "at least 3× this week") are **not** custom streak frequencies. They belong under the weekly-goals model (target count for the week, met or not).
- **R.3** (Established 2026-10-15) Daily custom habits use the **same** streak points rules as LC/apps daily streaks (F08 R5.25): daily `min(20, 2×length)` capped at 20; milestones at 5 / 10 / 20 / 30 / 50 / 100 for `5×length`; award/reverse only for today; ledger category `streak`.
- **R.4** (Established 2026-10-15) No per-habit or per-target custom point rates in F11. Shared formulas only.
- **R.5** (Established 2026-10-15) LC and apps **daily** streaks stay **derived** from existing domain actions (solves / mark applied). They are not migrated into the custom-habit checkoff store. They never get pencil / archive; they always live in the Active strip view.
- **R.6** (Established 2026-10-15) Days are local calendar days in the user's timezone (same as F08 B2 / existing streaks). Today does not break a daily habit streak until the day ends.
- **R.7** (Established 2026-10-15; revised 2026-10-16) **Caps:** at most **6 custom** items in each system. Daily: apps + LC + ≤6 custom habits (8 slots with apps+LC). Weekly: apps + LC + ≤6 custom weekly targets. Creating or restoring above the custom cap is rejected with a clear message (no silent swap).
- **R.8** (Established 2026-10-15) Daily habits and custom weekly targets are **separate namespaces**: the same display name may exist in both.
- **R.9** (Established 2026-10-15) Progress → **This week** is the dedicated habits hub. F11 owns that page’s layout and fixed-height / design-system containerization for the surfaces it introduces (design-system rules already established; do not wait on a separate F09 Progress migration).
- **R.10** (Established 2026-10-15) Hard delete is out of F11; **archive** is enough for daily habits and custom weekly targets.

### M0: Prototypes

- **R0.1** (Established 2026-10-15) Prototype **(1) — Habits strip** (Home + Progress): Active/Archived chips, create slot, per-custom pencil, checkoff vs edit as distinct actions, reflection pencil, Update progress placement, today-LC placement variants **A** and **B** (see open Q12). Every variant obeys locked strip rules below.
- **R0.2** (Established 2026-10-15) Prototype **(2) — Weekly goals + incrementer**: Progress weekly column with + / Active/Archived / pencil; adjacent multi-goal weekly incrementer (LC + customs; no apps ±; **no** today-LC); Home Targets mock for custom weeklies. Active vs archived look meaningfully different (visuals explored here and in R0.1).

### M1–M2: Daily custom habits & This week / Home strip

- **R1.1** (Established 2026-10-15) The user can have multiple named **custom** daily habits (within R.7).
- **R1.2** (Established 2026-10-15) Each habit has a user-set **name**: max 50 characters after trim; empty rejected; duplicate names among habits allowed (identity is the row).
- **R1.3** (Established 2026-10-15) **Rename** is allowed (correcting or clarifying the label of the same habit). Renaming does not reset history or start a new streak identity.
- **R1.4** (Established 2026-10-15) Each habit is a **separate identity**. A different life focus gets a **new** habit; do not repurpose an existing habit’s history for a different practice. Archive the old one and create another when priorities change.
- **R1.5** (Established 2026-10-15) Custom habits are **boolean** for the day: checked off or not. They do not show a “count completed today.” The user can check off today and undo today’s checkoff.
- **R1.6** (Established 2026-10-15) While **archived**, a custom habit does not appear in the Active strip, does not earn streak points, and does not consume the custom cap. Calendar time still advances: restoring after missed days can show a broken streak (no freeze/pause).
- **R1.7** (Established 2026-10-15) Checkoff and streak points apply to **today** only. No History backfill that awards or reverses past-day habit streak points (align with F08 R5.25 timing).
- **R1.8** (Established 2026-10-15) The **Habits** strip appears on **Home and Progress** with the same chrome:
  - Heading: **Habits**.
  - **Active / Archived** section chips (top right of the strip). Archived chip disabled when there are no archived customs. **Archived view shows only archived customs** (apps/LC are Active-only).
  - **Active order:** Apps, LC, then customs in **creation order**, then a **create** container when fewer than 6 customs are active (create slot gone at the custom cap).
  - Apps/LC pills remain **display-only** (derived). Custom pills are interactive for today’s checkoff.
  - Per-custom **pencil** (top right of that habit’s container): rename or archive. Apps/LC have no pencil.
  - **Update progress →** sits at the **bottom right** of the strip (Home), linking to Progress → This week as today.
  - Active and archived presentations look **meaningfully different** (exact styling from M0 prototypes).
- **R1.9** (Established 2026-10-15) Custom habit pill subtitle: **done** / **not yet**. Apps and LC keep **N completed today** (raw day counts; intentional — see F08 R5.27).
- **R1.10** (Established 2026-10-15) Checkoff and edit are **distinct actions** (not one ambiguous control). Exact chrome (whole-pill vs dedicated ✓/− vs pencil hit targets) is settled in M0 prototypes (open Q11).
- **R1.11** (Established 2026-10-15) A **pencil on the Habits strip** (Home and Progress) opens a `ModalLayer` modal to add a **standalone reflection for today**: **link**, **body**, and **lane**, using the **same link-option set** as Progress reflection compose. No notes list and no apps list in the modal. Past work remains the place for the day’s full reflection list and day editing (including today via the calendar).
- **R1.12** (Established 2026-10-15) Progress → This week **removes** `NextAchievements` and the **Daily progress** aside (reflection compose, notes list, apps list). Week/month **pulse cards** stay, compact, above the habits layout. Full achievements remain on Progress → Lifetime.
- **R1.13** (Established 2026-10-15) **Today LC** logging (tiered ± for today’s solves, feeding the daily LC streak) must remain reachable without burying it in Past work, and must **not** sit beside weekly LC in the weekly goals / incrementer column. Placement is chosen from M0 prototype variants **A** and **B** (open Q12). Apps stay derived from mark-applied / application-task completion — no daily apps stepper.
- **R1.14** (Established 2026-10-15) Modals use `ModalLayer`.

### M3: Custom weekly targets

- **R3.1** (Established 2026-10-15) The user can define **custom weekly targets**: a name and a target count of actions for the week (for example Gym / 3). Progress is actions done this week toward that number, in the same family as apps/LC weekly goals.
- **R3.2** (Established 2026-10-15) Custom weekly targets appear in the Progress **weekly goals column** and under Home **Targets** every Sunday (same Upcoming Targets pattern as apps/LC today), when unmet / as Home already shows weekly goals.
- **R3.3** (Established 2026-10-15; revised 2026-10-16) Progress toward a **custom** weekly target is advanced by an explicit ± check-in in the **weekly incrementer** (Check in). LC weekly progress is **not** ±’d there — it updates only via Habits strip **Log LC** (F08 R5.17). No session titles. Control chrome: classic stepper (Q13).
- **R3.4** (Established 2026-10-15) Week-close Seeds for custom weekly targets use the **same** schedule as apps/LC (F08 R5.15): +20 per unit, +100 flat when met. Points at week close only — not a parallel daily-streak pay for the same actions.
- **R3.5** (Established 2026-10-15) Name and **target number** carry week to week like LC; progress resets each week. New custom weekly targets default to target **3**.
- **R3.6** (Established 2026-10-15) Mid-week, the **target number** is edited via a **stepper near the label** (same idea as LC today). The per-goal **pencil** is for **rename + archive** only (not target size). Apps/LC have no pencil; apps/LC names are not editable as customs are.
- **R3.7** (Established 2026-10-15) Progress weekly column chrome: **+** (top right) creates a custom goal (name + weekly target) when under the custom cap; **Active / Archived** chips flip the view; Archived shows **only archived customs** (apps/LC stay on Active). Active vs archived look meaningfully different.
- **R3.8** (Established 2026-10-15; revised 2026-10-16) The short LeetCode-only aside on This week is **revamped** into **Check in**: classic ± for **each active custom** weekly target only. **No LC ±** and **no apps ±** here. LC weekly count still moves through Log LC (R5.17); the Weekly LC column row shows read-only **Today** / **This week** easy·medium·hard lines. **No today-LC** steppers in Check in (R1.13).
- **R3.9** (Established 2026-10-15) Custom weekly targets get the display-only **weeks-in-a-row** flame when met ≥2 weeks (same idea as F08 R5.28 for apps/LC).
- **R3.10** (Established 2026-10-15) Archive / restore for custom weekly targets follows the daily-habit pattern (R.7 cap on restore; archived do not consume the custom cap).

## Behavior rules

- **B1** (Established) Daily habit identity is stable: rename changes the label only; history and streak length stay with that habit.
- **B2** (Established) Switching life focus means archive + create new, not renaming a habit into a different practice.
- **B3** (Established) Non-daily quotas are weekly targets, not daily streaks with custom schedules.
- **B4** (Established) Archived customs (daily or weekly) do not consume the custom cap.
- **B5** (Established) Custom daily habits never affect LC/apps qualifying days or weekly LC/apps goal membership.
- **B6** (Established) Apps and LC always count toward the total-of-5; they cannot be archived out of the Active set.

## Current behavior

Verified by reading code (2026-10-15). No F11 requirements are implemented yet.

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| Today payload: `streaks.lc` / `streaks.apps` plus `habits.active` / `habits.archived` | [`progress.ts`](../../../apps/api/src/progress.ts), [`customHabits.ts`](../../../apps/api/src/customHabits.ts) | Conforms R1.1 / R1.5 / R1.9 (payload); Conflicts R1.8 (UI strip still M2) | HTTP: `/api/habits` CRUD + today checkoff (M1-03) |
| Customs: qualifying days in `custom_habit_days`; LC/apps still derived | [`streaks.ts`](../../../apps/api/src/streaks.ts), [`042_custom_daily_habits.sql`](../../../apps/api/src/sql/042_custom_daily_habits.sql) | Conforms R1.5 | |
| Streak points: daily `min(20, 2×length)`, milestones `5×length`, today-only award/reverse, category `streak` | [`streaks.ts`](../../../apps/api/src/streaks.ts), [`pointsFormulas.ts`](../../../apps/api/src/pointsFormulas.ts) | Conforms R.3 | Habits use `habit:<id>:<date>` source ids (M1-02) |
| Habits strip on Home + Progress: Active/Archived, Apps/LC derived, customs checkoff/pencil, ghost archived, create slot, Add reflection + Log LC | [`HabitsStrip.tsx`](../../../apps/web/src/features/progress/HabitsStrip.tsx) | Conforms R1.8–R1.11, R1.13–R1.14, R1.5, R1.9, Q11–Q12, Q14 (strip) | M2-01 / M2-02 |
| This week: pulse → Habits strip → weekly column + Check in (no Next achievements / Daily progress) | [`ThisWeekPage.tsx`](../../../apps/web/src/features/progress/ThisWeekPage.tsx), [`WeeklyGoalsBlock.tsx`](../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx), [`WeeklyCheckIn.tsx`](../../../apps/web/src/features/progress/WeeklyCheckIn.tsx) | Conforms R1.12 (M2-03), R3.3, R3.6–R3.9, R1.13, R.7, Q13–Q14 (M3-03/04) | Check in = customs only; LC via Log LC; Today/week tier lines under Weekly LC |
| Home “Update progress →” bottom-right of Habits strip → `/progress` | [`HabitsStrip.tsx`](../../../apps/web/src/features/progress/HabitsStrip.tsx) | Conforms R1.8 (placement) | M2-01 |
| Weekly goals snapshot: apps + LC + `customs.active` / `customs.archived`; `/api/weekly-customs` CRUD/±/archive; week-close Seeds for customs | [`customWeeklyGoals.ts`](../../../apps/api/src/customWeeklyGoals.ts), [`weeklyGoals.ts`](../../../apps/api/src/weeklyGoals.ts), [`043_custom_weekly_goals.sql`](../../../apps/api/src/sql/043_custom_weekly_goals.sql) | API Conforms R3.1, R3.3–R3.6, R3.4, R3.9–R3.10, R.7 (M3-02); column + Check in Conforms R3.2 (Progress) / R3.7–R3.8 (M3-03/04); Home Targets still Conflicts R3.2 | M3-05 for Home |
| Home Targets Sunday rows for unmet apps/LC only | [`homeUpcoming.ts`](../../../apps/api/src/homeUpcoming.ts) | Conflicts R3.2 (customs absent) | M3-05 |
| Weekly-goal streak flame for apps/LC + customs when ≥2 | F08 R5.28, [`WeeklyGoalsBlock.tsx`](../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx) | Conforms R3.9 | |
| Past work day panel includes reflection compose for the selected day (including today) | [`PastWorkPage.tsx`](../../../apps/web/src/features/progress/PastWorkPage.tsx) | Conforms R1.11 (list ownership) | Strip reflection pencil still absent |

## Out of scope

- Custom streak **frequencies** (N×/week or specific weekdays as a streak schedule).
- Per-habit or per-target **custom point rates**.
- Migrating LC/apps daily streaks into the habit checkoff table.
- Freezing / pausing a daily habit so archived time does not break the streak.
- Apps ± in the weekly incrementer; daily apps stepper.
- Hard delete of habits or custom weekly targets.
- A general-purpose habit app (reminders, notifications, social, etc.).

## Open questions

None. Prototype questions Q11–Q14 are resolved (2026-10-16).

## Resolved questions

<details>
<summary>Resolved questions (42)</summary>

| # | Question | Answer (date) | Now in |
|---|----------|---------------|--------|
| Q11 | Checkoff vs edit chrome? | Mark hit-target top-right like Apps/LC; pencil beside `{name} daily streak` (variant D, 2026-10-16) | R1.10 |
| Q12 | Today-LC home A vs B? | **B** Log LC disclosure on Habits strip band with Add reflection; Update progress below (2026-10-16) | R1.13 |
| Q13 | Weekly ± control chrome? | Classic stepper (− N +) (variant A, 2026-10-16) | R3.3 |
| Q14 | Active vs archived look (strip + weekly)? | Ghost stamp both surfaces; ChromeTabs; restore-last → Active (2026-10-16) | R1.8, R3.7 |
| Q14a | (superseded by Q14) Active vs archived on daily strip? | Ghost stamp; ChromeTabs; restore-last → Active (2026-10-16) | R1.8 |
| Q0a | One custom streak vs many? | Multiple daily habits (2026-10-15) | R1.1 |
| Q0b | Points for daily customs? | Same as LC/apps R5.25 (2026-10-15) | R.3 |
| Q0c | Cap (first pass)? | Revised to 3 custom / 5 total (2026-10-15); raised to **6 custom** daily and weekly (2026-10-16) | R.7 |
| Q0d | Non-daily as streak schedules? | No — weekly goals (2026-10-15) | R.2, R3.1 |
| Q0e | Rename vs new identity? | Rename OK; new focus = new habit (2026-10-15) | R1.3, R1.4, B1, B2 |
| Q1 | Archive vs freeze? | Time advances; restore can break streak (2026-10-15) | R1.6 |
| Q2 | Habit name rules? | ≤50, no empty, dupes OK (2026-10-15) | R1.2 |
| Q3 | Past-day habit edits? | Today-only in F11 (2026-10-15) | R1.7 |
| Q4 | Strip chrome / IA? | Full Habits strip Home+Progress; weekly column + incrementer; Home Targets (2026-10-15) | R1.8–R1.13, R3.* |
| Q5 | “Habits” label? | Daily strip heading Habits; weekly stays Weekly goals; subnav This week (2026-10-15) | R1.8, R.9 |
| Q6 | Same name daily vs weekly? | Allowed, separate namespaces (2026-10-15) | R.8 |
| Q7 | Weekly check-in UX? | ± in incrementer; field chrome in prototype (2026-10-15) | R3.3, Q13 |
| Q8 | Weekly Seeds? | Same +20 / +100 (2026-10-15) | R3.4 |
| Q9 | Weekly custom cap? | Same as daily: **6 custom** (2026-10-16; was 3/5 on 2026-10-15) | R.7 |
| Q10 | Weekly carry / lifecycle? | Name+target carry; archive only; default target 3 (2026-10-15) | R3.5, R.10 |
| Q15 | Weeks-in-a-row flame? | Yes, like R5.28 (2026-10-15) | R3.9 |
| Q16 | Home strip full chrome? | Yes (2026-10-15) | R1.8 |
| Q17 | Derived LC/apps pencil/archive? | Never; always Active (2026-10-15) | R.5, B6 |
| Q18 | This week hub; remove Next achievements + Daily progress? | Yes (2026-10-15) | R1.12, R.9 |
| Q19 | Reflections / apps list? | Past work owns lists; strip pencil → standalone reflection modal (2026-10-15) | R1.11 |
| Q20 | Week/month pulse cards? | Keep, compact, above strip (2026-10-15) | R1.12 |
| Q21 | Today-LC after aside revamp? | Prototype A vs B; not Past-only; not in weekly column (2026-10-15) | R1.13, Q12 |
| Q22 | F11 vs F09 for This week shell? | F11 owns (2026-10-15) | R.9 |
| Q23 | Restore at custom cap? | Block with message (2026-10-15) | R.7 |
| Q24 | Archived strip contents? | Customs only (2026-10-15) | R1.8 |
| Q25 | Active strip order? | Apps, LC, customs by creation, create slot (2026-10-15) | R1.8 |
| Q26 | Reflection modal fields? | Link, body, lane; same link options (2026-10-15) | R1.11 |
| Q27 | Other daily steppers? | Only today LC; customs boolean (2026-10-15) | R1.5, R1.13 |
| Q28 | Apps weekly ±? | No; apps = application-task completion (2026-10-15) | R3.8 |
| Q29 | Update progress placement? | Bottom right of Habits strip (2026-10-15) | R1.8 |
| Q30 | Active vs archived look? | Meaningful difference; visuals in M0 (2026-10-15) | Q14 |
| Q31 | Weekly Archived view? | Customs only (2026-10-15) | R3.7 |
| Q32 | Mid-week target edit? | Near-label stepper like LC; pencil = rename+archive (2026-10-15) | R3.6 |
| Q33 | Checkoff vs edit chrome? | Distinct; looks in M0 (2026-10-15) | R1.10, Q11 |
| Q34 | Custom pill subtitle? | done / not yet; apps/LC keep N completed today (2026-10-15) | R1.9 |
| Q35 | F08 R5.27 copy? | Align docs to N completed today (2026-10-15) | F08 R5.27 |
| Q36 | M0 prototype sequence? | Strip first, then weekly+incrementer+Home Targets (2026-10-15) | R0.1, R0.2 |

</details>

## Decisions log

- **2026-10-15:** Scope is multi-habit **daily** tracker, same points as LC/apps, rename allowed but habits are not reused for different practices.
- **2026-10-15:** Non-daily actions are an extension of **weekly goals**, not custom streak frequencies. F11 covers both expansions across milestones.
- **2026-10-15:** Per-habit custom points out of scope for F11.
- **2026-10-15:** LC/apps daily streaks remain derived; customs use stored boolean checkoffs.
- **2026-10-15:** M0 includes prototypes (R.0).
- **2026-10-15 (grilling):** Cap is **3 custom / 5 total** (apps+LC+customs) for both daily and weekly. Progress → This week is the habits hub; remove Next achievements and Daily progress from that page; Past work owns day lists; Habits strip pencil opens a lightweight today-reflection modal (link, body, lane). Full strip chrome on Home and Progress. Weekly: + / Active/Archived / pencil (rename+archive); near-label target stepper; multi-goal weekly incrementer (no apps ±, no today-LC); Home Targets for customs; same week-close Seeds; weeks-in-a-row flame; default target 3. Archive breaks streaks (no freeze). Today-LC placement and checkoff/edit chrome deferred to M0 prototypes A/B. F08 R5.27 corrected to match intentional `N completed today` copy.
- **2026-10-16 (M0-01):** Strip verdicts — Q11 mark hit-target; Q12 Log LC disclosure on band; Q14 strip = ghost stamp. Prototype at `/prototype/f11/habits/strip`.
- **2026-10-16 (M0-02):** Weekly verdicts — Q13 classic stepper; Q14 weekly = ghost stamp (same as strip). Prototype at `/prototype/f11/habits/weekly`. M0 Done. Streak lengths stay **derived** from qualifying days / checkoffs (no stored counter); same pattern as LC/apps and weekly met-weeks.
- **2026-10-16:** Active custom cap raised **3 → 6** for both daily habits and weekly targets (R.7). Apps + LC still always present beside customs.
- **2026-10-16 (M2-03):** This week remodeled — pulse above Habits strip; Next achievements and Daily progress aside removed; apps/LC `WeeklyGoalsBlock` stays full-width until M3.
- **2026-10-16 (M3-01):** Custom weekly schema — `custom_weekly_goals` identity (name, target_count default 3, soft archive), `custom_weekly_goal_weeks` open progress, `custom_weekly_goal_records` closed snapshots (parallel to apps/LC records).
- **2026-10-16 (M3-04 follow-up):** Check in is customs-only ±. LC has no Check in stepper; Weekly LC shows restored Today / This week tier count lines; Weekly goals + Check in cards share fixed 28rem height.
