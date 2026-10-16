# M0-02: Prototype weekly goals column + incrementer

**Status:** In progress
**Blocked by:** (none — M0-01 Done; strip today-LC = Log LC disclosure, do not re-litigate)
**Implements:** R.0, R0.2; designs for R3.1–R3.10, R.7, R.9, open Q13–Q14 (from `../../spec.md`)
**Type:** prototype

## What to build

Throwaway prototypes (mock data only) for Progress → This week as a **habits hub** below the Habits strip: **weekly goals column** + adjacent **multi-goal weekly incrementer**, plus a **Home Targets** mock that includes custom weekly goals.

Every variant must satisfy every locked weekly requirement, including:

- Weekly column: apps + LC + ≤3 customs (3 custom / 5 total with apps+LC) (R.7, R3.1)
- **+** creates a custom goal (name + target; default target **3**) when under the custom cap (R3.5, R3.7)
- Active / Archived chips; Archived = **customs only**; apps/LC stay on Active (R3.7)
- Per-custom **pencil** → rename + archive only; **target number** via near-label stepper like LC today (R3.6)
- Apps/LC have no pencil; apps name not editable as a custom (R3.6)
- Adjacent incrementer: ± for **LC and each custom** weekly progress; **no apps ±**; **no today-LC** (R3.3, R3.8, R1.13)
- Custom weeklies on Home Targets (Sunday / unmet pattern like apps/LC) (R3.2)
- Name + target carry week to week; progress resets (show in mock copy or state) (R3.5)
- Display-only weeks-in-a-row flame when met ≥2 weeks (R3.9)
- Active vs archived look meaningfully different (R3.7; may inherit strip language from M0-01 if already chosen)
- Fixed-height / design-system containerization for the This week split (R.9)
- “Experimental prototype” banner; DEV-only routes; `PrototypeSwitcher`

Assume M0-01’s Habits strip (or a simplified stand-in that matches the locked strip rules) sits above; do not invent a third today-LC home here.

## Design questions

Variants may differ **only** on these axes:

1. **Weekly ± control chrome (spec Q13 / R3.3):** Increment/decrement **field** vs the current stepper styling (or a clear hybrid), used in the multi-goal incrementer for LC + customs. Same interaction language for every ± row.
2. **Active vs archived look in the weekly column (spec Q14):** If M0-01 already locked a strip language, apply or adapt it here; otherwise propose 2 options. Archived rows must not invite ± progress.

Prototype page: `/prototype/f11/habits/weekly`  
(Hub remains `/prototype/f11/habits` from M0-01.)

## Acceptance criteria

- [x] Prototypes under `apps/web/src/prototype/f11-habits-and-weekly-targets/` with DEV-only routes
- [x] Progress This week mock: weekly goals column + weekly incrementer side by side (or the locked split once chosen); no today-LC in the incrementer; no apps ±
- [x] Home Targets mock includes at least one custom weekly goal alongside apps/LC-style target rows
- [x] At least two variants for Q13; Q14 covered for weekly Active/Archived
- [x] Cap scenarios: + disabled or blocked at 3 customs; restore blocked at cap
- [x] Pencil vs near-label target stepper are distinct (rename/archive vs goal size)
- [x] No production imports of prototype code; mock data only
- [ ] User records a verdict per design question in this ticket’s verification notes

## Reuse notes

`PrototypeSwitcher`; [`WeeklyGoalsBlock.tsx`](../../../../../apps/web/src/features/progress/WeeklyGoalsBlock.tsx) / Home Targets row patterns as visual reference (copy into prototype — do not wire production weekly API). M0-01 strip fixtures if still present. `ModalLayer` for create / pencil mocks.

Built with: `PrototypeSwitcher`, `ChromeTab`, `ModalLayer`, `Button` / `TextField`, M0-01 ghost/mute archived language, strip stand-in (no production weekly API).

## Definition of done

- [ ] Acceptance criteria met and checked (awaiting user verdicts)
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [x] Reuse check done
- [x] No production imports of prototype code
- [ ] Ticket status `Done`; board updated; verdicts recorded
- [ ] Committed as `F11 M0-02: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including **Issues found**

## Verification notes

**Open for review:** `/prototype/f11/habits/weekly` (DEV). ← / → cycles Q13 variants.

| Variant | Q13 |
|---------|-----|
| A | Classic stepper (− N +) |
| B | Number field flanked by ± |
| C | Field-only (blur / Enter commit) |

Orthogonal: `?cap=under|full` · `?arch=ghost|mute` (Q14 weekly; ghost = M0-01 strip language).

**Verdicts (user):**
- Q13: _(pending)_
- Q14 (weekly): _(pending — ghost adapted from strip is the default)_

Last prototype commit hash: _(after commit)_
