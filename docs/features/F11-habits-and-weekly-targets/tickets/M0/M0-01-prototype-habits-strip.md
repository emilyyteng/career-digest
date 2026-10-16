# M0-01: Prototype Habits strip (Home + Progress)

**Status:** Done
**Blocked by:** (none)
**Implements:** R.0, R0.1; designs for R1.5–R1.14, R.5, R.7, open Q11–Q12, Q14 (from `../../spec.md`)
**Type:** prototype

## What to build

Throwaway prototypes (mock data only) for the **Habits** strip on Home and Progress → This week. Settle checkoff-vs-edit chrome, today-LC placement (A vs B), and active/archived visual difference on the strip.

Every variant must satisfy every locked strip requirement, including:

- Heading **Habits**; full chrome on **both** Home and Progress mocks (R1.8)
- Active / Archived chips; Archived = customs only; Archived chip disabled when none (R1.8)
- Active order: Apps, LC, customs by creation, create slot when fewer than 3 customs; create gone at custom cap (R.7, R1.8)
- Apps/LC display-only, no pencil/archive; customs boolean checkoff; subtitle **done** / **not yet**; apps/LC keep **N completed today** (R.5, R1.5, R1.9)
- Per-custom pencil → rename or archive; restore from Archived blocked at custom cap with a clear message (R1.8, R.7)
- Strip reflection pencil → modal with link, body, lane (mock options OK); no notes/apps list (R1.11, R1.14)
- Home: **Update progress →** bottom-right of the strip (R1.8)
- Progress This week mock: week/month pulse kept; **no** Next achievements or Daily progress aside (R1.12)
- Today-LC reachable without Past work; **not** beside weekly LC (R1.13)
- “Experimental prototype” banner; DEV-only routes; `PrototypeSwitcher` for variants

## Design questions

Variants may differ **only** on these axes:

1. **Checkoff vs edit chrome (spec Q11 / R1.10):** How custom habit containers keep checkoff and pencil (rename/archive) as distinct actions — e.g. dedicated ✓/− hit target vs other clear separation. Whole-pill toggle that also fights the pencil is out.
2. **Today-LC placement (spec Q12 / R1.13):**
   - **A** — expand/tap the Apps·LC streak area (or LC pill) to reveal today’s tiered LC ± controls
   - **B** — a separate “log” affordance on the Habits strip that reveals today’s LC controls  
   Do **not** prototype Past-work-only today-LC, or today-LC inside a weekly goals / weekly incrementer column.
3. **Active vs archived look on the strip (spec Q14):** How Archived customs read as clearly not the active set (muted, no checkoff, restore affordance, etc.) while still scannable.

Prototype hub: `/prototype/f11/habits`  
Strip page: `/prototype/f11/habits/strip`

## Acceptance criteria

- [x] Prototypes under `apps/web/src/prototype/f11-habits-and-weekly-targets/` with DEV-only routes in `App.tsx`
- [x] Home mock and Progress This week mock both show the Habits strip chrome
- [x] At least two variants for Q11 and for Q12 (A and B); Q14 explored across Active/Archived states
- [x] Variants switchable with `PrototypeSwitcher`; every variant obeys locked requirements above
- [x] Cap scenarios: create slot present under 3 customs, gone at 3; restore blocked at cap
- [x] Reflection pencil opens a `ModalLayer` mock modal (link, body, lane)
- [x] No production imports of prototype code; mock data only
- [x] User records a verdict per design question (variant chosen) in this ticket’s verification notes

## Reuse notes

`PrototypeSwitcher`, F08 today-strip visual language ([`TodayStrip.tsx`](../../../../../apps/web/src/features/progress/TodayStrip.tsx) / `today-streak-*` styles) as a starting point — do not import production strip into the prototype if that forces production changes. `ModalLayer` for modals. `LeetcodeLogger` patterns for mock today-LC ± only inside the chosen A/B reveal.

Built with: `PrototypeSwitcher`, `ModalLayer` + `ModalHeader`/`Body`/`Footer`, `Button` / `TextField` / `SelectField` / `TextAreaField` / `ChromeTab`, existing `progress-lane-chip` classes. Slim mock today-LC steppers (not production `LeetcodeLogger`). No production strip import.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Ticket status `Done`; board updated; verdicts recorded
- [x] Committed as `F11 M0-01: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including **Issues found**

## Verification notes

**Prototype:** `/prototype/f11/habits` → `/prototype/f11/habits/strip` (DEV). Keep until M2 build tickets that reference it are Done.

| Variant | Q11 | Q12 |
|---------|-----|-----|
| A | Dedicated ✓/− button + pencil | Expand LC pill |
| B | Dedicated ✓/− button + pencil | Strip **Log LC** |
| C | Mark (✓/−) as hit-target + pencil | Expand LC pill |
| **D (chosen)** | Mark (✓/−) as hit-target + pencil | Strip **Log LC** |

**Verdicts (2026-10-16):**
- **Q11:** mark hit-target — ✓/− top-right like Apps/LC; pencil absolutely beside `{name} daily streak`
- **Q12:** Log LC disclosure (▾) right-aligned on the habits band with Add reflection; Update progress below; today-LC panel under the band (not expand-pill, not Past-work-only, not weekly column)
- **Q14 (strip):** ghost stamp archived look; Active/Archived as ChromeTabs; last restore auto-returns to Active

Locked chrome extras: flipped pencil on Add reflection (icon right of label); edit modal Cancel · Archive (danger + confirm) · Save name.

Last prototype commit hash: `fe2e9ec`
