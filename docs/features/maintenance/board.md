# Board: Maintenance

Index of every maintenance ticket. Each ticket file's `Status:` line is the source of truth; update this board in the same commit. Spec: [spec.md](./spec.md).

Maintenance has no milestones, so the board has one open table and one done list.

## Open

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [MT-04](./tickets/MT-04-shared-queryable-type.md) | Share one `Queryable` type instead of 11 private copies | refactor | Ready | |
| [MT-02](./tickets/MT-02-legacy-docs.md) | Re-home or retire legacy local docs | docs | Draft | Deferred until after feature work |
| [MT-05](./tickets/MT-05-unapply-delete-application-spike.md) | Spike: should applications be un-appliable or deletable, and what happens to their points and links? | spike | Draft | Not scheduled |
| [MT-07](./tickets/MT-07-reclaim-postings-columns.md) | Reclaim dropped-column slots on the dev `postings` table | cleanup | Draft | Not scheduled |
| [MT-10](./tickets/MT-10-npm-audit-review.md) | Review `npm audit` warnings | spike | Draft | Not scheduled |
| [MT-11](./tickets/MT-11-negative-points-notifications.md) | Spike: notifications for negative point events | spike | Draft | Not scheduled; surfaced F11 M2-01 |

<details>
<summary>Done (5)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [MT-01](./tickets/MT-01-api-typecheck-errors.md) | Fix all 17 API typecheck errors; add `npm run typecheck` and `npm run check` | `858febf` |
| [MT-03](./tickets/MT-03-flaky-api-tests.md) | Make API integration tests deterministic | `2c5f514` |
| [MT-06](./tickets/MT-06-migration-tracking.md) | Track applied migrations so each runs once | `7e1604c` |
| [MT-08](./tickets/MT-08-typecheck-api-tests.md) | Typecheck API test files too | `9d067ed` |
| [MT-09](./tickets/MT-09-ci-runs-check.md) | CI runs `npm run check` | `56dc437` |

</details>
