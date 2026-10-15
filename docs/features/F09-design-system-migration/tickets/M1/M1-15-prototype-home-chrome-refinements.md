# M1-15: Prototype — Home chrome & urgency refinements

**Status:** Done
**Blocked by:** (none) — after M1-05 pilot feedback
**Implements:** R.15, R1.1 (refine locked primitives before pattern docs / further waves)
**Type:** prototype
**Scheduled with:** before M1-06; fold winners into design system + production in this ticket (user asked to lock + apply)

## What to build

Throwaway refinements lab answering post–Home-pilot visual questions. Last-digest surface-2 box is fixed directly on Home (out of scope here). Do not land other production restyles until verdicts are locked.

## Acceptance criteria

- [x] Prototype page at `/prototype/f09/refinements` with Experimental banner + `PrototypeSwitcher`
- [x] Orthogonal controls cover every design question below
- [x] Home-like composition on pink desk (nav + card + upcoming row) so chrome is judged in context
- [x] Side-by-side swatches: `--urgency-soon`, `--urgency-ahead`, `--severity-p1` (clarify yellow vs pink)
- [x] Ticket records verdicts + last prototype commit hash when locked
- [x] Locked picks applied to `docs/design-system.md` + production (Home / shared primitives)
- [x] `npm run check` passes

## Design questions (prototype tickets only)

1. **Segmented active:** ink fill (current) vs gray wash + black text vs other — must stay distinct from track.
2. **ChromeTab active on pink desk:** gray+ink border (current) vs alternate looks (underline, soft fill, brand-tint, ink text-only).
3. **“Yellow” countdown / soon:** which token is too bright (`--urgency-soon` pink vs `--urgency-ahead` amber)? Align with P1, soften, or rediscuss Severity-4 map?
4. **Countdown treatment:** mono + zero-padded fixed-width strings; pie circle seam/gap when zoomed out (conic vs solid-full vs SVG).
5. **GOAL badge:** keep domain-reward pink vs domain-tech purple (vs other) — distance from P0.
6. **Link hover:** muted→ink (current Home) vs purple-deep (legacy global `a:hover`) vs other — readable on pink desk.

Prototype URL: `/prototype/f09/refinements`

## Reuse notes

- `PrototypeSwitcher`, Ink desk tokens, `ChromeTab` / `Segmented` / `Badge` / `DeadlineUrgency` visuals (reimplemented in prototype CSS — no production imports of prototype code the other way)
- M0 lab `/prototype/f09/lab` for prior shortlist context

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-15: …`
- [x] End-of-task report given
- [x] Verdicts recorded (variant / param picks) + prototype last commit hash

## Verification notes

**2026-10-15 verdicts (locked):**

| Axis | Pick |
|------|------|
| Segmented active | Soft ink wash |
| ChromeTab active | Underline ink (matches lab Completions shortened labels) |
| Urgency map | Ahead = P1 gold (`--urgency-ahead: var(--severity-p1)`); soon keeps pink `#c97b8b` |
| Countdown text | Mono + zero-padded; units joined by `:`; larger gap after pie cluster |
| Pie circles | SVG (no conic seam) |
| GOAL badge | Domain tech purple |
| Link hover | Underline on hover; text may stay dark/ink (no purple required) |

Also: last-digest remains background-less (direct Home fix in this workstream).

Applied to `docs/design-system.md`, `ui.css` (Segmented / ChromeTab / Badge goal), `DeadlineUrgency.tsx`, urgency token, Home link hover CSS. Prototype kept at `/prototype/f09/refinements` as reference.

`npm run check` pass.
Commit: (filled on commit)
