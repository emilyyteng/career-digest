# M1-01: Production tokens, fonts, shell width, flora mark

**Status:** Done
**Blocked by:** (none)
**Implements:** R.1, R.2, R0.2, R0.3, R0.4, R1.1 (token half), Q14, Q16†, Q17
**Type:** build

## What to build

Land the M0 Ink desk lock in production CSS variables and app chrome: named color/radius/elevation/heat/urgency tokens (with temporary aliases for old `--accent-*` where needed), IBM Plex as display/body fonts, `.shell` max-width **1100px**, and the top brand mark as **flora.exe**. No broad page restyle in this ticket.

## Acceptance criteria

- [x] `:root` exposes roles from `docs/design-system.md` (ink, brand, domain apps/tech/reward, severity, urgency Severity-5, heat 5-stop rose, tab-active wash, surfaces, radii, shell max)
- [x] Legacy `--accent-*` / related tokens still resolve (aliases or mapped values) so unmigrated pages do not break
- [x] IBM Plex Mono + Sans loaded for production; `--font-display` / `--font-body` (or equivalent) wire to them
- [x] `.shell` max-width is 1100px
- [x] App brand mark shows `flora.exe` (full copy rewrite not required)
- [x] `docs/design-system.md` token table notes which CSS variables are live
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M0 lock in `docs/design-system.md`; lab reference `/prototype/f09/lab` (`548ba4e`) for target values
- Existing `:root` in `apps/web/src/styles.css`; `index.html` font links
- `--font-sans` / `--font-mono` alias to body/display so existing rules pick up Plex without a mass find-replace

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-01: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15:**

- `:root` role tokens + legacy `--accent-*` aliases; `--surface-2` warm; `--shadow-button: none`; heat/urgency/severity/domain vars
- `index.html` loads IBM Plex Mono/Sans; `--font-display` / `--font-body` (+ sans/mono aliases)
- `.shell` → `var(--shell-max)` 1100px; brand mark + document title `flora.exe`
- `design-system.md` Tokens table lists live variable names
- Side effects expected until primitives land: whole app uses Plex and warmer surface-2; global buttons lose blue shadow (fill color unchanged until M1-02/04)
- Commit: `9b5af76`
