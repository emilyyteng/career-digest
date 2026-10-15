# Design system

The source of truth for visual and interaction conventions in `apps/web`. **Read this before changing any `.tsx` or `.css` in the web app.** It overrides tickets and prototypes on anything visual (see `AGENTS.md` → Precedence). If a feature requirement conflicts with or is ambiguous against this file, surface that to the user before implementing (`AGENTS.md` → Feature requirements vs design system).

**Status:** Visual foundations locked (F09 M0, 2026-10-15). Production CSS still largely reflects the pre-lock dialects; **new UI and F09 migration waves must follow this document.** Reference composition: `/prototype/f09/lab` (dev), verdict commit `548ba4e`.

**Migration approach:** comprehensive system + phased migration (F09). M1 builds primitives and interaction/IA patterns; M2–M3 restyle surfaces. Extend this doc when something new is needed—do not fork a feature-local look.

## Hard rules (in effect now)

1. **Explicit variants, not global defaults.** Every interactive element gets its look from a named variant class or component. Never rely on bare element styling (`button`, `input`, `a`, ...).
2. **No new global or element-level CSS.** Don't add rules targeting bare elements, and don't add classes to the global `button:not(...)` opt-out chain in `styles.css`. That chain is legacy and is being removed.
3. **Use tokens.** Colors, radii and shadows come from `:root` variables (or the named roles below until production tokens are renamed). No raw hex values or ad-hoc `box-shadow` in new code except when introducing a documented token in the same change.
4. **One modal standard.** Every dialog renders inside `ModalLayer` (`apps/web/src/ModalLayer.tsx`). Don't build a backdrop, Escape handling or a discard guard yourself.
5. **Reuse before adding.** Check the component catalogue below and existing `features/*` components before creating a new visual pattern.
6. **Unknowns go to the user.** If a needed decision isn't covered here, ask, then record the answer in this file.
7. **Log styling issues in F09; don't fix them in place.** An inconsistency found while doing other work goes into the Current behavior table of `docs/features/F09-design-system-migration/spec.md`, for F09's app-wide pass. Fix it now only if the ticket can't work without the fix.
8. **Extend the system, don't fork it.** If a feature needs a new look or pattern, add it here (and to shared primitives when they exist) in the same change. No long-lived feature-local styling tracks.

## Principles

**Vibe — Ink desk (V1×V4):** Soft sakura / blush page canvas with **ink** (near-black) for titles, primary actions, and active chrome text/borders. Baby pink remains brand atmosphere (background, borders, reward domain), not the default control fill.

**Brand — flora.exe:** Product mark / voice for new chrome. Soft growth + productive execution. Full rename of every user-facing string is not required in M0; use `flora.exe` for the brand mark going forward.

**Containment — all carded:** Content lives in bordered surface cards on the page gradient, including Rewards (earnings, pull history, rules, cat cake collection, banner). Open-canvas Rewards is retired as a dialect.

**Elevation — flat controls:** Buttons, tabs, chips, and fields have **no drop shadow**. Soft card shadow and modal overlay shadow are allowed. Secondary actions never elevate.

**Typography — IBM Plex:** Display / chrome / titles / tabs / badges / numbers → **IBM Plex Mono**. Body → **IBM Plex Sans**. (Production may still ship JetBrains + DM Sans until the M1 font migration; new UI targets Plex roles.)

**Shell width — 1100px:** `.shell` max-width target is **1100px** (was 960). Full chrome-budget / wrap rules remain M1 (Q15 / remaining Q16).

## Color meaning (roles)

Keep the named hue set small. Map meaning onto roles — do not invent page-local colors.

| Role | Meaning | Notes |
|------|---------|--------|
| **Ink** | Chrome text, primary actions, active tab text/border | Near-black `#1a181c` |
| **Brand / blush** | Atmosphere, reward domain, brand spark | Pastel pink; not primary button fill |
| **Domain apps** | Application / pipeline identity | Blue — e.g. applied, interview *kind* badge |
| **Domain tech** | Technical / streak / score identity | **Purple** — streaks, rank/score chips, interviewing status. Not chrome, not urgency |
| **Domain reward** | Motivation / seeds / goals | Blush / reward pink — e.g. goal kind badge |
| **Severity P0 / P1 / P2** | Priority traffic | **R / Y / G** (`#c23b3b` / `#d4a017` / `#2f8f5b`) |
| **Urgency (Severity 5)** | Deadline time pressure | Overdue=P0 · urgent=rose · soon=amber · ahead=muted gray · ok=mint. **No purple/blue** (frees domain tech) |
| **Success / ok** | Positive feedback, met state | Mint |
| **Danger** | Destructive / error | Rose-danger (distinct from brand blush when possible) |
| **Surfaces** | `--surface` cards; `--surface-2` warm/cool washes for containers & description blocks | Not purple washes |
| **Tab active wash** | Gray (`#ebe8ee`-class), not blush | With ink text + ink border |
| **Heat (vivid rose, soft peak)** | Productivity intensity empty→peak | `#fff8fa` → `#fce4ee` → `#f5c0d4` → `#eba0bc` → `#e078a0` (peak = former step-3 intensity) |

**Identity ≠ severity ≠ urgency.** Purple means “tech/identity,” not “due soon.”

## Tokens

Defined in `:root` in `apps/web/src/styles.css` today; **roles below are authoritative**. M1 renames/adds CSS variables to match. Until then, new code should use the closest existing token or introduce a named variable in the same change.

| Group | Role / policy | Status |
|-------|---------------|--------|
| Surfaces | Page gradient blush→cool; `--surface` cards; `--surface-2` for nested washes (not purple) | Locked (M0); prod values migrate in waves |
| Borders | Soft blush/gray borders; active chrome uses ink | Locked |
| Text | Ink primary; muted secondary | Locked |
| Accents | Brand blush; domain apps/tech/reward; severity RYG; success mint | Locked roles; prod `--accent-*` remap in M1 |
| Danger | True danger / declined | Locked |
| Radius | Panel ~12px; control ~8–10px (squared tabs); segmented track pill (`999px`); chip pill | Locked |
| Elevation | `--shadow-soft` cards OK; **no button shadow**; modal overlay shadow OK | Locked |
| Type | `--font-display` → Plex Mono; `--font-body` → Plex Sans; size ladder below | Locked roles; font files in M1 |
| Spacing | Compact control padding; stack gaps TBD in M1 with chrome budget | Partial (M0 sizes); gaps M1 |
| Layout | `.shell` **max-width 1100px** | Locked width; chrome budget M1 |
| Data viz | Shared vivid-rose soft-peak scale (5 stops) | Locked |
| Urgency | Severity-5 stops (see Color meaning) | Locked |
| Hover | Warm/gray wash on secondary; ink darken on primary; fields: **border only** on hover, wash on focus | Locked |

### Type size ladder (target)

| Role | Size | Stack |
|------|------|--------|
| Brand mark | ~1.15rem | display |
| Title / panel title | ~0.95rem | display |
| Nav / tab / segmented | ~0.78–0.8rem | display |
| Body | ~0.9rem | body |
| Muted / label | ~0.82rem | body |
| Badge / chip | ~0.7rem | display |

## Components

Visual appearance locked (M0). Shared React primitives land in M1.

| Component | Variants / sizes | Policy |
|-----------|------------------|--------|
| **Button** | `primary` (ink fill, white text) · `secondary` (surface, ink text, border) · `ghost` (no border) · sizes `sm` / `md` | Flat; primary hover darkens ink; secondary hover = wash + stronger border. Never blue/purple fill |
| **Segmented** | Rounded track; active = ink fill like primary | Not blush/purple select |
| **Tabs / nav / chips** | Squared control radius; active = gray wash + ink text + ink border; display font | App nav, feature subnav, and in-page tabs share this language (scale may differ) |
| **Fields** | Text, select, date | Surface bg; border strengthens on hover; wash **only on focus** |
| **Badge / chip** | Priority RYG · kind (interview/goal) · job status (applied / interviewing / accepted / declined) · score/streak (tech purple) · liked (warn) | Map onto color roles; no one-off hex |
| **Card** | Bordered surface + optional soft shadow | Default containment for all features including Rewards |
| **Modal** | `ModalLayer`; footer secondary then primary | Secondary flat; anatomy structure still M1 |
| **Banner** | `EarnFlash` / `OneTimeNotice` | Mint visual base unchanged; placement M1 (Q10) |
| **Heatmap** | Shared 5-stop rose scale | Peak must feel rewarding, not navy/ink |
| **Deadline urgency** | Severity-5 pie/countdown colors | No domain purple/blue in the middle steps |
| **Priority** | `PriorityBadge` P0–P2 RYG | Unchanged seating |

## Patterns

Interaction / IA patterns remain **Pending M1** (F09 Q8–Q11, Q15, remaining Q16): long-list pagination, feature shell vs in-page tabs depth, EarnFlash placement, compact long-page tactics, full chrome budget.

## Banner patterns

Two mint status banners. Pick one; don't invent a third.

| Pattern | Component | When to use | Dismissal | Persistence |
|---------|-----------|-------------|-----------|-------------|
| **Transient flash** | [`EarnFlash`](../apps/web/src/features/completion/EarnFlash.tsx) | Immediate feedback after a points-earning action | Auto-hides after ~4s; × also dismisses | None |
| **One-time notice** | [`OneTimeNotice`](../apps/web/src/features/notices/OneTimeNotice.tsx) | A result the user should see once per event | × hides for the current view | Marked seen in `localStorage` under a caller-supplied key **as soon as it is shown** |

Visual base: mint border/background. Moving the Jobs ranking banner onto `OneTimeNotice` is F09 R.6 (M2). Viewport placement for `EarnFlash` is F09 R.9 / Q10 (M1).

## Interim decisions (F08 M5) — superseded

The 2026-10-13 F08 M5 interim choices (tinted purple primary, blue toggles, flat M5-only) are **superseded** by the M0 Ink desk lock above. Do not use them for new UI. Historical note only; F08 direction page is not authoritative (F09 R.13).

## Conflicting patterns → chosen standard

| Area | Competing patterns (pre-M0) | Standard |
|------|----------------------------|----------|
| Primary button | Filled blue + shadow vs tinted purple vs ink | **Ink fill, flat** |
| Secondary / hover | Purple text + purple surface-2 wash; blue hover leak | **Ink text; gray/warm wash; no blue** |
| Segmented active | Blue / purple / blush | **Ink fill** (matches primary) |
| Tabs / nav active | Pink lift, blue fill, blush border, purple chips | **Gray wash + ink text/border**; display font |
| Titles | Pink / purple / mono mix | **Ink + display font** |
| Containment | Carded vs Rewards open canvas vs Progress hybrid | **All carded** |
| Elevation | Raised buttons + flat patches | **Flat controls**; soft cards + modal overlay only |
| Purple | Chrome, urgency mid, containers, streaks | **Domain tech identity only** |
| Urgency | Prod pink/purple/blue/mint 5 | **Severity 5** (P0→rose→amber→muted→mint) |
| Priority | Mixed | **RYG traffic** |
| Heatmap | Navy peak | **Vivid rose soft peak** |
| Shell | 960px | **1100px** |
| Fonts | JetBrains + DM Sans | **IBM Plex Mono + Sans** (roles) |

## UI review checklist

Run before marking any UI ticket done:

- [ ] No new bare-element CSS; no additions to the `button:not(...)` chain
- [ ] Every button, tab and field uses a named variant
- [ ] Only tokens / documented roles for color, radius and shadow
- [ ] Dialogs use `ModalLayer`
- [ ] Reused existing components where they fit (listed in the ticket)
- [ ] Compared against neighboring surfaces for size and spacing consistency
- [ ] Color roles respected (identity ≠ severity ≠ urgency; purple = tech only)
- [ ] If a new look or pattern was required, it was added to this file (not left as a feature-local one-off)
- [ ] If the ticket conflicted with this file, the conflict was surfaced to the user first
