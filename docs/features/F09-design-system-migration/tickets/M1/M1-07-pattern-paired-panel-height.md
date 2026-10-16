# M1-07: Pattern — paired panel height and in-panel overflow (Q16)

**Status:** In progress
**Blocked by:** (none) — decide before Progress dual-column waves; Home pilot (M1-05) does not require this
**Implements:** R1.2, Q16 (paired panel heights)
**Type:** docs
**Scheduled with:** shared prototype with M1-08

## What to build

Lock the **vertical height policy** for multi-column and stacked list layouts: when a panel holds a long list, content scrolls **inside** a clamped body; self-contained widgets (calendar) stay fully visible at natural height. Progress Past work is the dual-column stress case; Tasks + This week stacked clamps are the page-scroll stress case. Single-column pages: decide explicitly whether a page min-height applies.

## User lean (2026-10-15) — awaiting lock

- Prefer a **fixed 28rem clamp** for scrollable list panels (ledger, task category wells).
- Self-contained widgets (calendar) stay at **natural height** so the whole calendar stays visible — no viewport-track equal-height that clips the grid or forces page/column scroll over it.
- Dual-column Past work: lean **asymmetric** (calendar natural / ledger clamp), not shared viewport track.
- In-panel scrolling for long lists (ledger) is wanted.
- **Stacked clamps** are a separate problem: Tasks categories + Progress This week cards all open at 28rem recreate a long page scroll. Surfaces **C** (problem) and **D** (strategies: accordion · section chips · shorter clamps) explore that; overlaps M1-09 pagination inside a well, but the stack itself is height/page composition (M1-07 / M1-11).

## Proposed approach (for judgment)

- List panels: `max-height: 28rem; overflow: auto` (not a shared `100dvh` track).
- Calendar / day chrome: natural height; do not put it in the same equal-height track as the ledger.
- When columns **stack**, keep natural flow; clamp only the list body.
- Single-column pages: **no** forced page min-height.
- Stacked wells: prefer **one primary scroll well** per region (section chips or accordion) over many open 28rem clamps; paginate inside the well under M1-09.

**Contrast in the prototype:** current independent grow · viewport track (clips calendar) · both-panels 28rem clamp · asymmetric lean.

## Acceptance criteria

- [ ] Q16 paired-panel height answered in the F09 spec Resolved section (or remaining Q16 narrowed)
- [ ] `docs/design-system.md` Patterns states: height source (28rem list clamp vs natural widgets), overflow-inside rule, breakpoints when columns stack, and whether single-column pages use a min-height
- [ ] Progress Past work cited as the primary dual-column stress case; Tasks / This week stacked clamps cited for page-scroll risk
- [ ] Prototype used: URL + verdict recorded
- [ ] No requirement to migrate Progress in this ticket (apply in M2 or a later apply ticket)
- [ ] `npm run check` passes (docs-only OK)

## Design questions (prototype tickets only)

1. List clamp 28rem + calendar natural (asymmetric) vs shared viewport track vs both clamped?
2. Stacked wells (Tasks / This week): accordion · section chips · shorter clamps · leave all open?
3. Stacked (single-column) breakpoint: equal-height rule off? (lean: yes — never used with asymmetric)

Prototype URL: `/prototype/f09/layout` (shared with M1-08; `?height=` · `?stack=` · `?frame=`; surfaces A–D)

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
