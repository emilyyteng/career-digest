# M0-03: Lock visual foundations into `docs/design-system.md`

**Status:** Done
**Blocked by:** (none) — M0-02 Done (`548ba4e`)
**Implements:** R.2, R.3, R.16, R0.2, R0.3, R0.4, R0.5, R.14, Q1–Q5, Q12–Q14, Q17–Q18 (and Q16 shell width)
**Type:** docs

## What to build

After the M0-02 prototype verdict, write the locked **visual** foundations into `docs/design-system.md` and close the M0 open questions in the F09 spec. No broad production migration in this ticket.

## Acceptance criteria

- [x] `docs/design-system.md`: Principles filled (no longer Pending for vibe / visual language)
- [x] Tokens: roles and policies for accents, elevation, type scale, spacing scale; heatmap / intensity tokens or a documented scale (R0.3)
- [x] Components catalogue: allowed visual variants and sizes for Button, fields, tabs/segmented, badge/chip, card, modal chrome (appearance); Status column updated
- [x] "Conflicting patterns → chosen standard" table filled for visual areas from M0-01 / M0-02
- [x] Interim F08 M5 decisions section updated: either promoted into the standard or marked superseded with a pointer to the new rules
- [x] F09 spec: Q1–Q5, Q12–Q14, Q17–Q18 (and any M0-locked parts of Q16) moved to Resolved questions with answers; Current behavior rows updated where a decision changes their status notes
- [x] Explicit note that Q8–Q11 / Q15 (and remaining Q16 policy) stay open for M1 pattern tickets (R.14)
- [x] Board: M0 milestone status → Done when this ticket and M0-01 / M0-02 are Done
- [x] No requirement to migrate production call sites here (that is M1+)

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M0-02 verdict and prototype commit `548ba4e` (`/prototype/f09/lab`)
- M0-01 inventory + findings §16 interim leanings
- Existing hard rules and banner patterns in `docs/design-system.md` (kept)

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes (docs-only expected)
- [x] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M0-03: …`
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

**2026-10-15 — foundations locked:**

- Wrote Principles, color-meaning roles, tokens/policies, component appearance catalogue, conflicting-patterns table
- Superseded F08 M5 interim (purple primary / blue toggles)
- Spec: M0 → Done; Q1–Q5, Q12–Q14, Q17–Q18, Q16 shell width → Resolved; Q8–Q11 / Q15 / remaining Q16 stay open for M1
- Prototype lab kept as reference (still cited by this closed ticket / future M1 work)
