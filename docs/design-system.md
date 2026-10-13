# Design system

The source of truth for visual and interaction conventions in `apps/web`. **Read this before changing any `.tsx` or `.css` in the web app.** It overrides tickets and prototypes on anything visual (see `AGENTS.md` → Precedence).

**Status:** Skeleton. Rules marked **Pending** are not decided yet; they're being settled in the design-system migration (`docs/features/F09-design-system-migration/spec.md`). Until a rule is decided, don't invent one: follow the closest existing pattern, and flag the gap to the user.

## Hard rules (in effect now)

1. **Explicit variants, not global defaults.** Every interactive element gets its look from a named variant class or component. Never rely on bare element styling (`button`, `input`, `a`, ...).
2. **No new global or element-level CSS.** Don't add rules targeting bare elements, and don't add classes to the global `button:not(...)` opt-out chain in `styles.css`. That chain is legacy and is being removed.
3. **Use tokens.** Colors, radii and shadows come from `:root` variables. No raw hex values or ad-hoc `box-shadow` in new code.
4. **One modal standard.** Every dialog renders inside `ModalLayer` (`apps/web/src/ModalLayer.tsx`). Don't build a backdrop, Escape handling or a discard guard yourself.
5. **Reuse before adding.** Check the component catalogue below and existing `features/*` components before creating a new visual pattern.
6. **Unknowns go to the user.** If a needed decision isn't covered here, ask, then record the answer in this file.

## Principles

**Pending** (migration M0).

## Tokens

Defined in `:root` in `apps/web/src/styles.css`.

| Group | Tokens | Status |
|-------|--------|--------|
| Surfaces | `--bg`, `--bg-gradient-end`, `--surface`, `--surface-2`, `--overlay` | Existing |
| Borders | `--border`, `--border-strong` | Existing |
| Text | `--text`, `--text-muted`, `--text-subtle`, `--on-primary` | Existing |
| Accents | `--accent-{pink,blue,purple,mint,yellow}` and `-deep` versions | Existing; which accent is primary is **Pending** |
| Danger | `--danger`, `--danger-deep` | Existing |
| Radius | `--radius-card`, `--radius-soft` (pill), `--radius-soft-box` | Existing |
| Elevation | `--shadow-soft`, `--shadow-button`, `--shadow-minimal` | Existing; shadow policy is **Pending** |
| Type | `--font-sans` (DM Sans), `--font-mono` (JetBrains Mono) | Existing; size scale **Pending** |
| Spacing | none | **Pending** |

## Components

Each entry will list allowed variants, sizes, and when to use them.

| Component | Current implementation | Variants / sizes | Status |
|-----------|------------------------|------------------|--------|
| Button | Global `button` default (filled blue + shadow) and `button.secondary` | **Pending** | To be replaced with explicit variants |
| Modal | `ModalLayer` (backdrop, Escape, dirty-discard guard) | Inner anatomy (header, body, footer, button order) **Pending** | Layer is standard; anatomy unaudited |
| Tabs | `.tabs` / `.tab` / `.tab on`, plus feature-specific tabs (e.g. `.ledger-subtab`) | **Pending** | Conflicting patterns |
| Form fields | Global `input` / `textarea` / `select` rules | **Pending** | |
| Badge / chip | Several feature-specific classes | **Pending** | |
| Card | `.card` | **Pending** | |
| Banner | `EarnFlash` (mint status banner) | **Pending** | |
| Deadline urgency | `DeadlineUrgency` (pie circles + countdown) | n/a | Existing shared component |
| Priority | `PriorityBadge` | n/a | Existing shared component |

## Conflicting patterns → chosen standard

Filled in during migration M0 after an audit. Until then, don't add another competing variant.

| Area | Competing patterns | Standard |
|------|-------------------|----------|
| | | |

## UI review checklist

Run before marking any UI ticket done:

- [ ] No new bare-element CSS; no additions to the `button:not(...)` chain
- [ ] Every button, tab and field uses a named variant
- [ ] Only tokens for color, radius and shadow
- [ ] Dialogs use `ModalLayer`
- [ ] Reused existing components where they fit (listed in the ticket)
- [ ] Compared against neighboring surfaces for size and spacing consistency
