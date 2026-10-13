# M<n>-<NN>: <Ticket title>

(Maintenance tickets use `MT-<NN>` instead.)

**Status:** Draft | Ready | In progress | Blocked | Done
**Blocked by:** (none) | M<n>-<NN>
**Implements:** R<n>.x, R<n>.y (from `../spec.md`)
**Type:** build | prototype | refactor | bug | docs

## Found during (bug tickets only)

Which ticket or task surfaced this, and when the user agreed to ticket it.

## Evidence (bug tickets only)

What was observed: command output, file and line, steps to reproduce. Which requirement it conflicts with, if any.

## What to build

The end-to-end behavior this ticket makes work, from the user's perspective. For bugs: the correct behavior.

## Acceptance criteria

- [ ] …

## Design questions (prototype tickets only)

The only axes prototype variants may differ on. Every variant must satisfy every locked requirement.

1. …

Prototype URL: `/prototype/f<NN>/<topic>`

## Reuse notes

Existing components/helpers this ticket uses or extends. If none fit, say why.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run build` passes
- [ ] `npm test` passes (known baseline aside)
- [ ] API typecheck: no new errors
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F<NN> M<n>-<NN>: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

Filled in when done: what was checked, how, and the commit hash. For prototype tickets: the verdict, which variant was chosen, and the last commit hash of the prototype before deletion.
