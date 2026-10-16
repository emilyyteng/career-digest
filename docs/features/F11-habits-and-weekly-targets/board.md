# Board: Custom habits & weekly targets (F11)

Index of every ticket in this feature. Each ticket file's `Status:` line is the source of truth; update this board in the same commit. Spec: [spec.md](./spec.md).

## M0: Lock requirements & prototypes

**Milestone status:** Done

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|

<details>
<summary>Done (2)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M0-01](./tickets/M0/M0-01-prototype-habits-strip.md) | Prototype Habits strip (Home + Progress) | fe2e9ec |
| [M0-02](./tickets/M0/M0-02-prototype-weekly-goals-incrementer.md) | Prototype weekly goals column + incrementer | 6363801 |

</details>

## M1: Daily custom habits — data & API

**Milestone status:** In progress

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M1-02](./tickets/M1/M1-02-custom-habit-streaks-points.md) | Custom habit streaks + points | build | Draft | Blocked by M1-01; derive + ledger |
| [M1-03](./tickets/M1/M1-03-custom-habits-api.md) | Custom habits HTTP API + today payload | build | Draft | Blocked by M1-02 |

<details>
<summary>Done (1)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M1-01](./tickets/M1/M1-01-custom-habits-schema.md) | Custom daily habits schema | (this commit) |

</details>

## M2: Daily habits UI + This week / Home strip

**Milestone status:** Not started

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M2-01](./tickets/M2/M2-01-habits-strip-ui.md) | Habits strip on Home + Progress | build | Draft | Blocked by M1-03; verdict D |
| [M2-02](./tickets/M2/M2-02-strip-reflection-and-log-lc.md) | Strip Add reflection + Log LC | build | Draft | Blocked by M2-01 |
| [M2-03](./tickets/M2/M2-03-this-week-remodel.md) | This week remodel around Habits strip | build | Draft | Blocked by M2-01 |

<details>
<summary>Done (0)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|

</details>

## M3: Custom weekly targets

**Milestone status:** Not started

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M3-01](./tickets/M3/M3-01-custom-weekly-schema.md) | Custom weekly targets schema | build | Draft | After M1-03 OK; UI waits M2-03 |
| [M3-02](./tickets/M3/M3-02-custom-weekly-api-seeds.md) | Custom weekly API + week-close Seeds | build | Draft | Blocked by M3-01 |
| [M3-03](./tickets/M3/M3-03-weekly-column-ui.md) | Progress weekly goals column UI | build | Draft | Blocked by M3-02, M2-03 |
| [M3-04](./tickets/M3/M3-04-weekly-incrementer-ui.md) | Multi-goal weekly incrementer UI | build | Draft | Blocked by M3-02, M2-03; Q13 stepper |
| [M3-05](./tickets/M3/M3-05-home-targets-customs.md) | Home Targets for custom weeklies | build | Draft | Blocked by M3-02 |
| [M3-06](./tickets/M3/M3-06-prototype-cleanup.md) | Delete F11 M0 prototypes | build | Draft | After M2-01/02 + M3-03/04/05 |

<details>
<summary>Done (0)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|

</details>
