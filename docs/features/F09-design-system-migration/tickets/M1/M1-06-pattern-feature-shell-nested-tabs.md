# M1-06: Pattern — feature shell vs nested tabs (Q9 / Q15)

**Status:** In progress
**Blocked by:** (none) — lock before deep Progress/Rewards waves
**Implements:** R.8, R1.2, Q9, Q15
**Type:** docs
**Scheduled with:** narrow prototype to judge the proposed nesting rule + filter placement

## What to build

Lock one app rule for **feature shells + subnav** vs **in-page tabs** vs filters: how nested levels (e.g. Progress This week / Past work / Lifetime) are represented once containment is already “all carded.” Record the rule in `docs/design-system.md` (or a short app-shell note if IA-only). M0 stress samples do not decide this.

**Proposed approach (for prototype judgment):**

| Role | When | Control |
|------|------|---------|
| Feature shell + subnav | Peer destinations (Progress; Rewards) | Nested routes + `ChromeTab` `subnav` |
| Page tabs | Same resource, peer partitions (Jobs, Tasks, …) | `ChromeTab` `page` |
| Filters / modes | Narrow within a partition | `Segmented` / quiet chips — never ChromeTab |

**Page chrome anatomy (liked in prototype):** inside one card — **title → tabs/subnav → (optional L2 filter) → content**. Nothing on the pink desk outside the card. Filter placement relative to tabs is still open (prototype `?filter=`).

Chrome budget: app nav → **one of** {shell subnav, page-tab row} → ≤1 L2 filter → content. Never two ChromeTab rows stacked. Calendar/day = content chrome. Top nav kept (no side nav in M1). Progress + Rewards are conforming targets for later waves (Past work ledger type tabs demote to Segmented).

**Deferred migrations (do not do in this ticket):**

- Jobs / Applications / Interviews still use legacy `.tab` / `.tab.on` blue — migrate to `ChromeTab` **after** this nesting + filter rule locks (M2 wave; noted on board + design-system).
- In-content link hover app-wide → [M1-16](./M1-16-in-content-link-hover.md) (Home already matches; globals still blue/purple).

## Acceptance criteria

- [ ] Spec Q9 and Q15 answered (or Q15 narrowed with explicit remaining open bits)
- [ ] Documented standard: when to use nested routes + subnav, peer tabs, and filters; how subnav relates visually to app nav; filter placement; containerized page chrome
- [ ] Progress and Rewards called out as conforming targets for later waves
- [ ] Legacy Jobs/Applications/Interviews tab chrome noted for M2 migration
- [ ] Prototype design questions answered (or narrowed); URL + verdict recorded
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Does underline `ChromeTab` at **subnav** scale read quieter than app nav (same language, smaller)?
2. Is one L2 **Segmented** row enough under Past work (Completions / Points / Reflections) vs nested type tabs?
3. Does the chrome budget feel right in practice: app nav → one of {shell, page tabs} → ≤1 L2 → content?
4. **Filter placement** relative to tabs: below full-width · below right-aligned · same row (tabs left / filter right) · shared toolbar track · recessed strip · in header beside title?
5. Confirm **title → tabs → filter → content** all inside one card (full containment).

Prototype URL: `/prototype/f09/nesting`

Surfaces (← / →): A Progress week · B Past work proposed · C Jobs · D Rewards · E anti-pattern. Sidebar: `?filter=` placement axis (A–C).

## Reuse notes

- M0-01 findings §§12–13 (nav depth); lab Completions underline
- Production `ChromeTab` / `Segmented` / `Badge` (Ink desk, M1-15)
- Existing `ProgressLayout` / `RewardsLayout` as conforming targets

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
