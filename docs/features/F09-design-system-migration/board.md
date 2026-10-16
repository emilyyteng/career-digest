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

**Milestone status:** Done

No open tickets.

<details>
<summary>Done (16)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|
| [M1-01](./tickets/M1/M1-01-production-tokens-fonts-brand.md) | Production tokens, fonts, shell 1100, flora mark | `9b5af76` |
| [M1-02](./tickets/M1/M1-02-button-field-segmented-primitives.md) | Button, field, segmented primitives | `caa0d3c` |
| [M1-03](./tickets/M1/M1-03-tabs-and-badge-helpers.md) | Tabs / chrome-tab + badge helpers | `26329b2` |
| [M1-14](./tickets/M1/M1-14-apply-heat-urgency-washes.md) | Apply heat, urgency, surface-2 washes | `7e7c335` |
| [M1-04](./tickets/M1/M1-04-neutralize-global-control-defaults.md) | Neutralize global button/field defaults | `8af8ad0` |
| [M1-05](./tickets/M1/M1-05-pilot-home.md) | Pilot migrate Home + app shell | `6ab5517` |
| [M1-15](./tickets/M1/M1-15-prototype-home-chrome-refinements.md) | Prototype + lock Home chrome & urgency refinements | `518386b` |
| [M1-06](./tickets/M1/M1-06-pattern-feature-shell-nested-tabs.md) | Pattern: feature shell / nested tabs (Q9/Q15) | `1d71980` |
| [M1-07](./tickets/M1/M1-07-pattern-paired-panel-height.md) | Pattern: paired panel height + in-panel overflow (Q16) | `2a60bb0` |
| [M1-08](./tickets/M1/M1-08-pattern-chrome-budget.md) | Pattern: chrome budget / width (Q16 remainder) | `9855852` |
| [M1-09](./tickets/M1/M1-09-pattern-list-pagination.md) | Pattern: list pagination (Q8/R.7) | `b700154` |
| [M1-10](./tickets/M1/M1-10-pattern-earnflash-placement.md) | Pattern: EarnFlash placement (Q10/R.9) | `e25943c` |
| [M1-11](./tickets/M1/M1-11-pattern-compact-long-pages.md) | Pattern: compact long-page tactics (Q11/R.10) | `62ed23a` |
| [M1-16](./tickets/M1/M1-16-in-content-link-hover.md) | Apply in-content link hover app-wide | `fd60056` |
| [M1-12](./tickets/M1/M1-12-modal-anatomy.md) | Modal chrome anatomy | `cbb2f5e` |
| [M1-13](./tickets/M1/M1-13-enforcement-variant-lint.md) | Enforcement for variant-less controls (Q6) | `3afa0e1` |

</details>

## M2: Core surface waves

**Milestone status:** Not started

Tickets after M1. Expected: Tasks compaction (R.10 / M1-11 tactics); **Jobs / Applications / Interviews → `ChromeTab` + containerized title→tabs→squared filter chips** + shared `Pager` (drop jump select); Jobs banner → `OneTimeNotice` (R.6); Progress apply M1-07 height + EarnFlash near-control (M1-10) + This week composition.

<details>
<summary>Done (0)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|

</details>

## M3: Finish & harden

**Milestone status:** Not started

Tickets after M2. Expected: remaining pages; CSS split if still warranted (Q7); retire dead opt-outs / obsolete prototype styles; feature close-out. Achievement unlock → `ModalLayer` is already ticketed (surfaced in M1-12).

| Ticket | Title | Type | Status | Notes |
|--------|-------|------|--------|-------|
| [M3-01](./tickets/M3/M3-01-achievement-unlock-modallayer.md) | Achievement unlock → ModalLayer | bug | Ready | From M1-12; R.4 |

<details>
<summary>Done (0)</summary>

| Ticket | Title | Commit |
|--------|-------|--------|

</details>
