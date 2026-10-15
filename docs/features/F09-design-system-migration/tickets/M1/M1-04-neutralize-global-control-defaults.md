# M1-04: Neutralize global button and field defaults

**Status:** Draft
**Blocked by:** M1-02
**Implements:** R.1, R1.1
**Type:** refactor

## What to build

Remove dependence on the global filled-blue `button` default and its `:not(...)` opt-out chain, and on bare `input` / `textarea` / `select` element styling, so looks come only from explicit variants. Prefer deleting or neutralizing the globals once a migration path exists (shim with a short kill window only if needed). Do not add classes to the opt-out chain.

## Acceptance criteria

- [ ] Global `button` filled-blue + shadow default is gone or inert for app UI
- [ ] `:not(...)` opt-out chain is removed or reduced to a documented temporary shim with an explicit removal plan
- [ ] Bare field element rules no longer define the default product look (variants do)
- [ ] Inventory / checklist of remaining bare `<button>` / unclassed fields, or they already use primitives
- [ ] Hover no longer forces production blue/purple on migrated controls
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M1-02 primitives; Current behavior rows on global button/fields in F09 spec
- Coordinate with M1-05 Home pilot for first full surface off the globals

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-04: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
