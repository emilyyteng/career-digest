# M8-02: Progress nested shell and remove ledger framing

**Status:** Ready
**Blocked by:** (none)
**Implements:** R8.1, R8.2, R8.8, R8.9 (from `../../spec.md`)
**Type:** build

## What to build

Replace the single `ProgressPage` peer-tab stopgap with a Rewards-style nested shell:

| Route | Label |
|-------|--------|
| `/progress/week` | This week |
| `/progress/past` | Past work |
| `/progress/lifetime` | Lifetime |

`/progress` redirects to `/progress/week`. Top nav stays **Progress** and stays active for all `/progress/*`.

Remove the Progress **ledger** tab framing and the **Points** stub (`view=points` and the link-only panel). Completions move to Past work in M8-04; this ticket may leave Past work / Lifetime as placeholders that say which ticket owns them, or wire empty outlets — prefer thin placeholders so the shell ships alone.

Old `?tab=` / `?view=` URLs need not keep working unless cheap; if not, document the break in verification notes (no silent 404 — redirect ledger/points to Past work or Earnings as appropriate).

## Acceptance criteria

- [ ] Nav label Progress; `/progress` → `/progress/week`
- [ ] Shared Progress layout with subnav for week / past / lifetime (pattern from `RewardsLayout`)
- [ ] Ledger tab, Points subtab, and `view=points` stub are gone from Progress
- [ ] Placeholder or real child routes render without the old four-tab chrome
- [ ] Follows `docs/design-system.md`; no new global element CSS
- [ ] Builds follow the M8-01 verdict for shell/subnav labeling

## Reuse notes

[`RewardsLayout.tsx`](../../../../../apps/web/src/features/rewards/RewardsLayout.tsx) nested `Outlet` + subnav; [`App.tsx`](../../../../../apps/web/src/App.tsx) routes; current [`ProgressPage.tsx`](../../../../../apps/web/src/features/progress/ProgressPage.tsx) to be split across child pages in M8-03–M8-05.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M8-02: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(Filled in when done.)
