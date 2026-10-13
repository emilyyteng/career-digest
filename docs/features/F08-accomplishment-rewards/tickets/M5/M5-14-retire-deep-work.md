# M5-14: Retire deep work

**Status:** Ready
**Blocked by:** (none)
**Implements:** R5.29 (from `../../spec.md`)
**Type:** build

## What to build

Deep work stops being a concept in the UI and the API's outputs:

- The deep-work toggle leaves every reflection form: the completion modals ([`ReflectionDraftFields.tsx` L24–28](../../../../../apps/web/src/features/completion/ReflectionDraftFields.tsx)), Progress compose and History edit (`ReflectionAccordion.tsx`), and the Reflections panel.
- The today strip's deep-work badges go ([`TodayStrip.tsx` L58–65](../../../../../apps/web/src/features/progress/TodayStrip.tsx)). M5-12 then replaces the `x/3` counts with streaks.
- Reflections in general replace deep work on Progress (R5.29, Q49):
  - The per-lane marks on the heatmap and History calendar ([`progress.ts` L293–310](../../../../../apps/api/src/progress.ts), `effortDaysByLane`; drawn in `ProgressHeatmap.tsx` and `HistoryCalendar.tsx`) count any reflection in the lane, not only deep-work ones. The heatmap tooltip's "· deep work" becomes "· reflection".
  - The week and month summary's "N deep work" (`countDeepWorkReflectionsInRange`, [`progress.ts` L425](../../../../../apps/api/src/progress.ts); shown at `ProgressPage.tsx` L448 and L455) becomes the number of reflections written in the period.
- The `deep_work` column stays in the database, unused, with no migration, so no history is lost. The API stops requiring or returning it.

## Acceptance criteria

- [ ] No reflection form shows a deep-work toggle; creating a reflection without one works everywhere.
- [ ] The today strip has no deep-work badges on Home or Progress.
- [ ] A day with a reflection that was saved with deep work off now shows the lane mark on the heatmap and History calendar.
- [ ] The week and month summaries show the number of reflections, counting those saved with deep work off.
- [ ] No points change (deep work never affected points).
- [ ] Existing tests that assert deep-work behavior (`progress.api.test.ts`) are updated to the new behavior, not deleted wholesale.

## Reuse notes

Search for `deepWork`, `deep_work` and `effort*` across `apps/api/src` and `apps/web/src` (about 20 files). Coordinate with M5-04, which edits the same forms.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] Committed as `F08 M5-14: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
