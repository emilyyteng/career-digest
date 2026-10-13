# Spec: Design system migration (F09)

**ID:** F09
**Status:** Planned
**Last updated:** 2026-10-12

## Problem

The app looks less visually consistent with each feature. Recurring issues: blue buttons, drop shadows, and inconsistent button sizes. New elements inherit global CSS defaults instead of using deliberate choices, and the codebase contains several conflicting styling approaches.

## Goals

- One visual standard, documented in `docs/design-system.md` and enforced through explicit component variants.
- New features follow it by default, without the user having to remind the agent.
- Migration effort stays proportional: do the minimum the active feature needs before attempting a broad migration.

## Milestones

| Milestone | Scope | Status |
|-----------|-------|--------|
| M0 | Agree on visual direction and component rules; record them in `docs/design-system.md` | Not started |
| M1 | Build the components F08 M5 (Accomplishment, detail pages & rewards) depends on, and migrate only the surfaces F08 M5 touches | Not started |
| M2+ | Broader migration, scoped later | Not scoped |

## Requirements

### Cross-cutting

- **R.1** (Established) Use explicit component variants and reusable conventions, not global CSS defaults that every new element inherits.
- **R.2** (Established) Where the codebase has conflicting approaches, settle on one and make it the source of truth in `docs/design-system.md`.
- **R.3** (Established) Discuss and agree on the visual direction and component rules before any broad migration.
- **R.4** (Established) Modals follow one common standard.
- **R.5** (Established) The design-system reference must be something agents consult proactively. It is referenced from `AGENTS.md` and auto-attached for web UI files via `.cursor/rules/design-system.mdc`.

### M1

- **R1.1** (Established) Scope is determined by what F08 M5 depends on, identified after the F08 spec is drafted.

## Current behavior (2026-10-12)

| Behavior | Where | Status | Notes |
|----------|-------|--------|-------|
| A global `button` rule makes every button filled `--accent-blue-deep` with `--shadow-button`; buttons escape only via a `:not(...)` chain of 23 classes (repeated on hover) | `apps/web/src/styles.css` | Conflicts R.1 | Most likely mechanism behind the blue-button and shadow complaints |
| Global element rules style `a`, `input`, `textarea`, `select` | `styles.css` | Conflicts R.1 | |
| `button.secondary` is the de facto second variant (about 120 uses) | across `apps/web/src` | Unspecified | Candidate starting point for explicit variants |
| `:root` tokens ("Sakura Terminal" palette): `--accent-{pink,blue,purple,mint,yellow}` + `-deep`, `--surface`, `--border`, `--text*`, `--danger*`, `--radius-*`, `--shadow-*` | `styles.css` | Unspecified | Keep or revise is Q4 |
| `ModalLayer` provides the shared backdrop, Escape handling and dirty-discard guard; nearly every dialog renders inside it | `apps/web/src/ModalLayer.tsx` | Conforms R.4 (layer only) | Inner anatomy (header, body, footer, button order and size) unaudited; likely source of modal inconsistency |
| Each prototype milestone has its own stylesheet (`prototype-m1.css`, `-m2`, `-m4`, `-m5`, `-rewards`) | `apps/web/src/prototype/` | Conflicts R.2 | |
| All styles live in one 5,211-line file | `styles.css` | Unspecified | Splitting is Q7 |

## Out of scope (for now)

- Full-app migration before F08 M5 needs are known.
- Changing the palette itself, unless M0 decides to.

## Open questions

| # | Question | Blocks | Answer |
|---|----------|--------|--------|
| Q1 | Visual direction: what does a primary button look like if not filled blue? Which accent is primary? | M0 | (open) |
| Q2 | Elevation: flat, or a subtle shadow? Where (cards, modals, buttons)? | M0 | (open) |
| Q3 | Button sizes: how many (e.g. sm / md), and which contexts use each? | M0 | (open) |
| Q4 | Is the current pastel token set kept as the base, or open to revision? | M0 | (open) |
| Q5 | Which conflicting existing patterns win (needs an audit of buttons, tabs, chips, modal anatomy, form fields)? | M0 | (open) |
| Q6 | How will UI rules be enforced mechanically (e.g. a lint rule against variant-less `<button>`)? A single `npm run check` command comes from maintenance ticket MT-01 and can host it. | M1 | (open) |
| Q7 | Should `styles.css` be split (per component or per feature), and when? | M1 | (open) |

## Decisions log

- **2026-10-12:** Reference doc (`docs/design-system.md`) and migration (this spec) are kept separate: the reference is permanent, the migration is a bounded project.
- **2026-10-12:** No full-app migration yet; scope M1 from F08 M5's dependencies.
