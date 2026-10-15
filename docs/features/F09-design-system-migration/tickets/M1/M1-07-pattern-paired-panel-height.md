# M1-07: Pattern — paired panel height and in-panel overflow (Q16)

**Status:** In progress
**Blocked by:** (none) — decide before Progress dual-column waves; Home pilot (M1-05) does not require this
**Implements:** R1.2, Q16 (paired panel heights)
**Type:** docs
**Scheduled with:** shared prototype with M1-08

## What to build

Lock the **vertical height policy** for multi-column layouts: sibling panels share a defined height; extra content scrolls **inside** the panel so columns end on one baseline. Progress Past work is the stress case. Single-column pages: decide explicitly whether a page min-height applies.

## Proposed approach (for judgment)

- Dual-column rows use a **shared track height** from the viewport: roughly `calc(100dvh − chrome)` with a sensible floor.
- Each panel is a flex column; the body is `flex: 1; min-height: 0; overflow: auto`.
- **Both** columns may scroll independently when content exceeds the track.
- When columns **stack**, turn equal-height **off** (natural document flow).
- Single-column pages: **no** forced page min-height. Tasks’ `max-height: 28rem` section clamp is a **legacy compaction** tactic (reconcile under M1-11), not the dual-column standard.

**Alternatives in the prototype:** current independent grow · stretch-to-taller sibling (cap scroll) · fixed 28rem clamp per panel.

## Acceptance criteria

- [ ] Q16 paired-panel height answered in the F09 spec Resolved section (or remaining Q16 narrowed)
- [ ] `docs/design-system.md` Patterns states: shared height source, overflow-inside rule, breakpoints when columns stack, and whether single-column pages use a min-height
- [ ] Progress Past work cited as the primary stress case; Tasks `max-height: 28rem` clamp noted as legacy alternate to reconcile or supersede
- [ ] Prototype used: URL + verdict recorded
- [ ] No requirement to migrate Progress in this ticket (apply in M2 or a later apply ticket)
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. Height comes from viewport track vs stretch-to-taller vs fixed clamp?
2. Both columns always scroll independently inside the shared track?
3. Stacked (single-column) breakpoint: equal-height rule off?

Prototype URL: `/prototype/f09/layout` (shared with M1-08; `?height=` · `?frame=`)

## Reuse notes

- M0-01 findings §14 Vertical rhythm / height
- Past work grid in `styles.css` / Progress pages
- M1-06 containerized chrome (title → tabs → chips inside card)

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
