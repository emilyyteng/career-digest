# M0-03: Lock visual foundations into `docs/design-system.md`

**Status:** Draft
**Blocked by:** M0-02
**Implements:** R.2, R.3, R.16, R0.2, R0.3, R0.4, R0.5, R.14, Q1–Q5, Q12–Q14, Q17–Q18 (and Q16 tokens if locked)
**Type:** docs

## What to build

After the M0-02 prototype verdict, write the locked **visual** foundations into `docs/design-system.md` and close the M0 open questions in the F09 spec. No broad production migration in this ticket.

## Acceptance criteria

- [ ] `docs/design-system.md`: Principles filled (no longer Pending for vibe / visual language)
- [ ] Tokens: roles and policies for accents, elevation, type scale, spacing scale; heatmap / intensity tokens or a documented scale (R0.3)
- [ ] Components catalogue: allowed visual variants and sizes for Button, fields, tabs/segmented, badge/chip, card, modal chrome (appearance); Status column updated
- [ ] "Conflicting patterns → chosen standard" table filled for visual areas from M0-01 / M0-02
- [ ] Interim F08 M5 decisions section updated: either promoted into the standard or marked superseded with a pointer to the new rules
- [ ] F09 spec: Q1–Q5, Q12–Q14, Q17–Q18 (and any M0-locked parts of Q16) moved to Resolved questions with answers; Current behavior rows updated where a decision changes their status notes
- [ ] Explicit note that Q8–Q11 / Q15 (and remaining Q16 policy) stay open for M1 pattern tickets (R.14)
- [ ] Board: M0 milestone status → Done when this ticket and M0-01 / M0-02 are Done
- [ ] No requirement to migrate production call sites here (that is M1+)

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M0-02 verdict and prototype commit hash
- M0-01 inventory
- Existing hard rules and banner patterns in `docs/design-system.md` (keep; do not regress)

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes (docs-only expected)
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M0-03: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(filled when done)
