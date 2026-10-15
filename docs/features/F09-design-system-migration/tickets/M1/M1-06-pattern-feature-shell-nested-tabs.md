# M1-06: Pattern — feature shell vs nested tabs (Q9 / Q15)

**Status:** Draft
**Blocked by:** (none) — can proceed in parallel with Track A after M1-01 if a prototype is needed; lock before deep Progress/Rewards waves
**Implements:** R.8, R1.2, Q9, Q15
**Type:** docs
**Scheduled with:** optional narrow prototype if design questions need variants

## What to build

Lock one app rule for **feature shells + subnav** vs **in-page tabs** vs filters: how nested levels (e.g. Progress This week / Past work / Lifetime) are represented once containment is already “all carded.” Record the rule in `docs/design-system.md` (or a short app-shell note if IA-only). M0 stress samples do not decide this.

## Acceptance criteria

- [ ] Spec Q9 and Q15 answered (or Q15 narrowed with explicit remaining open bits)
- [ ] Documented standard: when to use nested routes + subnav, peer tabs, and filters; how subnav relates visually to app nav (same chrome-tab language, quieter scale, etc.)
- [ ] Progress and Rewards called out as conforming targets for later waves
- [ ] If a prototype was needed: ticket lists design questions, URL, and verdict
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

Only if a prototype is cut from this ticket:

1. Subnav as second chrome-tab row vs underline tabs vs route labels only?
2. Max stacked horizontal chrome bands before content?

Prototype URL: (if any) `/prototype/f09/…`

## Reuse notes

- M0-01 findings §§12–13 (nav depth); lab subnav samples
- Existing `ProgressLayout` / `RewardsLayout`

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-06: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
