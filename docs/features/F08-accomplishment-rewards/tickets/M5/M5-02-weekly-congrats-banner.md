# M5-02: Weekly targets congrats banner on Home

**Status:** Draft (waits on M5-05; M5-06 verdict in)
**Blocked by:** M5-05 (M5-06 done)
**Implements:** R5.18 (from `../../spec.md`)
**Type:** build

## What to build

After the week resets, the first time the user opens Home they see one congratulations banner covering last week's met targets.

- **Content:** it names the targets that were met (apps, LC, or both), the count out of the target for each (for example `Apps 10/10 · LC 12/10`), and the points each met goal earned at week close (R5.15: +20 per unit plus the +100 flat, for example `Apps 10/10 · +300`). All weekly points, per-unit included, are awarded at week close, so the banner shows that full amount (confirmed 2026-10-13). It also shows each met goal's weekly streak (R5.28), worded as chosen in M5-07.
- **Only for met targets:** if neither target was met, no banner appears. Missed goals are never shown on Home (B1).
- **Shows once** (Q38, 2026-10-13): × closes it early. It's marked seen per week in `localStorage` as soon as it's shown, so it's gone on the next visit whether or not it was closed.
- **Standardize it:** this is the first "one-time notice". Once it works, document the pattern in `docs/design-system.md` (alongside the transient flash, `EarnFlash`) so later banners pick one of the two instead of inventing a third. Moving the Jobs ranking banner onto this pattern is F09's job (F09 R.6), not this ticket's.

**Design (M5-06 verdict, Q4 variant B, 2026-10-13):** inside the Home hero card under the greeting. Heading `You hit last week's target` (one met) or `targets` (both), the week label, one row per met goal (`LC 12/10 · 12 × 20 + 100`, points right-aligned), and a total when both were met. × dismisses. Reference: `/prototype/f08/weekly/congrats`. Streak wording comes from M5-07 Q5.

## Acceptance criteria

(Draft. Finalize after M5-06.)

- [ ] Both met: one banner naming apps and LC, with both counts and the combined target points.
- [ ] One met: the banner names only that target, its count, and its points.
- [ ] Neither met: no banner.
- [ ] A 0/0 apps week never counts as met (R5.12).
- [ ] The banner reads from the week-close record (R5.8), not recomputed live, so it matches the completion logs.
- [ ] The banner shows on the first Home visit after the reset, even if that's days into the new week.
- [ ] Leaving Home and coming back, or reloading, doesn't show it again, whether or not × was pressed.
- [ ] × hides it immediately.
- [ ] The next week's banner (if earned) shows normally; the seen mark is per week.
- [ ] `docs/design-system.md` describes both banner patterns (transient flash and one-time notice): when to use each, dismissal, and persistence.

## Design questions (prototype tickets only)

1. Placement and visual treatment on Home, within the design system.

## Reuse notes

Home has no banners today. The two existing banners behave differently (surveyed 2026-10-13):

- `EarnFlash` ([`EarnFlash.tsx`](../../../../../apps/web/src/features/completion/EarnFlash.tsx)) hides itself after about 4 seconds and has a × button.
- The Jobs rank-batch banner ([`JobsPage.tsx` L114–175](../../../../../apps/web/src/features/jobs/JobsPage.tsx)) stays until dismissed with ×. Dismissals are remembered per batch in `sessionStorage`, so they survive reloads in the same tab but not a new tab. A successful batch older than 30 minutes hides on its own.

Build the one-time notice as a reusable design-system variant (not one-off CSS), so F09 can move the Jobs banner onto it.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Banner patterns written into `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F08 M5-02: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(Filled in when done.)
