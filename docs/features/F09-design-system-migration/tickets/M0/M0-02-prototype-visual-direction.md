# M0-02: F09 visual-direction prototypes (vibe → components)

**Status:** Ready
**Blocked by:** (none) — use M0-01 findings when available; shell/routes may start in parallel
**Implements:** R.3, R.13, R.14, R0.1, R0.3, Q1–Q5, Q12–Q13
**Type:** prototype

## What to build

F09-owned visual-direction prototypes under `apps/web/src/prototype/f09-design-system/` with DEV routes under `/prototype/f09/…`. These replace `/prototype/f08/weekly/visual-direction` as the place where direction is explored and locked.

Start from **theme / vibe** (Q12), then show how that vibe lands on tokens and components. Explore **more variants than F08 W/A/B/C**. Direction W (tinted purple primary, flat, blue toggles) was preferred in that round and may appear as one candidate; it is not the default winner and must not be the whole option set.

Include representative surfaces so the vibe can be judged in context (not a button strip alone), e.g. a compact page chrome sample, primary/secondary/ghost actions, a card or two, a modal shell, a segmented control, and a **heatmap / intensity** sample (Q13 / R0.3).

Every variant must still respect locked hard rules in `docs/design-system.md` (tokens only, no new global element CSS).

## Acceptance criteria

- [ ] Prototype lives only under `apps/web/src/prototype/f09-design-system/`; routes wired behind `import.meta.env.DEV` under `/prototype/f09/…`
- [ ] Visible "Experimental prototype" banner; file headers name this ticket and the design questions
- [ ] Uses shared `PrototypeSwitcher` (or F09 equivalent built on it)—no one-off switcher copy from F08 beyond what's needed
- [ ] Does **not** depend on `/prototype/f08/weekly/visual-direction` remaining; F08 page may be read once as historical input
- [ ] Variants differ on the design questions below; more than the four F08 directions
- [ ] At least one variant (or axis) explores coexistence vs choice between raised Sakura Terminal and clean/flat (Q12)
- [ ] Heatmap / intensity treatment is shown and varies only where Q13 is open
- [ ] Ticket links the prototype URL(s) for review

## Design questions (prototype tickets only)

The only axes prototype variants may differ on. Every variant must satisfy every locked requirement.

1. **Q12 — Theme / vibe:** What does the app communicate? Raised Sakura Terminal, clean/flat, a deliberate hybrid, or something else? Treat **typography** (mono vs sans roles) as co-equal with elevation.
2. **Q14 — Type roles / scale:** Where JetBrains Mono vs DM Sans (or interim stand-ins) appear — brand, nav, tabs, section titles, body, badges, numbers — and a small size scale. Full alternate-family exploration may be a later pass.
3. **Q4 — Palette:** Keep the pastel token set as the base, revise roles only, or revise the set?
4. **Q2 — Elevation:** Where (if anywhere) do shadows / raised surfaces appear?
5. **Q1 — Primary action & accent roles:** Primary button look; which accent is action vs selection vs brand vs data?
6. **Q3 — Control sizes:** How many button (and related control) sizes, and when?
7. **Q5 — Pattern winners (visual):** Which existing competing looks win for tabs/segmented, chips, cards, modal chrome (appearance only)?
8. **Q13 — Data viz:** Heatmap / intensity gradient family and empty/future/peak reading
9. **Q16 (visual sample):** Include at least one width-stress frame (tab row + secondary chrome + dual column) so shell width can be judged; full layout policy stays M1

Prototype URL: `/prototype/f09/visual-direction` (adjust if split across pages; list all URLs in Verification notes)

## Reuse notes

- `apps/web/src/prototype/PrototypeSwitcher.tsx`
- Existing `:root` tokens in `styles.css` unless a variant explicitly proposes new token names (document them; don't silently add production tokens)
- F08 `VisualDirectionPrototypePage` conflict list and directions as historical input only
- M0-01 inventory findings

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M0-02: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

(filled when done: verdict, chosen variant(s), last commit hash of the prototype before any later deletion)
