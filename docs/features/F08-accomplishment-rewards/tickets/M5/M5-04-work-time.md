# M5-04: Time belongs to the work; reflections are flat +20 notes; misc tasks get a +10 base

**Status:** Ready
**Blocked by:** M4-01 (done: one mark-applied operation to extend, `markApplied.ts`)
**Implements:** R5.31 (from `../../spec.md`); supersedes R5.19 and R5.30
**Type:** build

## Current behavior (checked by reading, 2026-10-13)

- **Misc completion modal:** the time field is the task's actual time; the reflection has no minutes and is saved with none ([`CompleteWorkModal.tsx` L100–115](../../../../../apps/web/src/features/completion/CompleteWorkModal.tsx), [`routes.ts` L1004–1027](../../../../../apps/api/src/routes.ts)). The earn is the task's minutes (15 if blank, [`pointsFormulas.ts` L44–51](../../../../../apps/api/src/pointsFormulas.ts)) plus a flat +20 for a reflection. R5.31 replaces the 15 default with a flat +10 base.
- **Application and interview completion modals:** the minutes field sits inside the reflection. They're saved on the reflection, copied to the application task's actual time, and scored as the reflection add-on: 1 × minutes, or +20 if blank, and nothing without a reflection ([`routes.ts` L400–452](../../../../../apps/api/src/routes.ts), `pointsFormulas.ts`).
- **Progress compose (standalone):** has a minutes field; earns 1 × minutes, or +20 if blank.
- **Detail-page Reflections panel, Create:** no minutes field; earns the standalone +20 ([`ReflectionsPanel.tsx` L110–130](../../../../../apps/web/src/features/reflections/ReflectionsPanel.tsx)).
- **Editing:** reflections' minutes can't be edited ([`progress.ts` L790–865](../../../../../apps/api/src/progress.ts)). Applications and interview steps have no actual-time field of their own.

## What to build

Per R5.31:

1. **Work time fields.**
   - Applications get an actual time, stored on the application, since some applications have no task (Proposed: a new `applications.actual_minutes` column). An application task's actual time shows the application's.
   - Interview steps get an actual time (new `application_steps.actual_minutes` column).
   - Both are entered in their completion modals, in the same place the misc modal has its time field, outside the reflection panel.
   - Both are editable afterwards: on the application page, and on a finished step in the interview workspace (Proposed placements; settle in the M5 design pass if they don't fit).
2. **Scoring** (`pointsFormulas.ts`):
   - application: +5 + 1 × actual minutes + 20 if a reflection was written in the modal
   - interview step: kind points + 1 × actual minutes + 20 if a reflection was written
   - standalone reflection: flat +20, whatever form it's created from
   - misc: +10 + 1 × actual minutes + 20 if a reflection was written. Replace `POINTS.miscTaskDefaultMinutes` (15, used only for blank time) with a flat misc base of 10 that always applies, next to `applicationBase` ([`pointsFormulas.ts` L6, L44–51](../../../../../apps/api/src/pointsFormulas.ts)). Blank or negative time adds 0.
   - Every kind of work has a flat base (misc +10, application +5, interview by kind), and blank time adds 0 for all of them.
3. **Edits adjust points.** Editing an application's or step's time adjusts its earn with an adjust event, the same way misc actual-time edits do (`adjustTaskCompleteActual`). Earns from before this ticket are re-scored under the current formula on their first edit, and old misc earns also on re-complete after a reopen (M4-03's reinstate already targets the current formula). So an old misc earn that got 15 for blank time becomes 20 when 10 minutes are entered, or 10 when it's re-completed blank.
4. **Reflections lose minutes.** Remove the minutes input from every reflection form (`ReflectionDraftFields`, Progress compose in `ReflectionAccordion.tsx`). Time spent outside a task, application or interview is then logged as a misc task. The API stops accepting and returning reflection minutes. The `reflection_logs.actual_minutes` column stays, unused.
5. **Migration:** for reflections written with an application or interview step that have minutes, copy them onto that work if it has no time yet (for applications, the application task's existing actual time counts as the application's). Past earns aren't touched.

## Acceptance criteria

- [ ] No reflection form has a minutes field; creating a reflection from any form earns +20.
- [ ] Mark applied with 60 min and a reflection: +85 (5 + 60 + 20). With 60 min and no reflection: +65. With no time and no reflection: +5.
- [ ] Interview step finish (technical, 80) with 30 min and no reflection: +110; with a reflection: +130.
- [ ] Editing an application's time from 60 to 90 adds a +30 adjust; to 0 (blank) adds −60. The application is never reversed.
- [ ] Editing a finished step's time adjusts its earn the same way; reopening and re-finishing the step still earns nothing again (R4.11).
- [ ] An application from before this ticket: its time shows the task's (or the copied reflection's) minutes; its earn is unchanged until its time is edited.
- [ ] Misc completion with 30 min: +40 (was 30); with 30 min and a reflection: +60; with no time and no reflection: +10 (was 15); with no time and a reflection: +30 (was 35).
- [ ] A misc earn from before this ticket keeps its points (including a blank-time 15) until it's re-scored: editing its time to 10 min makes it 20; reopening and re-completing it blank makes it 10.
- [ ] No points rule has a default for blank time (`miscTaskDefaultMinutes` is gone); each kind of work's base is a named constant.
- [ ] The points banner shows the change where an edit is made.
- [ ] The application task's actual time and the application's time never disagree.
- [ ] Tests cover each case, including the migration copy.

## Reuse notes

- `adjustEarnAmount` and `adjustTaskCompleteActual` for edits; the breakdown helpers in `pointsFormulas.ts` for scoring.
- `CompleteWorkModal`'s misc time field for the application and interview modals.
- Extend M4-01's single mark-applied operation (`markApplied` in `markApplied.ts`): the time moves from the task's `actual_minutes` to the application there, in one place.
- Coordinate with M5-14, which removes the deep-work toggle from the same reflection forms.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] Committed as `F08 M5-04: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
