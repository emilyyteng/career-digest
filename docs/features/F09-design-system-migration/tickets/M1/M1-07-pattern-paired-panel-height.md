# M1-07: Pattern — paired panel height and in-panel overflow (Q16)

**Status:** Draft
**Blocked by:** (none) — decide before Progress dual-column waves; Home pilot (M1-05) does not require this
**Implements:** R1.2, Q16 (paired panel heights)
**Type:** docs
**Scheduled with:** optional prototype / stress frame if needed to lock the rule

## What to build

Lock the **vertical height policy** for multi-column layouts: sibling panels share a defined height (page content region or row track); extra content scrolls **inside** the panel (`overflow: auto`) so columns end on one baseline. This addresses Progress Past work (and similar) where columns currently end at different heights. Single-column pages may still grow with content unless the lock also sets a page content min-height — decide explicitly.

User lean (2026-10-15): enforce a height for pages or containers; overflow within containers; avoid mismatched column bottoms.

## Acceptance criteria

- [ ] Q16 paired-panel height answered in the F09 spec Resolved section (or remaining Q16 narrowed)
- [ ] `docs/design-system.md` Patterns (or Layout) states: shared height source, overflow-inside rule, breakpoints when columns stack, and whether single-column pages use a min-height
- [ ] Progress Past work cited as the primary stress case; Tasks `max-height: 28rem` clamp noted as legacy alternate to reconcile or supersede
- [ ] If prototype used: URL + verdict recorded
- [ ] No requirement to migrate Progress in this ticket (apply in M2 or a later apply ticket)
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Height comes from viewport (e.g. `100dvh` minus chrome) vs fixed `min-height` vs CSS grid `1fr` row?
2. Both columns always scroll independently, or only the taller content side?
3. Stacked (single-column) breakpoint: equal-height rule off?

Prototype URL: (if any) `/prototype/f09/…`

## Reuse notes

- M0-01 findings §14 Vertical rhythm / height
- Past work grid in `styles.css` / Progress pages

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-07: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
