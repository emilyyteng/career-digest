# M5-04: Editing a reflection's minutes adjusts its points

**Status:** Draft (open: spec Q48)
**Blocked by:** M4-02 (adjust and reverse storage settled first)
**Implements:** R5.19 (from `../../spec.md`)
**Type:** build

## What to build

Changing a reflection's minutes after the fact moves the points that came from those minutes, with an adjust event. This is how applications get their time corrected, since they have no actual-time edit (R2.10).

- **Standalone reflection earn** (`reflection_create`, [`pointsAwards.ts` L133+](../../../../../apps/api/src/pointsAwards.ts)): re-scored at 1 × minutes, or +20 if blank.
- **Reflection add-on of an application or interview step earn** (meta `reflection_minutes`, [`pointsAwards.ts` L95, L126](../../../../../apps/api/src/pointsAwards.ts)): the add-on part is re-scored; the flat part (+5, or the step's kind points) is unchanged.
- **Unaffected:** a misc task's reflection add-on is a flat +20; reflections linked later earned 0 and stay 0 (R2.19).
- **Matching a reflection to its earn:** those earns don't record which reflection they came from. Per the Q48 recommendation, new earns record the reflection id, and earns from before this ticket aren't adjusted.

Edits come through `updateReflectionLog` ([`progress.ts` L790+](../../../../../apps/api/src/progress.ts)), from Progress History and the detail-page Reflections panel.

## Acceptance criteria

(Draft. Finalize after Q48.)

- [ ] Standalone reflection, 30 → 45 min: +15 adjust; 30 → blank: re-scored at +20.
- [ ] Application earned with a 30-min reflection, edited to 60: +30 adjust; the flat +5 is unchanged.
- [ ] Interview step earned with a reflection: same behavior; the kind points are unchanged.
- [ ] A misc task's modal reflection edited: no points change.
- [ ] A reflection linked after the fact, edited: no points change.
- [ ] The points banner shows the change where the edit is made.
- [ ] Tests cover each case, including an earn from before this ticket (unchanged).

## Reuse notes

`adjustEarnAmount` ([`pointsLedger.ts` L307–350](../../../../../apps/api/src/pointsLedger.ts)) and the breakdown helpers in `pointsFormulas.ts`. Don't add a second formula path.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Reuse check done
- [ ] Committed as `F08 M5-04: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
