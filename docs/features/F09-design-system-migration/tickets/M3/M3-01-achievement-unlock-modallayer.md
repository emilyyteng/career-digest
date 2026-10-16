# M3-01: Route achievement unlock through ModalLayer

**Status:** Ready
**Blocked by:** (none) — after M2 preferred; can run anytime after M1-12
**Implements:** R.4
**Type:** bug

## Found during

F09 M1-12 (modal anatomy). User agreed 2026-10-15 to ticket the debt in M3.

## Evidence

`AchievementUnlockModal` renders a hand-rolled `role="dialog"` with its own full-screen overlay CSS (`styles.css` `.achievement-unlock-modal`), not `ModalLayer`. Hosted from `AchievementUnlockHost` / `App.tsx`. Missing shared Escape / backdrop / portal behavior. Conflicts R.4 / design-system “One modal standard.”

## What to build

Achievement unlock moments use `ModalLayer` (and modal anatomy helpers where they fit) so dismiss, focus, and overlay behavior match every other dialog. Keep the celebration copy and balance display; swap the shell and primary action onto `Button`.

## Acceptance criteria

- [ ] Unlock UI renders inside `ModalLayer` (no parallel backdrop / Escape implementation)
- [ ] Uses `ModalHeader` / `ModalBody` / `ModalFooter` (or documented exception if the celebration layout needs a one-off body)
- [ ] Primary dismiss uses `Button` (no bare / legacy `ui-btn-primary` only)
- [ ] Queue / multi-unlock behavior in `AchievementUnlockHost` still works
- [ ] Dead achievement-unlock overlay CSS removed or reduced to card-only styles
- [ ] Spec Current behavior row updated; `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- `ModalLayer.tsx`, `ui/ModalChrome.tsx`, `ui/Button`
- `AchievementUnlockHost.tsx`, `AchievementUnlockModal.tsx`

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M3-01: …`
- [ ] End-of-task report given

## Verification notes

(pending)
