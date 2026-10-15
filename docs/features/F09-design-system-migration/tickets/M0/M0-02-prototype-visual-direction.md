# M0-02: F09 visual-direction prototypes (exploratory lab)

**Status:** Done
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

- [x] Prototype lives only under `apps/web/src/prototype/f09-design-system/`; routes wired behind `import.meta.env.DEV` under `/prototype/f09/…`
- [x] Visible "Experimental prototype" banner; file headers name this ticket and the design questions
- [x] Uses shared `PrototypeSwitcher` and/or clear lab controls (vibe pack, font stack, color scheme, containment) — no fragile one-off switcher copied from F08 beyond reuse of `PrototypeSwitcher`
- [x] Does **not** depend on `/prototype/f08/weekly/visual-direction` remaining
- [x] More directions than F08 W/A/B/C; pool starts from findings §16 (may trim for implementation cost but must stay exploratory/broad)
- [x] Font switcher present with ≥4 stacks including current Mono+DM Sans and at least two more-readable alternatives (R0.4)
- [x] Brand theses shown or selectable enough to discuss Q17
- [x] Color-meaning scheme board includes priority + urgency + heatmap + success (Q18); does not decide priority in isolation
- [x] Containment axis explicit: carded / open canvas / hybrid (Progress-like)
- [x] At least one width-stress frame (tabs + secondary chrome + dual column)
- [x] Ticket links all prototype URL(s) for review
- [x] Findings §16 updated if the implemented pool diverges (what shipped vs deferred)
- [x] **User shortlist / remix notes** recorded after exploration (then mark Done)

## Design questions (prototype tickets only)

Axes the lab may vary. Locked requirements still apply.

1. **Q17 — Brand / identity:** Which thesis fits what the site is now?
2. **Q12 — Vibe composition:** Which pack (or remix) feels cohesive and like “me”?
3. **Q14 — Type:** Which font stack + role split wins for style vs readability (and any new axes noticed)?
4. **Q18 / Q4 / Q1 / Q13 — Color meaning + palette:** Which semantic map; keep/revise pastels; where baby pink lives; heatmap + priority seating
5. **Q2 + containment:** Elevation and carded vs open canvas vs hybrid
6. **Q3 / Q5 — Controls (visual):** Sizes and winning looks for tabs/segmented/chips/modal chrome
7. **Q16 samples — Layout:** Shell width / stress readability (policy detail may wait for M1)

**Prototype URL:** [/prototype/f09/lab](http://localhost:5173/prototype/f09/lab) (dev). `/prototype/f09` redirects here.

Query params (orthogonal): `?variant=` (vibe; ←/→) · `brand=` · `font=` · `color=` · `heat=` · `urgency=` · `elev=` · `contain=` · `shell=`

Defaults lean locked prefs: `V1` · `flora` · `plex` · `c3` · `rose` · `u-sev5` · `flat` · `carded` · `1100`.

## Reuse notes

- `apps/web/src/prototype/PrototypeSwitcher.tsx` (vibe packs)
- M0-01 findings §16 approach (implemented as single lab page)
- Lab buttons use scoped `.f09-*` classes + `!important` where needed to escape production global button defaults (long `:not(...)` hover chain)
- Extra Google fonts injected on demand from the prototype (not added to production `index.html`)

## Definition of done

- [x] Acceptance criteria met and checked (including user shortlist)
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` for any production touch; prototype stays under `prototype/`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M0-02: …` (verdict close-out)
- [x] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

**Verdict (2026-10-15) — shortlist for M0-03 lock:**

| Axis | Decision |
|------|----------|
| Vibe | **V1×V4 ink desk** — sakura pastel canvas + ink titles/actions |
| Brand | **flora.exe** |
| Font | **IBM Plex** (Mono display / Sans body); tabs & titles use display |
| Elevation | **Flat** (no button shadow; secondary never lifts; modals may use overlay shadow) |
| Tabs / nav | Ink text + ink border + **gray** active wash (`--f09-tab-active-bg`); squared control radius |
| Segmented | Rounded track; active = ink/action fill |
| Containment | **All carded** (Rewards included: earnings, pull history, rules, cat cake, banner) |
| Shell | **1100px** |
| Color meaning | Identity (apps blue / tech purple / reward pink) ≠ severity RYG ≠ urgency Severity-5 (no purple/blue) |
| Heatmap | **Vivid rose soft peak** (former step-3 as peak) |
| Priority | RYG traffic |
| Kind badges | Interview = apps blue; goal = reward pink |
| Purple | Domain tech only (score, streak, interviewing); containers = surface-2 |

Prototype remains at `/prototype/f09/lab` as the M0-03 reference until M0-03 records the lock (lab may stay while open tickets reference it).

**Build history:** see earlier notes in git history (`35cd57a`, `cdb3fc4`, plus this close-out). Findings §16 interim leanings match the verdict table.
