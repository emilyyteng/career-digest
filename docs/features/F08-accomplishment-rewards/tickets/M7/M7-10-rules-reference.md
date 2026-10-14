# M7-10: Rewards Rules reference

**Status:** Done
**Blocked by:** M7-05; gacha constants available from API or shared module used by M7-04
**Implements:** R7.9 (from `../../spec.md`)
**Type:** build

## What to build

`/rewards/rules` with two sections:

1. **Earning** — Seed formula (bases, time, reflections), weekly scoring, daily streaks (and that the weekly-goal streak earns nothing), achievements. Values come from the same modules/constants the API uses (`pointsFormulas.ts` / achievement tables), not hand-copied markdown that can drift.
2. **Spending (gacha)** — cost 180 / ×10 1,800, CE rate and pity ladder, friendship (6 kept), manual refunds only after friendship is maxed (copies above 6; +18 classic / +90 CE), Day/Night skin rule (2nd CE copy).

Readable prose; not a dump of code. Progress does not host this reference.

## Acceptance criteria

- [x] Both sections are present on `/rewards/rules`.
- [x] Displayed numbers match live constants (test or snapshot that Rules reads exported values).
- [x] Weekly-goal streak called out as display-only / no currency earn; currency name comes from the shared display-name constant (R7.10).
- [x] Night skin rule described accurately (unlock on second CE copy; toggle; not a separate pity pool).
- [x] Refund rule described accurately: only copies above 6 after friendship is maxed.
- [x] Follows design-system typography/layout variants.

## Reuse notes

`GET /api/rewards/rules` via `getRewardsRulesPayload()` reading `POINTS`, `ACHIEVEMENT_CATALOG`, `GACHA_CONFIG`. Web `RulesPage` + `CURRENCY_DISPLAY`.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] Committed as `F08 M7-10: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Unit test asserts payload equals live exports (pity ladder pull 13/20).
