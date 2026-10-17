# Board: <Feature name> (F<NN>)

Index of every ticket in this feature. Each ticket file's `Status:` line is the source of truth; update this board in the same commit. Spec: [spec.md](./spec.md).

When a milestone has **no open tickets**, write `No open tickets.` under the milestone heading (plain prose, not a table). Do **not** leave an empty open-tickets table (header row with no data rows). Same rule for the maintenance board’s Open section when it is empty.

## M<n>: <Milestone name>

**Milestone status:** Not started | Design | In progress | Done | Done, with open tickets

<!-- While tickets are open, use a table: -->

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M<n>-01](./tickets/M<n>/M<n>-01-<slug>.md) | … | build | Ready | |

<!-- When none are open, replace the table with: -->

No open tickets.

<details>
<summary>Done (0)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|

</details>
