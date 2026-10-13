# Spec: Accomplishment, detail pages & rewards (F08)

**ID:** F08 (folder `docs/features/F08-accomplishment-rewards/`; tickets on the [board](./board.md))
**Status:** Active
**Last updated:** 2026-10-13

## Problem

Finishing work in Career Digest doesn't feel like anything. Tasks and applications had no detail page of their own. Reflections floated free of the work they described. Completing a task, sending an application or finishing an interview step left no lasting trace or reward. Weekly goals lived on Progress, away from the Home view where the week is planned. Without a visible payoff for steady effort, it's harder to keep a long internship search going.

## Goals

- Every task and application has a calm detail page where its work, notes and reflections live together.
- Completing work is one consistent flow that can capture a reflection and actual time.
- Effort turns into points in one global ledger that is honest and auditable.
- Weekly goals are visible from Home, reset cleanly each week, and leave a record of how the week went.
- Points can be spent on the Cat Cake Collection.

## Sources

Requirements come from two places only:

1. **The F08 plan approved at M0**: the changelog as committed in `730d5c7` (2026-10-09).
2. **User clarifications**: dated in the decisions log.

Shipped code is never a source. Where the plan and the shipped code disagree, the disagreement is listed under Current behavior and raised as a question.

## Milestones

Order for the remaining milestones: **M5, M7, M8, M3, M6** (user, 2026-10-12 and 2026-10-13).

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | Quick fixes and changelog restructure | Done |
| M1 | Detail pages: misc task, application task, application | Done |
| M2 | Reflections linked to work; shared completion modals | Done, with an open ticket (M2-01) |
| M3 | Recurring tasks | Not started |
| M4 | Global points ledger | Done, with open ticket M4-01 (scheduled with M5); M4-02 and M4-03 done |
| M5 | Weekly goals end to end; streaks and achievements; points rule adjustments; celebration | Design |
| M6 | Board departures log | Not started |
| M7 | Cat Cake Collection v1: spending points, the Rewards page | Not started. The prototype is unfinished (R7.4–R7.6) |
| M8 | Progress redesign, LeetCode tier polish, information architecture | Not started |

## Requirements

Tags: **Established** means stated or confirmed by the user, and only these may be implemented. **Proposed** means suggested by the agent and awaiting confirmation.

### M0: Quick fixes (Done)

- **R0.1** (Established) Toggling "target this week" on the Tasks page doesn't re-sort the Applications section. Sort order is frozen after load, and only the checkbox changes.
- **R0.2** (Established) When a posting leaves the board, its open application task and to-do application row are deleted. Applications at applied or later are kept.
- **R0.3** (Established) The Add Task modal offers the Deadline / Target choice, matching the edit form and the task card.
- **R0.4** (Established; replaced in M5 by R5.17) Changing weekly LC progress changes today's daily LC count by the same amount.
- **R0.5** (Established) Home Upcoming has a 1-week / 2-week range preset, remembered per browser.
- **R0.6** (Established) The changelog is organized by feature.

### M1: Detail pages (Done)

- **R1.1** (Established) A design spike with three proposals comes before implementation.
- **R1.2** (Established) Misc tasks have a compact detail page at `/tasks/:taskId`, showing subtasks with their completion state.
- **R1.3** (Established) Time left before a due date is shown as a countdown with circles, each circle a 12-hour slice:
  - on Home and on task detail and cards: countdown and circles
  - next to the day labels under Home Targets: circles only
- **R1.4** (Established) Application tasks have a detail page in the same visual family, calling out what differs: the mark-applied path and the posting link.
- **R1.5** (Established) The application page (distinct from the application task) is redesigned with less clutter. Status is a selector with Save, not a row of action buttons. Notes and job description are denser.
- **R1.6** (Established) Home Upcoming items link to their individual task or application.
- **R1.7** (Established) On the Tasks page, clicking a task title opens its detail page.
- **R1.8** (Established) Completed tasks open their detail page, which shows checked subtasks.
- **R1.9** (Established) M1 doesn't unify the completion modals; existing complete and mark-applied flows keep working.

### M2: Reflections and completion modals (Done)

**Linking**

- **R2.1** (Established) A reflection links to at most one work item: either a task or an application. Unattached reflections are allowed.
- **R2.1a** (Established) An interview step is a sub-link of an application. It can be chosen only after an application is linked, and only from the steps of the interview thread associated with that application.
- **R2.1b** (Established) When an application task is marked applied, every reflection linked to that task moves to the application.
- **R2.2** (Established) Reflections can be linked after the fact from task and application pages, and from wherever reflection logs are shown. The final entry points are settled in M8 (R8.7).
- **R2.3** (Established) A task or application can have multiple reflections, listed flat by date created.
- **R2.4** (Established; superseded in M5 by R5.29) Deep work is a toggle that defaults on for every reflection. A deep-work unit is never granted without a reflection.
- **R2.5** (Established) "Other" is a reflection category for deep work that is neither application nor technical.

**Linking edge cases** (Established 2026-10-13)

- **R2.14** Changing or clearing a reflection's application link clears its interview step.
- **R2.15** A reflection linked to an interview step keeps that link when the step or its thread is resolved.
- **R2.16** Deleting the linked task, application or interview step never deletes the reflection; it becomes unattached. This includes Remove from tasks on Jobs and a posting leaving the board (R0.2).
- **R2.17** When duplicate postings merge, reflections on the removed application move to the surviving one, the way interview threads already do.
- **R2.18** Reopening a misc task keeps its reflections linked. Application tasks can't be reopened.
- **R2.19** Linking, unlinking or re-linking an existing reflection never changes points.
- **R2.20** The reflection written in the completion modal links to the work being completed: a misc task links to the task; an application task links to the application.

**Applications backed by an open task**

- **R2.21** (Established 2026-10-13) An application row that still backs an open application task is never edited as an application:
  - The API rejects status changes on it and points to mark applied instead.
  - Its application page redirects to the task.

  Mark applied is the only way such a row becomes an application. Ticket: M4-01.

**Completion modals**

- **R2.6** (Established) Jobs and Tasks share one complete / mark-applied modal component.
- **R2.7** (Established) Reflection and Notes are optional collapsible panels with a light-purple bar (the Progress → History reflection shade) holding the toggle. Clicking the toggle or the bar expands the panel and turns it on. Clicking again collapses it and turns it off, keeping any typed text.
- **R2.8** (Established) Submitting while a collapsed panel still holds text asks "Discard reflection/notes?", with the options keep editing or discard.
- **R2.9** (Established) Defaults: applications and tasks start with reflection off and notes off. Page 2 of the interview finish step starts with reflection on.
- **R2.10** (Established) Actual time is known only once work is done, so it is set in two places:
  1. in the completion modal
  2. afterwards, in Edit details on the completed task

  Changing it adjusts the task's points. Minutes entered in a reflection during completion are saved as the task's actual time. Applications have no later actual-time edit; their reflection minutes are adjustable instead (R5.19).
- **R2.11** (Established) Interview finish has two pages: page 1 for outcomes and next step, then Next, then page 2 for an optional reflection, then Finish step.
- **R2.12** (Established) The modals get real visual design, not stacked textareas. F09 now governs the visual standard.
- **R2.13** (Established) Marking an application applied from Jobs (card or job detail) has the same outcome as marking it applied from Tasks:
  - points awarded once
  - the modal's reflection linked to the application
  - the task's reflections transferred (R2.1b)
  - reflection minutes saved as the task's actual time
  - the same weekly apps handling

  Changing an existing application's status on its own page earns nothing again. Ticket: M4-01.

### M3: Recurring tasks (Not started)

- **R3.1** (Established) A short UI design pass comes before the build.
- **R3.2** (Established) Recurrence options: daily; weekly on selected weekdays; monthly on selected days of the month (1–31).
- **R3.3** (Established) All instances share one task page.
- **R3.4** (Established) Reflections on a recurring task are listed flat on the shared page by date created, earliest first.
- **R3.5** (Established) A mini-calendar shows instances for the next month, and an instance can easily be added or removed for a given due date.
- **R3.6** (Established) Each instance has its own due date, and missed instances stay overdue. Each can be deleted or given a new due date, the same way subtasks work.
- **R3.7** (Established) For recurring tasks with subtasks, the shared page shows the subtasks of the earliest open instance, labeled with its date. An instance is complete only when all its subtasks and the instance itself are done. Then the next instance's subtasks appear.
- **R3.8** (Established; how pending Q15) Each completed instance earns points like a normal misc task.

### M4: Global points ledger (Done)

- **R4.1** (Established) One global points balance, with a breakdown by category.
- **R4.2** (Established) An event log of points earned. Spend entries come with M7.
- **R4.3** (Established, locked in M4) Earnings are forward-only. No earn is deleted; corrections are recorded as reverse or adjust events. Subtasks earn nothing.
- **R4.4** (Established, locked in M4; the weekly row changes in R5.9 and R5.15, the LeetCode row in R5.20) The points formula:

| Action | Points |
|--------|--------|
| Misc task complete | 1 × actual minutes, or 15 if actual is blank. An optional reflection on the same completion adds a flat +20; task minutes aren't counted twice. |
| Application mark-applied | Flat +5. Minutes count only when a reflection is included: 1 × reflection minutes, or +20 if blank. |
| Interview step finish | Flat by kind: assessment 60, phone 50, technical 80, onsite 100, offer 200, custom 40. Same reflection add-on as applications. |
| Standalone Progress reflection | On create only: 1 × minutes, or +20 if blank. Linking an existing reflection later earns 0. |
| LeetCode | +30 per solve, uncapped. One aggregate earn per day, adjusted or reversed when the count drops. |
| Weekly LC or apps goal | +100 once per week when that slot's target is met. |

- **R4.5** (Superseded 2026-10-13 by R7.3) The balance never goes below 0.
- **R4.6** (Established) Past completions show estimated vs actual time when both exist.
- **R4.7** (Established) There is no zero-point "shell task" category. Weekly target visibility (M5) covers that use.
- **R4.8** (Established) Ledger page chrome can be temporary, on Progress, until M7 and M8 place it.
- **R4.9** (Established, locked in M4) Completing work with an optional reflection records one combined earn, not two.
- **R4.10** (Established) An application's points never reverse. Once applied, an application only moves forward (interviewing, accepted, declined). Un-applying isn't supported.
- **R4.11** (Established) Reopening an interview step doesn't reverse its points, and finishing it again doesn't earn again.
- **R4.12** (Established) Lowering a day's LeetCode count reverses that many solves' points.
- **R4.13** (Established 2026-10-13) Re-completing a reopened misc task is treated like editing its actual time after completion (R2.10). Across the reopen and re-complete, the task's points change by f(new actual) − f(old actual), so the same actual time nets 0. Ticket: M4-03.

### M5: Weekly goals, streaks & achievements, points rules, celebration (Design)

**Process and celebration**

- **R5.1** (Established) A design pass with prototypes comes before implementation, following the prototype rules in `AGENTS.md`.
- **R5.2** (Established; may be dropped after prototyping, Q7) Completing work triggers a visible, dynamic flourish (for example confetti, or the task vanishing near the last click), not a plain toast. Affirmations are skipped.

**Progress weekly block** (content and behavior only; the page layout is M8's)

- **R5.3** (Established) The Progress weekly goals block keeps its bars, counts and ahead/behind pace.
- **R5.4** (Established) On Progress, the apps goal's members appear as a plain list, with no checkmarks and no untag control. Membership is managed only on Tasks, because a checkbox is too easy to misfire after applying.
- **R5.5** (Established) The LC goal has an optional label (for example a grind track):
  - it's editable on Progress, up to 50 characters
  - Home shows it in the target row as `Weekly LC goal · Grind 75 Week 4`
  - it appears only on Progress and in the Home target row
  - it is LC-only and clears at the start of every week

**Home targets**

- **R5.6** (Established) Weekly goal targets appear on Home under Targets only, never under Deadlines. The app goal and LC goal sit on Sunday, styled like interviews in Upcoming. They are not real tasks. A goal's row disappears once that week's target is hit.
- **R5.18** (Established) After the week resets, the first Home visit shows one congratulations banner for last week's met targets. It names apps, LC, or both, with each one's count out of its target and the points earned for reaching the targets. No banner appears if neither was met. It shows once: × closes it early, and it's marked seen per week in `localStorage`, so it's gone on the next visit (2026-10-13). This one-time notice is written into `docs/design-system.md` as a standard banner pattern when M5-02 ships. Ticket: M5-02.

**Week boundary and records**

- **R5.7** (Established) Weekly goals reset at the week boundary and never become overdue. See the behavior rules.
- **R5.8** (Established) When a week ends, each goal gets one entry in the completion logs recording progress reached out of the goal number (for example `Apps 6/10`, `LC 12/10`).
- **R5.11** (Established) **Apps carry-over.** Tagged app tasks still open at week's end move into next week's apps goal. Last week's entry keeps its own result, and more tasks can be tagged on top. If every tagged task was done, next week starts with no tagged tasks.
- **R5.12** (Established) A week that ends with no tagged app tasks (0/0) earns no reward.
- **R5.13** (Established) **LC carry-over.** The LC target number carries forward and stays editable. Progress starts at 0, and the label clears.
- **R5.14** (Established) LC progress can go past the target, for example when dipping into next week's set. It is recorded as reached (12/10).
- **R5.22** (Established 2026-10-13) Weekly records start with the week M5's week close ships. Earlier weeks get no record and no points; their apps results can't be trusted, because carry-over moved members out of them. In the week of the switch, a flat bonus already paid the old way isn't paid again at close.
- **R5.23** (Established 2026-10-13) The first request after a week ends closes every unclosed week, oldest first. A week closes even if the app wasn't opened on Sunday. The points are dated when the week closes and labelled with the week ("Week of Oct 5"). A closed week's record is fixed: a weekly solve logged late counts toward the current week, and a carried-over task counts toward the week it's completed in. There's no grace window.
- **R5.24** (Established 2026-10-13) Apps goal membership:
  - Untagging an open task shrinks the goal, even if that makes it met.
  - A tagged task that's deleted (for example, its posting left the board) drops out of the goal.
  - With no tagged tasks, Home shows no apps target row.

**Points rules**

- **R5.9** (Established) Weekly goal points are awarded once, when the week closes, as part of the week's record; not at the moment a target is hit. Every path that moves weekly progress feeds that same record: R2.13 and R5.17.
- **R5.15** (Established 2026-10-13) Weekly goal points account for partial progress and the size of the goal, so a 1/1 week isn't worth the same as a 10/10 week. At week close, each goal earns:
  - +20 per unit: each completed tagged app, and each weekly LC solve
  - +100 flat when the target is met
  - LC solves past the target keep earning +20 each, but there's no second flat bonus

  Apps and LC are worth the same per unit: LC takes more effort, but a tagged app is more likely to be a high-priority one.
- **R5.16** (Established) Streaks and achievements award points, extending the M4 rules. Details in R5.25–R5.27.
- **R5.19** (Established) Editing a reflection's minutes adjusts the points that came from those minutes, with an adjust event. This covers:
  - the standalone reflection earn
  - the reflection add-on of an application or interview step earn

  A misc task's reflection add-on is flat, so it's unaffected. Reflections that earned nothing (linked later) stay at 0.
- **R5.30** (Established 2026-10-13, Q50) One model for reflection minutes. It's part of the points rules, so it's also in the in-app rules reference (R7.9).
  - Every reflection can have minutes, entered when it's created and editable later, wherever reflections are created or edited.
  - A reflection's minutes move points only where that reflection created points: a standalone reflection's own earn, or the reflection add-on of the application or interview earn it was written in (R5.19). Otherwise editing minutes changes no points: reflections linked later, and the misc task's modal reflection, whose add-on is flat.
  - In the misc completion modal, the task's actual time stays the one time field; the reflection there has no separate minutes.
  - Editing the minutes of an application's modal reflection also updates the completed application task's actual time, which was copied from it.
- **R5.20** (Established; values pending Q32) LeetCode points vary by difficulty tier (easy, medium, hard). Tiers are built in M5, in the same stepper rework as R5.17, because they change points from then on; their visual polish is M8 (R8.3). Existing untiered counts aren't migrated and keep their points. Wherever past days are shown by tier, they count as medium. Ticket: M5-01.
- **R5.21** (Established 2026-10-13) The points breakdown splits its single task row by task category (School, Reading, Writing, Admin, custom), because tasks make up most of the total and a single row isn't informative. A task's points belong to its category at completion, recorded on the earn. Earns from before M5-03 fall back to the task's current category (2026-10-13). Earns whose task was since deleted go to one "Deleted tasks" row, shown only when it isn't 0 (2026-10-13). Ticket: M5-03.

**Streaks and achievements**

- **R5.25** (Established 2026-10-13) **Daily streaks** for LC and for applications. The numbers are a starting point and may be tuned.
  - A day counts for the LC streak if it has at least 1 solve. It counts for the apps streak if at least 1 application was marked applied that day (Proposed definition).
  - Today doesn't break a streak until the day ends.
  - **Daily points:** each day the streak continues earns 2 × the streak's length, capped at 20 (day 1 = 2, day 10 onward = 20). Small daily points are more motivating than large milestone payouts.
  - **Milestones:** 5, 10, 20, 30, 50 and 100 days, each worth 5 × the length (+25 to +500). Each new streak can earn them again.
  - **Timing:** a day's streak points are awarded on its first qualifying action and reversed if that day drops back to 0. Editing a past day in History updates the displayed streak, but doesn't award or reverse streak points for that day or any later day.
  - **Launch:** a streak running at launch keeps its earlier days; daily points start from launch.
  - Streak points have their own ledger category, `streak`.
- **R5.26** (Established 2026-10-13) **Achievements** for accumulated counts, with points roughly proportional to the count. Each pays once. The numbers are a starting point.
  - Applications marked applied: 10, 25, 50, 100, 150, 200, 300, 500; 3 × N points.
  - LC solves: 25, 50, 100, 200, 300, 500; 5 × N points.
  - Finished interview steps, counted per kind, worth the step's own points × N (they reward more than applications or LC): assessment and phone at 5, 10, 25, 50; technical at 3, 5, 10, 25; onsite at 1, 3, 5, 10; offer at 1, 2, 3, 5. Custom steps don't count.
  - There are no "first of a kind" achievements; every achievement is a count.
  - **Launch:** achievements already passed unlock at launch with no points; only crossings after launch earn.
- **R5.27** (Established 2026-10-13; built after R5.25) The today strip on Home and Progress shows the current apps and LC streaks instead of today's `x/3` counts, which aren't motivating. The deep-work badges go with deep work (R5.29).
- **R5.28** (Established 2026-10-13) **Weekly-goal streak** is display only, with no points: hitting a target already pays per unit plus the flat bonus. It's shown per goal (for example "LC: 3 weeks in a row") in the congrats banner and the Progress weekly block, read from the week-close records.

**Retiring deep work**

- **R5.29** (Established 2026-10-13) Deep work is retired. It was a motivational display; now that reflections carry minutes and points, whether one is marked deep work adds little. The toggle leaves every reflection form, and the today strip loses its deep-work badges. This supersedes R2.4 and B5. Where deep work fed Progress, reflections in general take its place (Q49, 2026-10-13):
  - **Heatmap and History calendar marks:** a lane's day is marked when it has at least one reflection in that lane, of any kind.
  - **Week and month summary:** the "deep work" count becomes total reflection minutes for the period. (Proposed: reflections without minutes add 0.)
  - The `deep_work` column stays in the database, unused, so no history is lost.

**LeetCode logging**

- **R5.17** (Established) LeetCode solves come in two types: **weekly** (part of the week's planned problems) and **misc** (everything else). Either can be incremented or decremented.
  - Every change, of either type, goes through one shared server function that updates that day's count, syncs LeetCode points, and returns the points change.
  - A weekly change also updates the week's LC progress.
  - The type isn't stored per day. A day stores its LeetCode counts per tier (easy, medium, hard); the week stores its LC progress, and the week-close record keeps count out of target (R5.8).
  - A decrement removes one solve of a chosen tier and reverses that tier's points.
  - A misc decrement lowers only the day's count, never weekly progress. Because types aren't stored per day, a day's count can end up below that day's weekly solves; that's accepted (2026-10-13).
  - History can edit a past day's count per tier, but never per type.
  - The UI shows the new counts and the points banner immediately.
  - This replaces R0.4 and fixes the weekly-stepper points bug. Ticket: M5-01.
- **R5.10** (Established) Check that LeetCode logging feels right with points once R5.17 lands.

### M6: Board departures log (Not started)

- **R6.1** (Established) A record view of postings that left the board or were removed as duplicates. This is separate from R0.2's deletion of open application tasks.
- **R6.2** (Established) Fields: title, company, location, and whether the posting had an open application task when it left.
- **R6.3** (Established) The log lives on the Status page and is designed for low scroll cost, for example per-day or per-week sections.
- **R6.4** (Established) Its purpose is to explain why an application task disappeared, complementing the urgency cues.
- **R6.5** (Established) Records start when M6 ships; past departures were never recorded.
- **R6.6** (Established) The log shows every departed posting except those already applied to. The subset that had an open application task is easy to pick out, by filter or highlight.
- **R6.7** (Established 2026-10-13) Entries are kept for 14 days, in per-day sections, with today expanded by default.

### M7: Cat Cake Collection v1 (Not started)

M7 is devoted to the gacha and spending points.

- **R7.1** (Established) Rewards is its own nav item and is a gacha only: the Cat Cake Collection. There is no self-care shop.
- **R7.2** (Established) Pulls spend points. Each spend is recorded in the ledger, and Rewards shows the balance. The Pull button is disabled whenever the balance is below the pull cost, which also covers a negative balance.
- **R7.3** (Established) The balance may go negative; clamping at 0 is removed. This replaces R4.5.
- **R7.4** (Established) v1 launches with 12 classic and 12 Collector's Edition (CE) designs:
  - the existing 6 + 6, with minor edits
  - a new set of 6 + 6 cats
- **R7.5** (Established) v1 is the working product. Ongoing design updates go to a separate feature, created only when needed.
- **R7.6** (Established) The pull banner loads quickly. The prototype is far too slow; recheck during implementation.
- **R7.8** (Established) Rewards hosts the points log, with a simple filter: earnings only, pulls only, or both. What a pull entry shows is decided in M7.
- **R7.9** (Established 2026-10-13; placement revisited in M7) The app includes a readable reference of the points rules, so they can be checked without leaving the app: the points formula, which reflection minutes edits move points (R5.30), weekly scoring, streaks (including that the weekly-goal streak earns nothing), achievements, and later the gacha rates. It's a tab in Rewards or Progress; which one is decided in M7, alongside M8's information architecture. (Proposed: it reads the same values the code uses, so it can't drift from the rules.)
- **R7.7** (Proposed; Q21) The gacha parameters from the prototype:
  - 180 points per pull; CE base rate 1.5%
  - soft pity from pull 13 (+8 percentage points per pull); hard pity at 20
  - friendship cap of 5 (6 copies)
  - duplicate refunds of 18 (classic) or 90 (CE)
  - a ×10 pull
  - the reveal never auto-advances; reduced motion is supported; designs stay readable at 48px; no new dependencies
  - a 10,000-run simulation test of the rates

### M8: Progress redesign, LeetCode tier polish, information architecture (Not started)

M8 follows M7, so Progress is redesigned knowing what Rewards covers.

- **R8.1** (Established) Fully redesign the Progress page. It is currently a stopgap host for the completions and points logs.
- **R8.2** (Established) The points log leaves Progress for Rewards (R7.8); completions stay on Progress. When the move happens is pending Q35.
- **R8.3** (Established) Polish the LeetCode tier stepper built in M5 (R5.20): show the increment and the tier in a visually appealing way.
- **R8.4** (Established) A past-work surface for completion and reflection history. Its name is open, and it may absorb or rename Progress.
- **R8.5** (Established) A design pass decides what lives where across Progress, past work, Rewards and Status: heatmaps, weekly counters, calendar, board departures, and points chrome.
- **R8.6** (Established) Home: explore showing Upcoming and recent completions side by side (or alternatives) once card density is known.
- **R8.7** (Established) Settle the entry points for linking reflections after the fact, against the chosen history page.

### Cross-cutting

- **RX.1** (Established) Remove the Prototype nav tab (`App.tsx`). Prototypes are reached by URL only.
- **RX.2** (Established) New F08 prototypes live under `apps/web/src/prototype/f08-<topic>/`, at routes `/prototype/f08/<topic>`, per `AGENTS.md`.
- **RX.3** (Established) Defunct prototypes (M1, M2, M4, and any superseded later ones) are deleted when their area is revisited, or together in a cleanup ticket before F08 closes. F08, not each milestone, waits on it. The shared prototype styles in `prototype/m4/` move or go with them.

## Behavior rules

- **B1** (Established) Weekly goals reset at the week boundary and never become overdue. When a week ends, its goal rows leave Home, the result is recorded (R5.8), points are awarded (R5.9), and open app tasks carry over (R5.11). Missed goals are never shown on Home; met ones get the congrats banner (R5.18).
- **B2** (Established) The week runs Monday to Sunday in the user's local time zone.
- **B3** (Established) Points are forward-only (R4.3). An item that earns once never earns again for the same completion (R4.10, R4.11).
- **B4** (Established, from M7) The balance may go negative. Spending is blocked whenever the balance is below the cost (R7.2, R7.3).
- **B5** (Superseded in M5 by R5.29) A deep-work unit always comes from a reflection (R2.4).
- **B6** (Established) The weekly LC label applies to LC only and clears at each week boundary (R5.5).
- **B7** (Established) Every path that completes the same kind of work has the same outcome: points, reflection transfer, actual time and weekly progress (R2.13, R5.17).

## Current behavior

Checked by reading code on 2026-10-12 and 2026-10-13, unless the notes say "per changelog" or "per user". Not run.

### M0

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| Gone postings delete their open application tasks and to-do application rows. Postings with applications are kept, with `removed_from_board_at` set | [`ingest.ts` L99–169](../../../apps/api/src/ingest.ts) | Conforms R0.2 | `todo` is a live status: each application task has a to-do application row behind it ([`tasks.ts` L370, L465, L649](../../../apps/api/src/tasks.ts)) |
| The Add Task form has the deadline/target choice | [`AddTaskForm.tsx`](../../../apps/web/src/pages/AddTaskForm.tsx) | Conforms R0.3 | |
| Weekly LC progress changes add the same delta to today's `leetcode_daily` with a direct write | [`weeklyGoals.ts` L330–354](../../../apps/api/src/weeklyGoals.ts) | Conforms R0.4; conflicts R5.17 | No points (see M4). Daily clicks don't move weekly progress |
| Upcoming range preset stored in `localStorage` | [`Home.tsx` L34–44](../../../apps/web/src/pages/Home.tsx) | Conforms R0.5 | |
| Applications sort frozen after load | [`Tasks.tsx`](../../../apps/web/src/pages/Tasks.tsx) | Conforms R0.1 | Per changelog |

### M1

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| `/tasks/:taskId` serves misc and application tasks, with checkable, draggable subtasks | [`TaskDetailPage.tsx`](../../../apps/web/src/pages/TaskDetailPage.tsx) | Conforms R1.2, R1.4 | |
| Countdown with 12-hour circles (`DeadlineUrgency`); circles only beside Home Targets day labels | [`TaskDetailPage.tsx` L355–360](../../../apps/web/src/pages/TaskDetailPage.tsx), Home | Conforms R1.3 | Home placement per user |
| The application page puts a status dropdown with Save, plus Documents and Link posting, in a left rail | [`ApplicationDetailPage.tsx` L257–295](../../../apps/web/src/features/applications/ApplicationDetailPage.tsx) | Conforms R1.5 | |
| Home Upcoming, Tasks titles and the Completed tab link to detail pages | `Home.tsx`, `Tasks.tsx` | Conforms R1.6–R1.8 | Per changelog |

### M2

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| A reflection links to a task or an application, not both; an interview step requires an application link | [`023_reflection_linking.sql` L37–40](../../../apps/api/src/sql/023_reflection_linking.sql), [`024_reflection_interview_step.sql` L11–14](../../../apps/api/src/sql/024_reflection_interview_step.sql) | Conforms R2.1, R2.1a | The database doesn't check that the step belongs to the application's thread; whether the UI limits the choice is unverified |
| The Tasks path moves the task's reflections to the application | [`tasks.ts` L880–916](../../../apps/api/src/tasks.ts) (transfer at L905) | Conforms R2.1b | |
| The Jobs path (card and detail) calls `POST /applications`, which completes the task with a bare update: no reflection transfer, no task actual minutes, no weekly apps check | [`JobsPage.tsx` L509–543](../../../apps/web/src/features/jobs/JobsPage.tsx), [`JobDetailPage.tsx` L152–182](../../../apps/web/src/features/jobs/JobDetailPage.tsx), [`applications.ts` L229–232](../../../apps/api/src/applications.ts), [`tasks.ts` L999–1013](../../../apps/api/src/tasks.ts) | Conflicts R2.1b, R2.10, R2.13 | Ticket M4-01. The +5 and the modal's reflection are correct ([`routes.ts` L429–452](../../../apps/api/src/routes.ts)) |
| To-do-backed applications are excluded from every list and search, and no UI link opens their page. The page is reachable only by URL; it preselects "applied", and saving acts as a first mark-applied | [`applications.ts` L95, L120](../../../apps/api/src/applications.ts), [`ApplicationDetailPage.tsx` L87, L261](../../../apps/web/src/features/applications/ApplicationDetailPage.tsx), [`routes.ts` L460–511](../../../apps/api/src/routes.ts) | Conflicts R2.21 | Not reachable through normal UI use. Ticket M4-01 |
| Migration 023 marked all existing reflections as deep work and cleared their links on first run | [`023_reflection_linking.sql` L1–23](../../../apps/api/src/sql/023_reflection_linking.sql) | Unspecified | Already applied; history only |
| Detail pages can link existing reflections or create new ones; History edit can link to work; lists are flat by date created | [`ReflectionsPanel.tsx`](../../../apps/web/src/features/reflections/ReflectionsPanel.tsx), `ProgressPage.tsx` | Conforms R2.2, R2.3 | |
| Deleting a task, application or interview step leaves its reflections unattached (`ON DELETE SET NULL`) | migrations 017, 023, 024 | Conforms R2.16 | |
| When both postings have applications, merge moves interview threads but not reflections, then deletes the removed application, leaving its reflections unattached | [`mergeDuplicatePostings.ts` L184–217](../../../apps/api/src/mergeDuplicatePostings.ts) | Conflicts R2.17 | Ticket M2-01 |
| Only misc tasks can be reopened | [`tasks.ts` L947–961](../../../apps/api/src/tasks.ts) | Conforms R2.18 | |
| The modal's reflection links to the application in mark-applied mode | [`routes.ts` L429–437](../../../apps/api/src/routes.ts) | Conforms R2.20 for applications | Misc-task link not re-verified |
| `deep_work` stored on the reflection, default on | [`ReflectionDraftFields.tsx` L24–28](../../../apps/web/src/features/completion/ReflectionDraftFields.tsx), [`progress.ts` L743](../../../apps/api/src/progress.ts) | Conforms R2.4; conflicts R5.29 | Retired by M5-14 |
| Shared `CompleteWorkModal`; `OptionalPanel` toggles, keeps text on collapse, confirms discard; defaults match R2.9 | [`CompleteWorkModal.tsx`](../../../apps/web/src/features/completion/CompleteWorkModal.tsx), [`OptionalPanel.tsx`](../../../apps/web/src/features/completion/OptionalPanel.tsx), [`FinishInterviewStepModal.tsx`](../../../apps/web/src/features/interviews/FinishInterviewStepModal.tsx) | Conforms R2.6–R2.9, R2.11 | Turning the reflection off in application mode clears its minutes but keeps its text (Unspecified) |
| Misc actual time: set in the modal, editable in Edit details, edits adjust points | [`routes.ts` L931–963](../../../apps/api/src/routes.ts) | Conforms R2.10 | |
| Reflection minutes can't be edited at all: the update accepts no minutes field. They can be entered at creation in the Progress compose form and the application and interview completion modals, but not in the misc completion modal (the task's actual time is used) or when creating from a detail page's Reflections panel | [`progress.ts` L790–865](../../../apps/api/src/progress.ts), [`CompleteWorkModal.tsx` L100–115](../../../apps/web/src/features/completion/CompleteWorkModal.tsx), [`ReflectionsPanel.tsx` L110–130](../../../apps/web/src/features/reflections/ReflectionsPanel.tsx) | Conflicts R5.19, R5.30 | M5-04 |
| Creating a reflection from a detail page's Reflections panel earns the standalone +20, since it's a create, not a link | [`ReflectionsPanel.tsx` L114](../../../apps/web/src/features/reflections/ReflectionsPanel.tsx), [`progress.ts` L772–785](../../../apps/api/src/progress.ts) | Conforms R4.4 | |

### M4

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| One earn per source item; a repeat returns the existing earn without adding points | [`pointsLedger.ts` L183–188](../../../apps/api/src/pointsLedger.ts) | Conforms R4.9, R4.10, R4.11 | This is why re-finishing an interview step doesn't earn again |
| Adjust keeps the earn's original amount and stores the current value in `meta.current_amount` | [`pointsLedger.ts` L402+](../../../apps/api/src/pointsLedger.ts) | Conforms R4.3 | |
| Reverse inserts a negative reverse event and marks the earn superseded; the earn keeps its amount | [`pointsLedger.ts` L228–299](../../../apps/api/src/pointsLedger.ts) | Conforms R4.3 | Fixed by M4-02. Migration 027 restored earns the old reverse had zeroed |
| Category totals sum `amount` over all events; a reversed earn nets to 0 in its category, and the totals sum to the balance | [`pointsLedger.ts` L107–121](../../../apps/api/src/pointsLedger.ts) | Conforms R4.1 | Fixed by M4-02 |
| Re-completing a reopened misc task brings its earn back at f(new actual) with an adjust event, so across reopen and re-complete it nets f(new) − f(old). The reflection add-on stays if the first completion had one | [`pointsAwards.ts` L46–116](../../../apps/api/src/pointsAwards.ts), [`pointsLedger.ts` L301–394](../../../apps/api/src/pointsLedger.ts) | Conforms R4.13 | Fixed by M4-03. The banner reads e.g. "complete again · +45 points (30 before reopen, net +15)" |
| Raising a day's LeetCode count from 0 brings the day's earn back at the new count's value | [`pointsAwards.ts` L231–241](../../../apps/api/src/pointsAwards.ts) | Conforms R4.4 | Fixed by M4-03. LeetCode changes have no banner yet; they show only in the points log. The banner comes with M5-01 |
| The points breakdown has one row for all tasks; task earns don't record the task's category | [`pointsLedger.ts` L107–121](../../../apps/api/src/pointsLedger.ts), [`pointsAwards.ts` L45–71](../../../apps/api/src/pointsAwards.ts) | Conflicts R5.21 | Ticket M5-03 |
| Lowering a day's LeetCode count adjusts or reverses its earn | [`pointsAwards.ts` L160–210](../../../apps/api/src/pointsAwards.ts) | Conforms R4.12 | |
| Balance clamped at 0 (`clampDeltaToBalance`; database check `balance_after >= 0`) | [`pointsFormulas.ts`](../../../apps/api/src/pointsFormulas.ts), [`025_points_ledger.sql` L20](../../../apps/api/src/sql/025_points_ledger.sql) | Conforms R4.5; conflicts R7.3 once M7 lands | Removing it needs a migration |
| The weekly stepper awards no LeetCode points and no weekly bonus | [`WeeklyGoalsBlock.tsx` L139–142](../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx), [`ProgressPage.tsx` L461–474](../../../apps/web/src/features/progress/ProgressPage.tsx), [`weeklyGoals.ts` L330–354](../../../apps/api/src/weeklyGoals.ts) | Conflicts R4.4, R5.17 | Fixed by M5-01 |
| Weekly bonuses are awarded immediately when a target is hit, from the daily stepper and Tasks paths only | [`progress.ts` L556–570](../../../apps/api/src/progress.ts), [`routes.ts` L1067–1081](../../../apps/api/src/routes.ts) | Conflicts R5.9 | Planned M5 change |
| Applications, interview steps and weekly bonuses are never reversed; misc reopen reverses | [`routes.ts` L1110–1121](../../../apps/api/src/routes.ts) | Conforms R4.10, R4.11 | |
| Progress Ledger tab: a Completions diary and a Points view | `LedgerCompletionsPanel.tsx`, `LedgerPointsPanel.tsx` | Conforms R4.1, R4.2, R4.8 | |

### M5 (existing behavior M5 builds on, from F07)

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| Weekly goals are rows per week (Monday start), created on first read | [`weeklyGoals.ts` L48–54, L223–267](../../../apps/api/src/weeklyGoals.ts) | Conforms B2, R5.7 | |
| The LC target carries forward (default 10); progress starts at 0 | [`weeklyGoals.ts` L212–221](../../../apps/api/src/weeklyGoals.ts) | Conforms R5.13 | |
| Open apps-goal members are moved (not copied) into the new week, so last week loses its result. Only the previous week is checked, so a week with no visits strands older members. Tagging a task removes its membership in every week | [`weeklyGoals.ts` L246–266, L389–395](../../../apps/api/src/weeklyGoals.ts) | Conflicts R5.8, R5.11 | Planned M5 change |
| LC progress is capped at the target | [`weeklyGoals.ts` L304–321](../../../apps/api/src/weeklyGoals.ts), [`WeeklyGoalsBlock.tsx` L62–66](../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx) | Conflicts R5.14 | Planned M5 change |
| Progress apps list has checkboxes (completing the task with no modal) and an Untag button | [`WeeklyGoalsBlock.tsx` L82–118](../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx) | Conflicts R5.4 | Planned M5 change |
| No LC label, weekly targets on Home, weekly records, congrats banner, partial points, streaks or achievements | none | Conflicts R5.5, R5.6, R5.8, R5.15, R5.16, R5.18 | Planned M5 work |
| M5 prototypes: two of three weekly-goal variants lack the LC label; Home targets render as overdue | `apps/web/src/prototype/m5/` | Conflicts R5.5, R5.7 | Superseded; redo under RX.2 |

### M6

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| Departed postings with no application are deleted outright; duplicate merges delete the Simplify row. No record is kept | [`ingest.ts` L141–169](../../../apps/api/src/ingest.ts), [`mergeDuplicatePostings.ts`](../../../apps/api/src/mergeDuplicatePostings.ts) | Unspecified | M6 writes a record before deletion |

### M7

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| A gacha prototype exists (lab, pull, collection) with 6 + 6 designs. Nothing writes to the ledger. A pull is blocked when the balance is negative | `apps/web/src/prototype/rewards/` | Unspecified | Unfinished (R7.4, R7.6); not under the RX.2 path; links to an ignored notes file |
| No rewards or spend events exist in the product | none | Conflicts R7.1–R7.3, R7.8 | Planned |

### Cross-cutting

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| A dev-only "Prototype" nav link points to `/prototype/m5` | [`App.tsx` L87](../../../apps/web/src/App.tsx) | Conflicts RX.1 | |
| No production code imports from `prototype/` | `apps/web/src` | Conforms | Deleting prototype folders is safe |
| The M1, M2 and M4 prototypes are still routed; the M5 and rewards prototypes import `prototype/m4/prototype-m4.css` | `apps/web/src/prototype/`, [`App.tsx` L18–160](../../../apps/web/src/App.tsx) | Conforms RX.3 | Deferred cleanup |

## Out of scope

- A full design-system migration (F09 handles only what M5 needs).
- Hosting or a portfolio demo (F06).
- Ongoing Cat Cake design drops after v1 (a future feature, R7.5).
- Un-applying or deleting an application from the UI. Tracked as a maintenance spike, [MT-05](../maintenance/tickets/MT-05-unapply-delete-application-spike.md).

## Open questions

Nothing that depends on an open question may be implemented.

| # | Question | Blocks | Due by |
|---|----------|--------|--------|
| Q7 | Keep the completion flourish at all? You lean toward removing it after the first prototype. If kept: which events trigger it, and does it replace `EarnFlash`? | R5.2 | M5 design |
| Q32 | LeetCode tier point values (easy, medium, hard). Medium is the reference, since past solves count as medium (today +30). Settled during M5 work, before M5-01's build. | R5.20, M5-01 | M5-01 build |
| Q15 | How do recurring instances earn points like normal tasks if the shared page handles all instances? Does each instance need its own actual time and metadata? | R3.8 | M3 design |
| Q20 | Rename the currency from "points"? Crumbs and Bakes are ruled out. | M7 | M7 design |
| Q21 | Gacha numbers. (a) The rate sweep assumes 160 points per pull, but the cost is 180. (b) ×10 is priced at 1,600, but 10 × 180 is 1,800. (c) New-CE protection is "Off" yet cited as making things easier. Also: ×10 vs ×5, automatic duplicate refunds, the earn rate, and rates for 24 designs instead of 12. With M5's weekly scoring and streaks, a strong week earns roughly 1,500 points (about 8 pulls at 180); price pulls against that. | R7.7 | M7 design |
| Q35 | Does the points log leave Progress in M7, when Rewards gets it, or stay on both until the M8 redesign? What does a pull log entry show? | R7.8, R8.2 | M7 design |

## Resolved questions

<details>
<summary>Resolved questions (45)</summary>

| # | Question | Answer (date) | Now in |
|---|----------|---------------|--------|
| Q1 | Week boundary | Always Monday to Sunday; legacy `CONTEXT.md` is wrong (2026-10-13) | B2 |
| Q2 | Open apps-goal tasks at week's end | Carry over after recording the result; a full week starts empty; 0/0 earns nothing (2026-10-13) | R5.11, R5.12 |
| Q3 | LC target carry-forward | Yes, since it's easy to edit (2026-10-13) | R5.13 |
| Q4 | Weekly record format; LC over target | One entry per goal per week; LC may exceed (2026-10-13) | R5.8, R5.14 |
| Q5 | LC label limits and placement | 50 characters; only on Progress and the Home target row (2026-10-13) | R5.5 |
| Q6 | Anything on Home after a missed week | Nothing for misses; a congrats banner for met targets (2026-10-13) | R5.18, M5-02 |
| Q8 | Was the time visualization built? | Yes, as the countdown with 12-hour circles (2026-10-13) | R1.3 |
| Q9 | One link per reflection | Yes, a task or an application (2026-10-13) | R2.1 |
| Q10 | Interview steps in linking | Sub-link of an application; lists are flat (2026-10-13) | R2.1a, R2.3 |
| Q11 | Where actual time is set | In the modal and in Edit details afterwards (2026-10-13) | R2.10 |
| Q12 | Deep work default | On for every reflection (2026-10-13) | R2.4 |
| Q13 | When should points reverse? | Applications never (they only move forward). Interview step reopen: no reverse and no re-grant. Weekly bonus: awarded at week close, so it never needs reversing. LC decrements reverse (verified) (2026-10-13) | R4.10–R4.12, R5.9 |
| Q14 | Negative balance | Allowed; clamping removed in M7 (2026-10-13) | R7.2, R7.3 |
| Q16 | Recurring instances stay overdue? | Yes; each instance has its own due date (2026-10-13) | R3.6 |
| Q17 | Departures log retention | 14 days, per-day sections, today expanded (2026-10-13) | R6.7 |
| Q18 | Rewards scope | M7 is Cat Cake Collection v1; later updates go to a future feature (2026-10-13) | R7.5 |
| Q19 | Self-care shop | Dropped; gacha only (2026-10-13) | R7.1 |
| Q22 | Which streaks and achievements exist? | Daily LC and apps streaks with small growing daily points plus milestone rewards; count-based achievements for applications, LC and interview steps per kind (higher reward); no "first of a kind". Numbers in Q42; weekly-goal streak in Q43 (2026-10-13) | R5.25–R5.27 |
| Q23 | Weekly goal scoring | +20 per completed tagged app or weekly LC solve, +100 flat when met; LC past the target keeps +20 each with no second flat (2026-10-13) | R5.15 |
| Q24 | Should daily clicks count toward weekly progress? | Replace daily/weekly with weekly-set vs other types through one write path (2026-10-13) | R5.17, M5-01 |
| Q25 | Where the two bugs go | Jobs path: M4-01, worked with M5. Weekly stepper: fixed by M5-01 (2026-10-13) | M4-01, M5-01 |
| Q26 | Application time after the fact | Editing reflection minutes adjusts points (2026-10-13) | R5.19 |
| Q27 | Milestone structure | M5 covers weekly goals, streaks, achievements and points rules; M8 covers the Progress redesign, after M7 (2026-10-13) | Milestones |
| Q28 | Reflection edge cases | Confirmed (2026-10-13) | R2.14–R2.20 |
| Q29 | Block status edits on to-do-backed applications? | Yes; the API rejects them and the page redirects to the task (2026-10-13) | R2.21 |
| Q30 | Which logs move to Rewards | The points log, with an earn/pull/both filter; completions stay on Progress (2026-10-13) | R7.8, R8.2 |
| Q31 | Prototype deletion vs milestone close | The feature, not the milestone, waits on deletion; `AGENTS.md` updated (2026-10-13) | RX.3 |
| Q32 (part) | Migrate existing LC counts to tiers? | No (2026-10-13). Point values stay open | R5.20 |
| Q33 | Re-completing a reopened misc task | Earns by the change in actual time, like an actual-time edit; the same time nets 0 (2026-10-13) | R4.13, M4-03 |
| Q34 | Difficulty tiers in M5 or M8? | Built in M5, since they change points going forward; polish in M8 (2026-10-13) | R5.20, R8.3, M5-01 |
| Q36 | Name for the non-weekly LeetCode type | "misc": weekly + misc (2026-10-13) | R5.17 |
| Q37 | LeetCode types and existing data | Past solves count as medium if shown by tier. No per-type edits in History. Days store only their aggregate count (per tier, see Q40), not per type; weekly progress lives on the week and its record (2026-10-13) | R5.17, R5.20 |
| Q38 | Congrats banner persistence | Shows once; × closes early; seen per week in `localStorage`. Standardize the pattern in `docs/design-system.md` when M5-02 ships. The Jobs ranking banner should behave the same, owned by F09 (2026-10-13) | R5.18, M5-02, F09 R.6 |
| Q39 | Which category gets a task's points? | Its category at completion, recorded on the earn; older earns fall back to the current category (2026-10-13) | R5.21, M5-03 |
| Q40 | LeetCode storage with tiers | Yes to all: counts per tier per day; decrement picks a tier; misc −1 never touches weekly progress, and a day below its weekly solves is accepted; History edits per tier (2026-10-13) | R5.17, M5-01 |
| Q41 | Points from deleted tasks in the category breakdown | One "Deleted tasks" row, shown only if non-zero (2026-10-13) | R5.21, M5-03 |
| Q42 | Streak and achievement numbers | The proposed numbers, as a starting point (2026-10-13) | R5.25, R5.26 |
| Q43 | Weekly-goal streak | Display only, no points; recorded in the spec and the in-app rules (2026-10-13) | R5.28, R7.9 |
| Q44 | Is a closed week's record fixed? | Yes, no grace window (2026-10-13) | R5.23 |
| Q45 | Streak points when days change after the fact | Awarded on the day's first qualifying action, reversed if that day drops to 0; past-day edits change only the displayed streak (2026-10-13) | R5.25 |
| Q46 | Counts and streaks from before M5 | Passed achievements unlock without points; running streaks keep earlier days, daily points from launch (2026-10-13) | R5.25, R5.26 |
| Q47 | Deep-work badges on the today strip | Deep work is retired in M5 (2026-10-13) | R5.27, R5.29 |
| Q48 | Matching edited reflection minutes to earns | Record the reflection id on new earns; older earns aren't adjusted (2026-10-13) | R5.19, M5-04 |
| Q49 | What replaces deep work on Progress | Reflections in general: heatmap and calendar marks count any reflection in the lane; the summary shows reflection minutes instead of a count (2026-10-13) | R5.29, M5-14 |
| Q50 | Reflection minutes model | Confirmed as written; part of the points rules and the in-app rules reference (2026-10-13) | R5.30, R7.9, M5-04 |

</details>

## Decisions log

- **2026-10-09:** M3 (recurring) was deferred so the M4 points ledger could ship first.
- **2026-10-12:** Weekly goals reset at the week boundary and never become overdue. Weekly results are recorded with the completion logs in M5. The LC label clears every week and is LC-only.
- **2026-10-12:** Prototype cleanup is F08 work, not maintenance. The existing M5 prototypes are superseded and redone under the `AGENTS.md` rules.
- **2026-10-13:** The week is Monday to Sunday.
- **2026-10-13:** Weekly goals: open app tasks carry over after the result is recorded. A full apps week starts empty. 0/0 earns nothing. The LC target carries forward. LC may exceed the target. Points are awarded at week close, and scoring will weigh partial progress and goal size (formula open). Met targets get a congrats banner on the next Home visit.
- **2026-10-13:** LeetCode logging becomes weekly-set vs other, through one server write path. This replaces the one-way weekly-to-daily copy and fixes the weekly-stepper points bug.
- **2026-10-13:** Rewards is a gacha only. M7 ships Cat Cake Collection v1 with 12 classic and 12 CE designs. Later updates go to a future feature, created when needed. The balance may go negative. Rewards hosts the points log with an earn/pull filter.
- **2026-10-13:** Settled as already satisfied:
  - the countdown with 12-hour circles is the time visualization
  - reflections have one link, with interview steps as sub-links of an application
  - deep work defaults on
  - actual time is set in the modal and in Edit details
  - the reflection edge cases R2.14–R2.20
- **2026-10-13:** Points never reverse for applications or interview steps; those items never earn twice. Editing reflection minutes adjusts points. Mark applied from Jobs must match Tasks (M4-01).
- **2026-10-13:** M5 covers weekly goals, streaks and achievements, and points rule changes. M8 (after M7) redesigns Progress and adds LC difficulty tiers. Order: M5, M7, M8, M3, M6.
- **2026-10-13:** Prototype deletion may be batched before F08 closes.
- **2026-10-13:** To-do-backed applications can't be edited as applications (R2.21). Departures are kept 14 days (R6.7).
- **2026-10-13:** LeetCode types are named weekly and misc. Difficulty tiers are built in M5 and polished in M8. Days store only an aggregate count; past solves count as medium.
- **2026-10-13:** Ledger fixes ticketed under M4, worked with M5: category totals double-subtract reversals (M4-02); re-completing a reopened task earns by the actual-time change (M4-03). Duplicate merges must move reflections (M2-01).
- **2026-10-13:** The points breakdown splits tasks by task category (R5.21, M5-03).
- **2026-10-13:** Un-applying or deleting applications stays out of F08, tracked as maintenance spike MT-05.
- **2026-10-13:** The congrats banner shows once and is the reference for a standard one-time notice in `docs/design-system.md`. Moving the Jobs ranking banner to it belongs to F09, not F08.
- **2026-10-13:** Task points belong to the category at completion. LeetCode days store counts per tier. R2.21 joins M4-01; the LeetCode re-earn bug joins M4-03.
- **2026-10-13:** Weekly scoring is +20 per unit and +100 flat when met. Weekly records start when week close ships, and weeks close on the first request after they end.
- **2026-10-13:** Streaks (LC, apps) earn small daily points plus milestone rewards; achievements are count-based, with interview steps per kind worth more. The today strip will show streaks instead of `x/3`.
- **2026-10-13:** Streak and achievement numbers set as a starting point. The weekly-goal streak is display only. Closed weeks are fixed. Deep work is retired in M5. The app gets an in-app rules reference, placed in M7. Weekly points, per-unit included, are all awarded at week close, so the congrats banner shows the full amount.
- **2026-10-13:** Reflections in general replace deep work on Progress: marks count any reflection, and the summary shows reflection minutes. The reflection minutes model (R5.30) is confirmed and belongs to the points rules, in-app too.
- **2026-10-13:** F09's visual-direction decisions (M0) are made during the M5 design pass, using the M5 prototypes as the test case. F09 M1 builds only the components M5 needs.
