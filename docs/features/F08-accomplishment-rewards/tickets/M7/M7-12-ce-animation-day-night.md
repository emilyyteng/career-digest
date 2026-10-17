# M7-12: CE animations on Day/Night toggle and detail select

**Status:** Done
**Blocked by:** (none)
**Implements:** R7.4 (Day/Night CE skins; collection detail UX)
**Type:** bug

## Found during

Post-M7 polish (2026-10-16). User reported Collection CE animation glitches; agreed to commit as an M7 follow-up.

## Evidence

1. **Night → Day shine freeze:** On a CE with Night unlocked, switching Night → Day left the day shine band frozen mid-cake for several seconds while tail and blink kept moving. Cause: shine DOM was gated on `day`, so the toggle remounted `.cc-shine` and restarted its CSS animation, including flavor `--cc-delay` (up to ~4s). During the delay the static mid-cake pose showed.
2. **Late-flavor detail lag:** Selecting a later album CE for the detail panel delayed tail, blink, and shine by the same album stagger (`flavorIndex × 0.37s`). Detail is a separate mount and does not need to stay in sync with thumbnails.

## What to build

Correct behavior:

- Day shine keeps animating across Night ↔ Day (hide with `visibility`, do not unmount; `animation-fill-mode: backwards` so any delay uses the off-canvas keyframe).
- Collection detail CE animations start immediately (`animationDelay={0}`); album thumbnails keep flavor stagger.

## Acceptance criteria

- [x] Night → Day: shine does not sit frozen mid-cake for the stagger delay; other CE animations stay continuous.
- [x] Selecting any CE in the album: detail panel animations start immediately.
- [x] Album CE thumbnails still stagger by flavor.
- [x] No production imports of prototype code.

## Edge cases

- CE that loads already on Night, then switches to Day: shine was mounted (hidden) so it is already mid-cycle when shown.
- Classics and silhouettes: no shine / no CE animation classes.

## Tests

- [x] Manual: Night → Day on an owned CE with Night unlocked — shine sweeps without a multi-second mid-cake freeze.
- [x] Manual: select a late-index CE — detail wag/blink/shine start at once; album thumbs still staggered.
- [ ] No automated web animation harness; skipped unit tests.

## Reuse notes

Extends `CatCake` / `CatCakeCard` / `catCake.css` and the Collection detail `CatCakeCard` from M7-07.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md` (cat-cake scoped CSS only)
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F08 M7-12: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

Manual Collection checks above. Commit hash filled in follow-up once this ticket commit exists.
