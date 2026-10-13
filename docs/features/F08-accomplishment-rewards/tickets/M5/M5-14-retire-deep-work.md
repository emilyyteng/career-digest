# M5-14: Retire deep work

**Status:** Done
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

- [x] No reflection form shows a deep-work toggle; creating a reflection without one works everywhere.
- [x] The today strip has no deep-work badges on Home or Progress.
- [x] A day with a reflection that was saved with deep work off now shows the lane mark on the heatmap and History calendar.
- [x] The week and month summaries show the number of reflections, counting those saved with deep work off.
- [x] No points change (deep work never affected points).
- [x] Existing tests that assert deep-work behavior (`progress.api.test.ts`) are updated to the new behavior, not deleted wholesale.

## Reuse notes

Search for `deepWork`, `deep_work` and `effort*` across `apps/api/src` and `apps/web/src` (about 20 files). Coordinate with M5-04, which edits the same forms.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] Committed as `F08 M5-14: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

Done 2026-10-13.

- **API.** `deepWork` is no longer accepted by any route (Progress create and patch, mark applied from Tasks or Jobs or manual add, interview step finish) and no longer returned by Progress today, day, outcome or reflections, or by the completions diary. `createReflectionLog` and `updateReflectionLog` don't write `deep_work`, so new rows get the column default (`true`). An old client that still sends `deepWork` is ignored, not rejected.
- **Progress.** `effortDaysByLane` dropped its `AND deep_work` filter, so the heatmap and History calendar marks, and the today flags, count any reflection in the lane. The outcome field `deepWorkUnits` is renamed `reflectionsWritten` and counts every reflection in the period. The summary reads "N reflections", and the heatmap legend and tooltip say "reflection".
- **Web.** `DeepWorkToggle` is deleted, and so are its uses in the completion modals, Progress compose and History edit, and the Reflections panel. The "dw" tags on reflection rows and in the Ledger completions list are gone, the today strip's badges are removed, and the dead CSS for all of these is deleted. The prototypes under `apps/web/src/prototype/` keep their own local toggles and were not touched.
- **Demo seed** no longer sets `deep_work`. The test harness's `seedReflectionLog` keeps its `deepWork` option, so tests can seed legacy rows saved with deep work off.
- **Tests (checked by running `npm run check`, 218/218).** In `progress.api.test.ts`, the today test now asserts that a legacy deep-work-off row lights its lane; the outcome test counts 3 reflections including a deep-work-off one; a new heatmap test marks a day from a deep-work-off reflection; the create, day and patch tests assert that `deepWork` is no longer in the response. The today assertion in "accepts other lane and task link" used to pass only because the database stamped the reflection with the real date while the test clock was faked; it now backfills to the faked day so the assertion means something.
- **Not checked in a browser.** The UI changes were checked by reading and the web build only.
- **Points.** No points code was touched; deep work never fed points.
