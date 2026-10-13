# M5-04: Reflection minutes: editable everywhere, and edits adjust the points they created

**Status:** Ready
**Blocked by:** (none; M4-02 is done)
**Implements:** R5.19, R5.30 (from `../../spec.md`)
**Type:** build

## Current behavior (checked by reading, 2026-10-13)

- **Misc completion modal:** the time field is the task's actual time; the reflection has no minutes and is saved with none ([`CompleteWorkModal.tsx` L100–115](../../../../../apps/web/src/features/completion/CompleteWorkModal.tsx), [`routes.ts` L1004–1027](../../../../../apps/api/src/routes.ts)). The earn is the task's minutes plus a flat +20.
- **Application and interview completion modals:** the minutes field sits inside the reflection. They're saved on the reflection, copied to the application task's actual time, and scored as the reflection add-on ([`routes.ts` L400–452](../../../../../apps/api/src/routes.ts)).
- **Progress compose (standalone):** has a minutes field; earns 1 × minutes, or +20 if blank.
- **Detail-page Reflections panel, Create:** no minutes field; earns the standalone +20 ([`ReflectionsPanel.tsx` L110–130](../../../../../apps/web/src/features/reflections/ReflectionsPanel.tsx)).
- **Editing (History and the Reflections panel):** body, lane, deep work and link only. The API accepts no minutes ([`progress.ts` L790–865](../../../../../apps/api/src/progress.ts)).

## What to build

Per R5.30 (confirmed in Q50):

1. **Minutes everywhere:** every place that creates or edits a reflection offers minutes: Progress compose, History edit, the Reflections panel's create and edit, and the application and interview modals. The misc completion modal keeps the task's actual time as its one time field.
2. **Edits move points only where that reflection created them** (R5.19):
   - standalone reflection earn: re-scored at 1 × minutes, or +20 if blank
   - the reflection add-on of the application or interview earn it was written in: the add-on is re-scored, and the flat part (+5, or the step's kind points) is unchanged
   - no change for reflections linked later (they earned 0), or for the misc modal reflection (flat +20)
3. **Match by id (Q48):** new application and interview earns record the reflection's id. Earns from before this ticket don't, so their reflections' minutes edits move no points.
4. **Keep the application task in step:** editing an application modal reflection's minutes also updates the completed application task's actual time.

## Acceptance criteria

- [ ] Minutes can be entered and edited in every create and edit form listed above.
- [ ] Standalone reflection, 30 → 45 min: +15 adjust; 30 → blank: re-scored at +20.
- [ ] Application earned with a 30-min reflection, edited to 60: +30 adjust; the flat +5 is unchanged; the application task's actual time becomes 60.
- [ ] Interview step earned with a reflection: same behavior; the kind points are unchanged.
- [ ] A misc task's modal reflection, or a reflection linked later, edited: no points change.
- [ ] An application earn from before this ticket: a minutes edit changes no points.
- [ ] The points banner shows the change where the edit is made.
- [ ] Tests cover each case.

## Reuse notes

`adjustEarnAmount` ([`pointsLedger.ts` L307–350](../../../../../apps/api/src/pointsLedger.ts)) and the breakdown helpers in `pointsFormulas.ts`. `ReflectionDraftFields` already has the minutes input used by the modals; reuse it in the edit forms. Coordinate with M5-14, which removes the deep-work toggle from the same forms.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] Committed as `F08 M5-04: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
