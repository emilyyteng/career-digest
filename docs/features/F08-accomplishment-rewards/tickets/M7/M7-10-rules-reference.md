# M7-10: Rewards Rules reference

**Status:** Draft
**Blocked by:** M7-05; gacha constants available from API or shared module used by M7-04
**Implements:** R7.9 (from `../../spec.md`)
**Type:** build

## What to build

`/rewards/rules` with two sections:

1. **Earning** — Seed formula (bases, time, reflections), weekly scoring, daily streaks (and that the weekly-goal streak earns nothing), achievements. Values come from the same modules/constants the API uses (`pointsFormulas.ts` / achievement tables), not hand-copied markdown that can drift.
2. **Spending (gacha)** — cost 180 / ×10 1,800, CE rate and pity ladder, friendship (6 kept), manual refunds only after friendship is maxed (copies above 6; +18 classic / +90 CE), Day/Night skin rule (2nd CE copy).

Readable prose; not a dump of code. Progress does not host this reference.

## Acceptance criteria

- [ ] Both sections are present on `/rewards/rules`.
- [ ] Displayed numbers match live constants (test or snapshot that Rules reads exported values).
- [ ] Weekly-goal streak called out as display-only / no currency earn; currency name comes from the shared display-name constant (R7.10).
- [ ] Night skin rule described accurately (unlock on second CE copy; toggle; not a separate pity pool).
- [ ] Refund rule described accurately: only copies above 6 after friendship is maxed.
- [ ] Follows design-system typography/layout variants.

## Reuse notes

[`pointsFormulas.ts`](../../../../../apps/api/src/pointsFormulas.ts), achievement definitions from M5-11, gacha config module from M7-04. Prefer importing shared constants into the web app (or a small `/api/rewards/rules` that returns them) over duplicating.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] Committed as `F08 M7-10: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
