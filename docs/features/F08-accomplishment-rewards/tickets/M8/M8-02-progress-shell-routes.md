# M8-02: Progress nested shell and remove ledger framing

**Status:** Done
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

- [x] Nav label Progress; `/progress` → `/progress/week`
- [x] Shared Progress layout with subnav for week / past / lifetime (pattern from `RewardsLayout`)
- [x] Ledger tab, Points subtab, and `view=points` stub are gone from Progress
- [x] Placeholder or real child routes render without the old four-tab chrome
- [x] Follows `docs/design-system.md`; no new global element CSS
- [x] Builds follow the M8-01 verdict for shell/subnav labeling

## Reuse notes

[`RewardsLayout.tsx`](../../../../../apps/web/src/features/rewards/RewardsLayout.tsx) nested `Outlet` + subnav (no Seeds chrome on Progress); [`App.tsx`](../../../../../apps/web/src/App.tsx) routes. Unrouted [`ProgressPage.tsx`](../../../../../apps/web/src/features/progress/ProgressPage.tsx) kept as source for M8-03–M8-05. Subnav CSS mirrors Rewards tokens/classes pattern under `.progress-shell`.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M8-02: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- Nested routes wired; top nav still `Progress` and matches all `/progress/*`.
- Child pages are thin placeholders naming M8-03 / M8-04 / M8-05.
- Old query redirects on `/progress`: `tab=ledger&view=points` → `/rewards/earnings`; `tab=ledger` or `history` → `/progress/past`; `tab=achievements` → `/progress/lifetime`; else → `/progress/week`.
- Unrouted `ProgressPage.tsx` still contains the old four-tab + Points stub code (not reachable). `LedgerPointsPanel.tsx` is unused.
- `npm run check` green (typecheck, web build, 341 API tests).
- No new tests (routing/shell only; no API change).
- Commit: `a94075b`.
