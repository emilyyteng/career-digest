# M1-06: Pattern — feature shell vs nested tabs (Q9 / Q15)

**Status:** Done
**Blocked by:** (none)
**Implements:** R.8, R1.2, Q9, Q15
**Type:** docs
**Scheduled with:** prototype `/prototype/f09/nesting`

## What to build

Lock one app rule for **feature shells + subnav** vs **in-page tabs** vs filters. Record the rule in `docs/design-system.md`.

## Acceptance criteria

- [x] Spec Q9 and Q15 answered (Q15 remaining: width/wrap → M1-08; paired heights → M1-07)
- [x] Documented standard in `docs/design-system.md` (Page chrome / nesting)
- [x] Progress and Rewards called out as conforming targets for later waves
- [x] Legacy Jobs/Applications/Interviews tab chrome noted for M2 migration
- [x] Prototype design questions answered; URL + verdict recorded
- [x] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Subnav scale vs app nav — same underline ChromeTab language, quieter size: **accepted**
2. L2 under Past work — chips not nested tabs: **accepted** (squared chip row)
3. Chrome budget — app nav → one tab row → ≤1 chip row: **accepted**
4. Filter control — **squared chip row** (not rounded Segmented; not select)
5. Filter placement — **below tabs, left-aligned**
6. Containerized title → tabs → chips → content: **accepted**

Prototype URL: `/prototype/f09/nesting` — keep as reference until no open ticket needs it.

## Reuse notes

- Production `ChromeTab` / `Segmented` / `Badge`; ProgressLayout / RewardsLayout as shell targets
- Shared FilterChips helper deferred until first surface migrate (M2 Jobs or Progress Past work)

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-06: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15 verdicts:**

| Axis | Lock |
|------|------|
| Page chrome | Containerized: title → ChromeTab → optional chips → content inside one card |
| Shell vs page tabs | Progress/Rewards = shell+subnav; list partitions = page tabs |
| Filters | Squared chip row, below tabs, left-aligned; never ChromeTab; not Segmented as page L2 |
| Budget | L0 + one tab row + ≤1 chip row; no stacked ChromeTabs; calendar = content; top nav kept |

R.8 → Established. Spec Q9/Q15 → Resolved. Prototype last commit before lock: `7d26feb` (control exploration); lock docs commit below.

`npm run check` pass (docs).
Commit: (filled on commit)
