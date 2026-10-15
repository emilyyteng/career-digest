# M1-04: Neutralize global button and field defaults

**Status:** Done
**Blocked by:** (none) — M1-02 Done
**Implements:** R.1, R1.1
**Type:** refactor

## What to build

Remove dependence on the global filled-blue `button` default and its `:not(...)` opt-out chain, and on bare `input` / `textarea` / `select` element styling, so looks come only from explicit variants. Prefer deleting or neutralizing the globals once a migration path exists (shim with a short kill window only if needed). Do not add classes to the opt-out chain.

## Acceptance criteria

- [x] Global `button` filled-blue + shadow default is gone or inert for app UI
- [x] `:not(...)` opt-out chain is removed or reduced to a documented temporary shim with an explicit removal plan
- [x] Bare field element rules no longer define the default product look (variants do)
- [x] Inventory / checklist of remaining bare `<button>` / unclassed fields, or they already use primitives
- [x] Hover no longer forces production blue/purple on migrated controls
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M1-02 `Button` / `TextField`; migrated all production unclassed `<button>`s to `Button`
- Legacy `.secondary` / `.modal-confirm-btn` restyled to ink (no purple/blue hover)
- Field product chrome = `.ui-field`; bare fields keep structural shim (kill with form migrations / M1-05+)

## Remaining inventory (kill list)

**Buttons (production):** No unclassed `<button>` left. Still on legacy classes (not `ui/Button`): `button.secondary` (~100+), `modal-confirm-btn`, `ui-btn*`, feature icon/chrome classes (`.tab`, `.job-feedback-btn`, `.todo-remove-btn`, `.interview-cta-btn`, `.ledger-subtab`, …). Migrate with surface waves / M1-05.

**Fields (production, approx.):** ~60 bare `<input>`, ~16 `<textarea>`, ~19 `<select>` without `.ui-field` (forms, PrioritySelect, LocationSuggest, …). Structural shim + ink focus only; move to `TextField` / `SelectField` per page wave.

**Links:** Global `a` color rules unchanged (out of this ticket’s button/field scope).

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-04: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15:**

- Removed filled-blue `button` default and entire `:not(...)` opt-out chain; bare `button` is a reset
- `.secondary` / `.modal-confirm-btn` → ink; secondary hover no longer purple/blue/pink
- Bare fields: structural shim only; focus outline ink (not accent-blue); product look = `.ui-field`
- Migrated former unclassed primaries to `Button` (ModalLayer, task/app/interview forms, Progress save rows, list “Add …” CTAs, discard confirms)
- `design-system.md` + F09 current-behavior rows updated
- `npm run check` pass
- Commit: (recorded after commit)
