# M1-01: Production tokens, fonts, shell width, flora mark

**Status:** Ready
**Blocked by:** (none)
**Implements:** R.1, R.2, R0.2, R0.3, R0.4, R1.1 (token half), Q14, Q16†, Q17
**Type:** build

## What to build

Land the M0 Ink desk lock in production CSS variables and app chrome: named color/radius/elevation/heat/urgency tokens (with temporary aliases for old `--accent-*` where needed), IBM Plex as display/body fonts, `.shell` max-width **1100px**, and the top brand mark as **flora.exe**. No broad page restyle in this ticket.

## Acceptance criteria

- [ ] `:root` exposes roles from `docs/design-system.md` (ink, brand, domain apps/tech/reward, severity, urgency Severity-5, heat 5-stop rose, tab-active wash, surfaces, radii, shell max)
- [ ] Legacy `--accent-*` / related tokens still resolve (aliases or mapped values) so unmigrated pages do not break
- [ ] IBM Plex Mono + Sans loaded for production; `--font-display` / `--font-body` (or equivalent) wire to them
- [ ] `.shell` max-width is 1100px
- [ ] App brand mark shows `flora.exe` (full copy rewrite not required)
- [ ] `docs/design-system.md` token table notes which CSS variables are live
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M0 lock in `docs/design-system.md`; lab reference `/prototype/f09/lab` (`548ba4e`) for target values
- Existing `:root` in `apps/web/src/styles.css`; `index.html` font links

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-01: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
