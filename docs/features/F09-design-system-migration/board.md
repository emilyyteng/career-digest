# Board: Design system migration (F09)

Index of every ticket in this feature. Each ticket file's `Status:` line is the source of truth; update this board in the same commit. Spec: [spec.md](./spec.md).

## M0: Visual direction & foundations

**Milestone status:** Done

No open tickets.

<details>
<summary>Done (3)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M0-01](./tickets/M0/M0-01-production-ui-inventory.md) | Production UI visual inventory (spike) | `e872617` / `9297b9d` + review close-out |
| [M0-02](./tickets/M0/M0-02-prototype-visual-direction.md) | F09 visual-direction prototypes (exploratory lab) | `548ba4e` |
| [M0-03](./tickets/M0/M0-03-lock-visual-foundations.md) | Lock visual foundations into `docs/design-system.md` | `b26fb29` |

</details>

## M1: Primitives, patterns, enforcement, pilot migrate

**Milestone status:** Design

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M1-06](./tickets/M1/M1-06-pattern-feature-shell-nested-tabs.md) | Pattern: feature shell / nested tabs (Q9/Q15) | docs | Ready | Parallel OK |
| [M1-07](./tickets/M1/M1-07-pattern-paired-panel-height.md) | Pattern: paired panel height + in-panel overflow (Q16) | docs | Draft | Progress stress; parallel OK |
| [M1-08](./tickets/M1/M1-08-pattern-chrome-budget.md) | Pattern: chrome budget / width (Q16 remainder) | docs | Draft | Height is M1-07 |
| [M1-09](./tickets/M1/M1-09-pattern-list-pagination.md) | Pattern: list pagination (Q8/R.7) | docs | Draft | Parallel OK |
| [M1-10](./tickets/M1/M1-10-pattern-earnflash-placement.md) | Pattern: EarnFlash placement (Q10/R.9) | docs | Draft | Parallel OK |
| [M1-11](./tickets/M1/M1-11-pattern-compact-long-pages.md) | Pattern: compact long-page tactics (Q11/R.10) | docs | Draft | Tactics only; Tasks = M2 |
| [M1-12](./tickets/M1/M1-12-modal-anatomy.md) | Modal chrome anatomy | build | Draft | After M1-02 |
| [M1-13](./tickets/M1/M1-13-enforcement-variant-lint.md) | Enforcement for variant-less controls (Q6) | build | Draft | After M1-05 |

<details>
<summary>Done (7)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M1-01](./tickets/M1/M1-01-production-tokens-fonts-brand.md) | Production tokens, fonts, shell 1100, flora mark | `9b5af76` |
| [M1-02](./tickets/M1/M1-02-button-field-segmented-primitives.md) | Button, field, segmented primitives | `caa0d3c` |
| [M1-03](./tickets/M1/M1-03-tabs-and-badge-helpers.md) | Tabs / chrome-tab + badge helpers | `26329b2` |
| [M1-14](./tickets/M1/M1-14-apply-heat-urgency-washes.md) | Apply heat, urgency, surface-2 washes | `7e7c335` |
| [M1-04](./tickets/M1/M1-04-neutralize-global-control-defaults.md) | Neutralize global button/field defaults | `8af8ad0` |
| [M1-05](./tickets/M1/M1-05-pilot-home.md) | Pilot migrate Home + app shell | `6ab5517` |
| [M1-15](./tickets/M1/M1-15-prototype-home-chrome-refinements.md) | Prototype + lock Home chrome & urgency refinements | `518386b` |

</details>

## M2: Core surface waves

**Milestone status:** Not started

Tickets after M1. Expected: Tasks compaction (R.10); Jobs / Applications / Interviews; Jobs banner → `OneTimeNotice` (R.6); Progress dual-column height apply (from M1-07).

<details>
<summary>Done (0)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|

</details>

## M3: Finish & harden

**Milestone status:** Not started

Tickets after M2. Expected: remaining pages; CSS split if still warranted (Q7); retire dead opt-outs / obsolete prototype styles; feature close-out.

<details>
<summary>Done (0)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|

</details>
