# M0-02: F09 visual-direction prototypes (exploratory lab)

**Status:** Ready
**Blocked by:** (none) — M0-01 findings are the problem map; this ticket is the option lab
**Implements:** R.3, R.13, R.14, R.16, R0.1, R0.3, R0.4, R0.5, Q1–Q5, Q12–Q14, Q16 (samples), Q17–Q18
**Type:** prototype

## What to build

F09-owned **exploratory design lab** under `apps/web/src/prototype/f09-design-system/` with DEV routes under `/prototype/f09/…`. This replaces `/prototype/f08/weekly/visual-direction` as the home for direction work.

**Process:** inventory alone is not enough to decide. Build a wide option pool; review side-by-side; eliminate, merge, or remix. Do not treat F08 W/A/B/C or “Sakura vs flat” as the full set. Loved inputs to *try to keep*: **baby pink**, **clean/readable** UI — not hard constraints against other explorations.

### Lab layers (see findings §16)

1. **Brand framing** — short identity theses (Q17); enough to judge vibe fit (rename ship optional).
2. **Vibe compositions** — broad packs (V1–V7 starting pool in findings §16); each shows a full sample, not a button strip.
3. **Font switcher** — orthogonal control (R0.4); multiple family stacks along style ↔ readability; packs must not hard-code families.
4. **Color-meaning schemes** — brainstorm boards (Q18 / R0.5) with heatmap + urgency + priority + success together; seat traffic lights only after a scheme exists.
5. **Containment / elevation** — carded vs open canvas vs hybrid; shadow policy switches.
6. **Nav + width stress samples** — chrome stacks and dual-column / tab-row pressure; full IA rules remain M1 (Q15).

Representative surfaces on each vibe pack: shell + nav, brand mark, contained and/or open regions, primary/secondary/ghost, segmented control, modal chrome, heatmap sample, priority + urgency pair, type specimen strip (brand / nav / title / body / badge / number).

Prototype-local CSS/tokens under the F09 prototype folder may explore fonts and palettes not yet in production `:root`. Do not write exploratory tokens into production `styles.css` from this ticket. Production hard rules still apply to any shared production code touched (ideally none).

## Acceptance criteria

- [ ] Prototype lives only under `apps/web/src/prototype/f09-design-system/`; routes wired behind `import.meta.env.DEV` under `/prototype/f09/…`
- [ ] Visible "Experimental prototype" banner; file headers name this ticket and the design questions
- [ ] Uses shared `PrototypeSwitcher` and/or clear lab controls (vibe pack, font stack, color scheme, containment) — no fragile one-off switcher copied from F08 beyond reuse of `PrototypeSwitcher`
- [ ] Does **not** depend on `/prototype/f08/weekly/visual-direction` remaining
- [ ] More directions than F08 W/A/B/C; pool starts from findings §16 (may trim for implementation cost but must stay exploratory/broad)
- [ ] Font switcher present with ≥4 stacks including current Mono+DM Sans and at least two more-readable alternatives (R0.4)
- [ ] Brand theses shown or selectable enough to discuss Q17
- [ ] Color-meaning scheme board includes priority + urgency + heatmap + success (Q18); does not decide priority in isolation
- [ ] Containment axis explicit: carded / open canvas / hybrid (Progress-like)
- [ ] At least one width-stress frame (tabs + secondary chrome + dual column)
- [ ] Ticket links all prototype URL(s) for review
- [ ] Findings §16 updated if the implemented pool diverges (what shipped vs deferred)

## Design questions (prototype tickets only)

Axes the lab may vary. Locked requirements still apply.

1. **Q17 — Brand / identity:** Which thesis fits what the site is now?
2. **Q12 — Vibe composition:** Which pack (or remix) feels cohesive and like “me”?
3. **Q14 — Type:** Which font stack + role split wins for style vs readability (and any new axes noticed)?
4. **Q18 / Q4 / Q1 / Q13 — Color meaning + palette:** Which semantic map; keep/revise pastels; where baby pink lives; heatmap + priority seating
5. **Q2 + containment:** Elevation and carded vs open canvas vs hybrid
6. **Q3 / Q5 — Controls (visual):** Sizes and winning looks for tabs/segmented/chips/modal chrome
7. **Q16 samples — Layout:** Shell width / stress readability (policy detail may wait for M1)

Prototype URL (planned): `/prototype/f09/lab` (hub) with subroutes as needed — list finals in Verification notes.

## Reuse notes

- `apps/web/src/prototype/PrototypeSwitcher.tsx`
- M0-01 findings (especially §§1 containment, 12 type, 13–14 depth/layout, **§16 proposed approach**)
- F08 visual-direction page as historical input only
- Google fonts already loaded in `index.html` may be extended for the prototype only (document added families in the prototype header)

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` for any production touch; prototype stays under `prototype/`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M0-02: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(filled when done: what was shown, user verdict / shortlist, remix notes, last commit hash of the prototype before any later deletion)
