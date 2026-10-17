# Design system

The source of truth for visual and interaction conventions in `apps/web`. **Read this before changing any `.tsx` or `.css` in the web app.** It overrides tickets and prototypes on anything visual (see `AGENTS.md` → Precedence). If a feature requirement conflicts with or is ambiguous against this file, surface that to the user before implementing (`AGENTS.md` → Feature requirements vs design system).

**Status:** Visual foundations locked (F09 M0, 2026-10-15; urgency revised to Severity-4 2026-10-15; **M1-15 chrome/urgency refinements 2026-10-15**). **Role tokens, Plex fonts, 1100px shell, and flora.exe mark are live** (F09 M1-01). **Button / Field / Segmented** (M1-02), **ChromeTab / Badge** (M1-03), **heat / Severity-4 urgency / surface-2 washes** (M1-14), **neutralized global button/field defaults** (M1-04), and **Home pilot + M1-15 refinements** are live; patterns and remaining page waves still migrate. Reference composition: `/prototype/f09/lab` (dev), verdict commit `548ba4e`. Refinements lab: `/prototype/f09/refinements` (kept while useful).

**Migration approach:** comprehensive system + phased migration (F09). M1 builds primitives and interaction/IA patterns; M2–M3 restyle surfaces. Extend this doc when something new is needed—do not fork a feature-local look.

## Hard rules (in effect now)

1. **Explicit variants, not global defaults.** Every interactive element gets its look from a named variant class or component. Never rely on bare element styling (`button`, `input`, `a`, ...).
2. **No new global or element-level CSS.** Don't add rules targeting bare elements, and don't add classes to the global `button:not(...)` opt-out chain in `styles.css`. That chain is legacy and is being removed.
3. **Use tokens.** Colors, radii and shadows come from `:root` variables (or the named roles below until production tokens are renamed). No raw hex values or ad-hoc `box-shadow` in new code except when introducing a documented token in the same change.
4. **One modal standard.** Every dialog renders inside `ModalLayer` (`apps/web/src/ModalLayer.tsx`). Don't build a backdrop, Escape handling or a discard guard yourself. Inner chrome: header → body → footer (see Patterns → Modal anatomy).
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

**Shell width — 1100px:** `.shell` uses `--shell-max: 1100px`. Wrap, column stack, and paired-panel height: see Patterns (M1-07 / M1-08).

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
| **Segmented** | `Segmented` — `.ui-segmented` + `.ui-seg` | Active = **soft ink wash** (ink text; not solid ink fill) | Compact in-content modes (e.g. Home 1w/2w). **Not** the page L2 filter under tabs (use filter chips) |
| **Filter chips** | Squared chip row (shared helper when first surface migrates) | Active = ink border + light wash; inactive = muted | Page L2 filters (Jobs location, Past work ledger type, …). Horizontal, wrap OK; **below tabs, left-aligned** (M1-06) |
| **Fields** | `TextField` · `SelectField` · `TextAreaField` — `.ui-field` (+ `.ui-field-num`); also bare `input`/`textarea`/`select` shim and `.rich-text-editor` | `md` · `num` (compact number) | Border-only hover; wash on focus. **Value text is regular weight (400)**. Never wrap `RichTextField` in a `<label>` (toolbar buttons are labelable — the first becomes the label’s control and steals clicks/focus); use `htmlFor` + editor `id` instead. Select is not the default L2 filter |
| **ChromeTab** | `ChromeTab` (button) · `ChromeTabLink` (NavLink) — `.ui-chrome-tab` (+ `-nav` / `-subnav` / `-page`) | Active = **underline ink**; hover = ink text only | App nav (`nav`), feature subnav (`subnav`), page tabs (`page`). Same language, quieter at smaller sizes |
| **Badge** | `Badge` — `.ui-badge` + `.ui-badge-<tone>` | Tones: `p0`–`p2`, `interview` (apps) / `goal` (**domain tech**), `applied`/`interviewing`/`accepted`/`declined`, `score`/`streak`, `liked` (warn), `danger`/`ok`/`dates`/`neutral` · sizes `md` / `compact` | Kind labels rendered **INTERVIEW** / **GOAL** uppercase; role tokens only |
| **Card** | `.card` | Soft shadow OK | All-carded |
| **Modal** | `ModalLayer` + `ModalHeader` / `ModalBody` / `ModalFooter` | Shell + inner anatomy (M1-12) | Footer: **secondary then primary** `Button`; flat (no shadow) |
| **Banner** | `EarnFlash` / `OneTimeNotice` | Mint base | EarnFlash near control (toast fallback); OneTimeNotice stays section-top (M1-10) |
| **Pager** | Shared `Pager` helper when first list migrates (M2+) | Prev · `page / pages` (mono text) · Next; default page size **25** | **No** page-jump `<select>`, **no** page-size selector. Jobs `.pager` + jump select is migration debt |
| **Heatmap** | `ProgressHeatmap` / `HistoryCalendar` via [`intensityScale.ts`](../apps/web/src/features/progress/intensityScale.ts) | `--heat-0`…`--heat-4` (vivid rose soft peak); empty = `--surface-2` | RGB lerp mirrors tokens; legend uses CSS vars |
| **Deadline urgency** | `DeadlineUrgency` + SVG pies + `.deadline-tone-*` | `--urgency-overdue` · `--urgency-soon` (pink) · `--urgency-ahead` (=P1) · `--urgency-ok` | Countdown: **Plex Mono**, zero-padded units joined by **`:`**; extra gap after pie cluster; SVG pies (no conic seam) |
| **Priority** | `PriorityBadge` → `Badge` `p0`–`p2` compact | P0–P2 RYG | |
| **In-content links** | Global `a` (M1-16); Home `.home-section-link` / title wrappers | Resting + hover text = **ink**; hover = **underline** (no blue/purple) | See Patterns → In-content links for exceptions |

Interim F08 `ui-btn*`, old `.tab.on` blue active, legacy `.badge.*`, and bare `input`/`textarea`/`select` structural shim remain in `styles.css` for unmigrated call sites. New UI must use `apps/web/src/ui`. Do not reintroduce a global filled `button` default or a `:not(...)` opt-out chain.

## Patterns

### Page chrome / nesting (F09 M1-06 · R.8 / Q9 / Q15)

Locked via `/prototype/f09/nesting` (verdict 2026-10-15). Lives in this file (not a separate IA doc).

**Containerized anatomy** — inside one `.card` (nothing on the pink desk):

1. **Page title** (display / ink)
2. **Subnav or page tabs** — `ChromeTab` underline
3. **Optional L2 filter** — **squared chip row**, horizontal, **below tabs, left-aligned** (wraps when needed)
4. **Content**

| Role | When | Control |
|------|------|---------|
| **Feature shell + subnav** | Peer destinations with different jobs | Nested routes + `ChromeTab` `size="subnav"` — **Progress**, **Rewards** |
| **Page tabs** | Same resource, peer partitions | `ChromeTab` `size="page"` — Jobs ranked/unranked, Tasks open/completed, … |
| **Filter chips** | Narrow within a partition | Squared chip row — never ChromeTab clothes, not rounded `Segmented` |

**Chrome budget:** app nav (L0) → **one of** {feature subnav, page-tab row} → at most one L2 chip row → content. Never two ChromeTab rows stacked. Calendar/day selection is **content chrome**, not a nav level. Keep **top nav** (no side nav in M1). Primary writes stay **modals** unless they need a deep-linkable destination (unchanged).

**Conforming targets:** Progress and Rewards already use route shells + subnav; bring them (and Jobs location / Past work ledger type) onto title→tabs→chips anatomy in surface waves. Past work Completions/Points/Reflections demote from nested tabs to L2 chips.


### Paired panel height + overflow (F09 M1-07 · Q16)

Locked via `/prototype/f09/layout` (verdict 2026-10-15).

**Equal peer columns:** sibling panels that are meant to read as a pair share a **fixed 28rem** body height (`height: 28rem; overflow: auto`). Content scrolls **inside** each panel. Do **not** use a shared `100dvh` viewport track. Stress case: Progress Past work (calendar + ledger).

**When columns stack** (narrow breakpoint): turn equal-height **off**; each panel returns to natural document flow (list bodies may still clamp).

**Single-column pages:** no forced page min-height.

**Many list regions on one page (Tasks):** prefer **section chips → one scroll well** over several open clamped sections. Chip counts follow the **active page tab only** (chips sit below the tab — open counts on Open, done counts on Completed).

**Unequal density:** when one region is a short control (“mini-container”) and another is a tall list, **stack the mini above the larger well** — do not force them into equal peer cards. Progress This week page composition (where LC / daily / weekly goals sit; dual weekly+misc +/-) is **M2 surface work**, not a second height dialect.

### Chrome budget / width (F09 M1-08 · Q16 remainder)

Locked via `/prototype/f09/layout` (verdict 2026-10-15). Shell stays **1100px**.

| Rule | Lock |
|------|------|
| L2 filter chips | **Wrap** (no nowrap + horizontal scroll) |
| Dual columns | `minmax(16rem, 1fr) minmax(0, 1.2fr)`; **stack at 640px** (same breakpoint for compose/action wrap) |
| Gaps | Page stack **1rem**; dual-column gap **0.85rem** |
| Breakpoints | **640 / 860 / 1100** (prefer these over one-off 520–900 values) |
| Labels | Shorten only when a control cannot wrap; prefer wrap for chips |

Stress cases: Jobs location chips; Past work compose + columns.

### List pagination (F09 M1-09 · R.7 / Q8)

Locked via `/prototype/f09/patterns` surface A (verdict 2026-10-15).

**Default:** long lists use a classic **bottom pager** — Prev · `page / pages` · Next — under the list (or under a clamped well). Default page size **25**. Optional duplicate pager above when the well is tall. Reject infinite scroll / “load more” as the system default.

**Standardize as a shared `Pager` component** (build when the first list migrates; document the contract now). Anatomy is only Prev / current-page text / Next. **Do not** include a page-jump `<select>` (Jobs today) or a page-size selector.

**Special case:** calendar-anchored time series (Progress Past work completions) may use a day / **7-day window** instead of numbered pages — Progress-only, not the general list rule.

**Migrate later:** completions diary and similar logs; Jobs `.pager` → shared `Pager` (drop jump select); long boards inside 28rem wells (with M1-07).

### EarnFlash / notice placement (F09 M1-10 · R.9 / Q10)

Locked via `/prototype/f09/patterns` surface B (verdict 2026-10-15).

| Banner | Placement |
|--------|-----------|
| **`EarnFlash`** | **Near the control that earned** (inline under the row / action cluster, or a small portal anchored to that control). Must appear in the current viewport without scrolling to the page top. **Fallback:** sticky viewport toast when the action has no stable anchor (e.g. after modal close). Reject page-top-only and scroll-into-view jerks as the default. |
| **`OneTimeNotice`** | Does **not** share the near-control rule. Event/result chrome may stay at the **host section top** (preferably still in that section’s first viewport). |

Apply near-control EarnFlash on Tasks / Progress hosts in a follow apply ticket or M2 wave; pattern is locked here.

### Compact long pages (F09 M1-11 · R.10 / Q11)

Locked via `/prototype/f09/patterns` surface C (verdict 2026-10-15). **Tasks** is the first migrate target (M2).

Ordered tactics:

1. **Section chips → one scroll well** (M1-07; tab-scoped counts)
2. **Paginate inside the well** (M1-09 `Pager`, size 25)
3. **28rem clamp** on the primary list body (M1-07)
4. Slightly tighter row density only after 1–3
5. Sticky compose / primary write only if actions still fall below the first viewport after 1–4

Do not re-open multi-select accordion stacks as the Tasks standard.

### In-content links (F09 M1-16 · M1-15 verdict)

Locked via Home pilot + app-wide apply (2026-10-15).

**Default:** `a` uses **ink** text at rest and on hover; **underline on hover** (`text-underline-offset: 0.14em`). No blue resting color and no purple hover.

**Exceptions (do not use the content-link hover dialect):**

| Surface | Behavior |
|---------|----------|
| **`ChromeTab` / `ChromeTabLink`** | Hover = ink text only; underline only when **active** (ui.css) |
| **Brand mark** (`.top-brand`) | No underline; ink title |
| **Block card hits** (`.card-hit`, `.application-card-*`, `.home-job-main`, …) | No underline on the wrapper; underline the **title child** on hover |
| **`a.external`** | Same ink + underline hover; class is layout/mono only (not a color dialect) |
| **Rich text / JD body** (`.description a`, `.rich-text-editor a`) | Always underlined in prose; ink color |

Buttons styled as links (e.g. `.document-link`) follow the same ink + underline language.

### Modal anatomy (F09 M1-12 · R.4)

Locked 2026-10-15. Shell stays **`ModalLayer`** only (backdrop, Escape, optional dirty discard).

**Inner structure** (helpers in `apps/web/src/ui/ModalChrome.tsx`):

1. **`ModalHeader`** — title (`h2` via `title`+`id`, or custom heading children); optional muted context under the title
2. **`ModalBody`** — fields, copy, optional panels
3. **`ModalFooter`** — action row (also has `.form-actions` for legacy CSS). **Secondary / Cancel first, then primary / Confirm** using `Button` (`secondary` default, `variant="primary"`)

Sizes: `Button` `md` default; `sm` only when density requires it. Footer buttons stay **flat** (no shadow). Compact nested confirms (discard) use the same anatomy inside `.modal.modal-compact`.

Reference migrations: `CompleteWorkModal`, `ModalLayer` discard dialog, Add-application discard confirm. Other modals may keep raw `h2` + `.form-actions` until their surface wave; new modals should use the helpers.

**Known debt:** Achievement unlock still bypasses `ModalLayer` — ticketed as [F09 M3-01](./features/F09-design-system-migration/tickets/M3/M3-01-achievement-unlock-modallayer.md).

### Enforcement (F09 M1-13 · Q6 / R1.3)

`npm run check` runs **`npm run check:ui`** → `scripts/check-ui-variants.mjs`.

| Rule | Scope |
|------|--------|
| Bare `<button>` (no `className`) | All `apps/web/src/**` except `ui/` and `prototype/` |
| Unclassed `<input>` / `<textarea>` / `<select>` | **Home tree only** (`pages/Home.tsx`, `features/home/`); expand with M2 form waves |
| Exempt | `apps/web/src/ui/*` (primitives), `prototype/**` |

Allowed buttons use `Button` or a named feature class (`.secondary`, `.todo-remove-btn`, `.tab`, …). Prefer `Button` / `TextField` for new UI. Matches are case-sensitive HTML tags (React `<Button>` is not flagged).

Pilot surface for primitives: **Home** (F09 M1-05 + M1-15). App shell: flora.exe + underline chrome-tabs + 1100px.

**Migration debt (do not invent new dialects):** Tasks / Progress / Rewards use `ChromeTab`. **Jobs, Applications, Interviews** still use legacy `.tabs` / `.tab.on` blue — migrate to `ChromeTab` + **containerized title → tabs → filter chips → content** in the **M2** surface wave. Jobs `.pager` jump select → shared `Pager` (no select).

## Banner patterns

Two mint status banners. Pick one; don't invent a third.

| Pattern | Component | When to use | Dismissal | Persistence |
|---------|-----------|-------------|-----------|-------------|
| **Transient flash** | [`EarnFlash`](../apps/web/src/features/completion/EarnFlash.tsx) | Immediate feedback after a points-earning action | Auto-hides after ~4s; × also dismisses | None |
| **One-time notice** | [`OneTimeNotice`](../apps/web/src/features/notices/OneTimeNotice.tsx) | A result the user should see once per event | × hides for the current view | Marked seen in `localStorage` under a caller-supplied key **as soon as it is shown** |

Visual base: mint border/background. Moving the Jobs ranking banner onto `OneTimeNotice` is F09 R.6 (M2).

**Placement (M1-10):** `EarnFlash` near the earning control (viewport toast fallback). `OneTimeNotice` stays section-top — different job.

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
| Link hover | Global blue + purple hover; mixed page locals | **Ink + underline on hover** (M1-16); ChromeTab / brand / card-hit / rich-text exceptions |
| Nesting / filters | Route shells vs query tabs; location chips as fake tabs; rounded Segmented as L2 | **Containerized title → ChromeTab → squared chips (below, left)**; shells for Progress/Rewards (M1-06) |
| Paired panel height | Independent grow · viewport track · asymmetric natural/clamp | **Both peers fixed 28rem**; overflow inside (M1-07) |
| Stacked list regions | Many open 28rem clamps | **Section chips → one well**; counts match active tab (M1-07) |
| Unequal density | Equal peer cards for short control + tall list | **Mini above larger well** (M1-07); Progress page layout in M2 |
| Chip rows | Nowrap + overflow-x | **Wrap** (M1-08) |
| Long lists | Unpaginated · load more · Jobs jump select | **Bottom `Pager`** (Prev / n/pages / Next), size 25; no select (M1-09) |
| EarnFlash | Page-top only | **Near control**; toast fallback (M1-10) |
| Long pages (Tasks) | Many open sections | **Chips → clamp → pager** (+ density / sticky only if needed) (M1-11) |
| Heatmap | Navy peak | **Vivid rose soft peak** |
| Shell | 960px | **1100px** |
| Fonts | JetBrains + DM Sans | **IBM Plex Mono + Sans** (roles) |

## UI review checklist

Run before marking any UI ticket done:

- [ ] No new bare-element CSS; no global filled `button` default; no `:not(...)` opt-out chain
- [ ] Every button, tab and field uses a named variant (`Button` / `TextField` / ChromeTab / …)
- [ ] Page chrome follows title → tabs/subnav → optional squared filter chips (left, below) → content inside a card; no stacked ChromeTab rows
- [ ] Peer dual columns use fixed 28rem bodies with in-panel scroll; stacked list regions use section chips → one well when applicable
- [ ] Unequal-density regions stack mini above large (not equal peer cards for short controls)
- [ ] Filter chips wrap; dual columns stack at 640px
- [ ] Long lists use bottom `Pager` (no jump/size select); EarnFlash near control (toast fallback); OneTimeNotice section-top
- [ ] Long pages follow chips → clamp → pager before density/sticky compose
- [ ] In-content links: ink + underline on hover; ChromeTab/brand/card-hit/rich-text exceptions respected
- [ ] Only tokens / documented roles for color, radius and shadow
- [ ] Dialogs use `ModalLayer`; new modals use header → body → footer with secondary then primary `Button`
- [ ] Reused existing components where they fit (listed in the ticket)
- [ ] Compared against neighboring surfaces for size and spacing consistency
- [ ] Color roles respected (identity ≠ severity ≠ urgency; purple = tech only)
- [ ] If a new look or pattern was required, it was added to this file (not left as a feature-local one-off)
- [ ] If the ticket conflicted with this file, the conflict was surfaced to the user first
