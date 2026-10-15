# Design system

The source of truth for visual and interaction conventions in `apps/web`. **Read this before changing any `.tsx` or `.css` in the web app.** It overrides tickets and prototypes on anything visual (see `AGENTS.md` → Precedence). If a feature requirement conflicts with or is ambiguous against this file, surface that to the user before implementing (`AGENTS.md` → Feature requirements vs design system).

**Status:** Visual foundations locked (F09 M0, 2026-10-15; urgency revised to Severity-4 2026-10-15; **M1-15 chrome/urgency refinements 2026-10-15**). **Role tokens, Plex fonts, 1100px shell, and flora.exe mark are live** (F09 M1-01). **Button / Field / Segmented** (M1-02), **ChromeTab / Badge** (M1-03), **heat / Severity-4 urgency / surface-2 washes** (M1-14), **neutralized global button/field defaults** (M1-04), and **Home pilot + M1-15 refinements** are live; patterns and remaining page waves still migrate. Reference composition: `/prototype/f09/lab` (dev), verdict commit `548ba4e`. Refinements lab: `/prototype/f09/refinements` (kept while useful).

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

**Typography — IBM Plex:** Display / chrome / titles / tabs / badges / numbers → **IBM Plex Mono** (`--font-display`). Body → **IBM Plex Sans** (`--font-body`). Live in production (M1-01).

**Shell width — 1100px:** `.shell` uses `--shell-max: 1100px`. Full chrome-budget / wrap rules remain M1 (Q15 / remaining Q16).

**Brand mark — flora.exe:** Top chrome mark (M1-01). Full string rewrite across the app is not required in M1.

## Color meaning (roles)

Keep the named hue set small. Map meaning onto roles — do not invent page-local colors.

| Role | Meaning | Notes |
|------|---------|--------|
| **Ink** | Chrome text, primary actions, active tab text/border | Near-black `#1a181c` |
| **Brand / blush** | Atmosphere, reward domain, brand spark | Pastel pink; not primary button fill |
| **Domain apps** | Application / pipeline identity | Blue — e.g. applied, interview *kind* badge |
| **Domain tech** | Technical / streak / score / **GOAL kind** identity | **Purple** — streaks, rank/score chips, interviewing status, GOAL badge. Not chrome, not urgency |
| **Domain reward** | Motivation / seeds / collection | Blush / reward pink — not GOAL (GOAL is domain tech) |
| **Severity P0 / P1 / P2** | Priority traffic | **R / Y / G** (`#c23b3b` / `#d4a017` / `#2f8f5b`) |
| **Urgency (Severity 4)** | Deadline time pressure | Overdue=P0 · soon=pink (&lt;24h) · **ahead=P1 gold** · ok=mint. **No purple/blue/gray mid** (frees domain tech) |
| **Success / ok** | Positive feedback, met state | Mint |
| **Danger** | Destructive / error | Rose-danger (distinct from brand blush when possible) |
| **Surfaces** | `--surface` cards; `--surface-2` warm/cool washes for containers & description blocks | Not purple washes |
| **Tab active** | Underline ink | Active = ink text + 2px ink underline; hover = ink text only (no underline); no gray wash fill (M1-15) |
| **Heat (vivid rose, soft peak)** | Productivity intensity empty→peak | `#fff8fa` → `#fce4ee` → `#f5c0d4` → `#eba0bc` → `#e078a0` (peak = former step-3 intensity) |

**Identity ≠ severity ≠ urgency.** Purple means “tech/identity,” not “due soon.”

## Tokens

Live in `:root` in [`apps/web/src/styles.css`](../apps/web/src/styles.css) (F09 M1-01). Prefer **role names** in new code. Legacy `--accent-*`, `--font-sans` / `--font-mono`, `--radius-card` / `--radius-soft` remain as aliases so unmigrated pages keep working.

| Group | CSS variables (live) | Policy |
|-------|----------------------|--------|
| Surfaces | `--bg`, `--bg-gradient-end`, `--surface`, `--surface-2`, `--hover`, `--tab-active-bg`, `--overlay` | `--surface-2` is warm (not purple) |
| Borders / text | `--border`, `--border-strong`, `--text`, `--text-muted`, `--text-subtle`, `--ink` | Active chrome uses `--ink` |
| Brand / domain | `--brand`, `--brand-deep`, `--domain-apps`(+`-deep`), `--domain-tech`(+`-deep`), `--domain-reward`(+`-deep`) | Aliases: `--accent-pink/blue/purple` |
| Severity | `--severity-p0`, `--severity-p1`, `--severity-p2` | RYG priority |
| Urgency | `--urgency-overdue`, `--urgency-soon` (pink), `--urgency-ahead` (=P1), `--urgency-ok` | Severity-4; ahead shares P1 gold; no purple/blue/gray mid |
| Heat | `--heat-0` … `--heat-4` | Vivid rose soft peak |
| Success / warn / danger | `--ok`, `--ok-soft`, `--warn`, `--warn-soft`, `--danger`, `--danger-deep` | Mint / amber / rose-danger |
| Radius | `--radius-panel`, `--radius-control`, `--radius-seg`, `--radius-pill` (+ legacy `--radius-card/soft/soft-box`) | Squared controls; pill seg/chips |
| Elevation | `--shadow-soft`, `--shadow-modal`, `--shadow-button: none`, `--shadow-minimal` | Flat controls |
| Type | `--font-display` (Plex Mono), `--font-body` (Plex Sans); `--font-mono`/`--font-sans` alias | Loaded from `index.html` |
| Layout | `--shell-max: 1100px` → `.shell` | Chrome budget still M1-08 |

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

Visual appearance locked (M0). Shared React primitives live in [`apps/web/src/ui/`](../apps/web/src/ui/) (F09 M1-02+). Import from `../ui` (or `@/` if aliased). Styles: [`ui/ui.css`](../apps/web/src/ui/ui.css) (loaded from `main.tsx`).

| Component | Implementation | Variants / sizes | Policy |
|-----------|----------------|------------------|--------|
| **Button** | `Button` — classes `secondary ui-button` (+ `-primary` / `-ghost` / `-sm`) | `primary` · `secondary` · `ghost` × `sm` / `md` | Flat ink primary. Global filled-blue `button` + `:not(...)` chain removed (M1-04). Legacy `button.secondary` / `modal-confirm-btn` restyled to ink |
| **Segmented** | `Segmented` — `.ui-segmented` + `.ui-seg` | Active = **soft ink wash** (ink text; not solid ink fill) | Distinct from track (`--surface-2`); M1-15 |
| **Fields** | `TextField` · `SelectField` · `TextAreaField` — `.ui-field` (+ `.ui-field-num`) | `md` · `num` (compact number) | Border-only hover; wash on focus |
| **ChromeTab** | `ChromeTab` (button) · `ChromeTabLink` (NavLink) — `.ui-chrome-tab` (+ `-nav` / `-subnav` / `-page`) | Active = **underline ink** | App nav, feature subnav, page tabs. Matches lab Completions shortened-label underline. Flat; display font |
| **Badge** | `Badge` — `.ui-badge` + `.ui-badge-<tone>` | Tones: `p0`–`p2`, `interview` (apps) / `goal` (**domain tech**), `applied`/`interviewing`/`accepted`/`declined`, `score`/`streak`, `liked` (warn), `danger`/`ok`/`dates`/`neutral` · sizes `md` / `compact` | Kind labels rendered **INTERVIEW** / **GOAL** uppercase; role tokens only |
| **Card** | `.card` | Soft shadow OK | All-carded |
| **Modal** | `ModalLayer` | Anatomy M1-12 | Secondary then primary |
| **Banner** | `EarnFlash` / `OneTimeNotice` | Mint base | Placement M1-10 |
| **Heatmap** | `ProgressHeatmap` / `HistoryCalendar` via [`intensityScale.ts`](../apps/web/src/features/progress/intensityScale.ts) | `--heat-0`…`--heat-4` (vivid rose soft peak); empty = `--surface-2` | RGB lerp mirrors tokens; legend uses CSS vars |
| **Deadline urgency** | `DeadlineUrgency` + SVG pies + `.deadline-tone-*` | `--urgency-overdue` · `--urgency-soon` (pink) · `--urgency-ahead` (=P1) · `--urgency-ok` | Countdown: **Plex Mono**, zero-padded units joined by **`:`**; extra gap after pie cluster; SVG pies (no conic seam) |
| **Priority** | `PriorityBadge` → `Badge` `p0`–`p2` compact | P0–P2 RYG | |
| **In-content links (Home)** | `.home-section-link` / `.home-job-main` titles | Hover = **underline**; text may stay dark/ink (no purple required) | Underline is the hover signal (M1-15) |

Interim F08 `ui-btn*`, old `.tab.on` blue active, legacy `.badge.*`, and bare `input`/`textarea`/`select` structural shim remain in `styles.css` for unmigrated call sites. New UI must use `apps/web/src/ui`. Do not reintroduce a global filled `button` default or a `:not(...)` opt-out chain.

## Patterns

Interaction / IA / layout patterns are **Pending M1** tickets (see F09 board):

| Topic | Ticket | Notes |
|-------|--------|-------|
| Feature shell / nested tabs | F09 M1-06 | Q9 / Q15 |
| **Paired panel height + in-panel overflow** | F09 M1-07 | Q16 — sibling columns share height; scroll inside panels (user lean 2026-10-15) |
| Chrome budget / width | F09 M1-08 | Q16 remainder (shell width already 1100px) |
| List pagination | F09 M1-09 | Q8 / R.7 |
| EarnFlash placement | F09 M1-10 | Q10 / R.9 |
| Compact long pages | F09 M1-11 | Q11 / R.10 tactics; Tasks migrate in M2 |

Pilot surface for primitives: **Home** (F09 M1-05 + M1-15) — Ink desk titles, underline link hover, background-less last-digest, soft-ink `Segmented`, underline chrome-tabs; app shell uses flora.exe + 1100px.

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
| Segmented active | Blue / purple / blush / solid ink | **Soft ink wash** + ink text (M1-15) |
| Tabs / nav active | Pink lift, blue fill, gray wash box | **Underline ink**; display font (M1-15) |
| Titles | Pink / purple / mono mix | **Ink + display font** |
| Containment | Carded vs Rewards open canvas vs Progress hybrid | **All carded** |
| Elevation | Raised buttons + flat patches | **Flat controls**; soft cards + modal overlay only |
| Purple | Chrome, urgency mid, containers, streaks, GOAL pink | **Domain tech identity** (incl. GOAL badge); not urgency |
| Urgency | Prod pink/purple/blue/mint 5; then amber ahead | **Severity 4** (P0 → pink soon → **P1 gold ahead** → mint) |
| Priority | Mixed | **RYG traffic** |
| Countdown | Proportional sans, space-separated, conic pies | **Mono + padded `:` units**; SVG pies; gap after circles |
| Link hover (Home) | Purple-deep / invisible ink-only | **Underline** (text may stay dark) |
| Heatmap | Navy peak | **Vivid rose soft peak** |
| Shell | 960px | **1100px** |
| Fonts | JetBrains + DM Sans | **IBM Plex Mono + Sans** (roles) |

## UI review checklist

Run before marking any UI ticket done:

- [ ] No new bare-element CSS; no global filled `button` default; no `:not(...)` opt-out chain
- [ ] Every button, tab and field uses a named variant (`Button` / `TextField` / ChromeTab / …)
- [ ] Only tokens / documented roles for color, radius and shadow
- [ ] Dialogs use `ModalLayer`
- [ ] Reused existing components where they fit (listed in the ticket)
- [ ] Compared against neighboring surfaces for size and spacing consistency
- [ ] Color roles respected (identity ≠ severity ≠ urgency; purple = tech only)
- [ ] If a new look or pattern was required, it was added to this file (not left as a feature-local one-off)
- [ ] If the ticket conflicted with this file, the conflict was surfaced to the user first
