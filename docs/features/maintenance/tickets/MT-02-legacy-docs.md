# MT-02: Re-home or retire legacy local docs

**Status:** Draft (deferred until after feature work)
**Blocked by:** (none)
**Implements:** n/a (maintenance)
**Type:** docs

## What to build

Every legacy local doc either has its useful content moved into the tracked docs system or is marked historical and deleted. After this ticket, `.gitignore` no longer needs the legacy-docs block.

These files are gitignored and local-only. Back them up outside the repo before deleting anything.

| Legacy item | Plan (to confirm with the user when this ticket starts) |
|-------------|------|
| `CONTEXT.md` (domain glossary, outdated) | Refresh into tracked `docs/glossary.md`, verified against code, then delete |
| `docs/adr/0001-quiet-hide-teach-flag.md` (quiet hide reuses dismiss rows with `teach=false`) | Fold into a jobs feature spec's decisions log if that spec is created, otherwise into the glossary entry for "Hide from board"; then delete |
| `docs/agents/` (GitHub Issues / triage-label setup from the skills pack) | Superseded by `AGENTS.md`; delete |
| `docs/specs/unified-tasks-backlog.md`, `progress-tracker.md`, `tickets/01–04` | Re-home as `Shipped` specs under `docs/features/`, or mark historical |
| `docs/specs/M4_TEST_CHECKLIST.md` | Fold into M4 verification notes in the accomplishment feature |
| `docs/specs/M5_DESIGN_NOTES.md` | Delete once the F08 spec (covering M5) is reviewed |

## Acceptance criteria

- [ ] Each item above is re-homed or deleted, per the plan as confirmed by the user
- [ ] `AGENTS.md` Legacy docs section and the `.gitignore` legacy block are removed or updated
- [ ] No tracked doc links to a gitignored file

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] Committed as `MT-02: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done.)
