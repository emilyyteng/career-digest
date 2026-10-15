# F09 M0-01 — Production UI inventory (draft findings)

**Status:** Closed with user review (2026-10-15) — inventory + §15–16 approach feed M0-02  
**Date:** 2026-10-15  
**Method:** Read-only audit of production `apps/web` (CSS + TSX). Prototypes excluded. Not verified in a running browser unless noted.

This document is the spike deliverable for [M0-01](./M0-01-production-ui-inventory.md). It is intentionally broader than the F09 Current behavior table. Feed M0-02 prototypes and M0-03 locks from here after review.

---

## Executive read

The app currently runs **two visual dialects at once**:

1. **Raised Sakura Terminal** — pastel page gradient, soft card shadows, filled-blue shadowed primaries, pill nav with a pink lift, raised in-page tabs.
2. **Clean / flat interim (F08 M5+)** — border-only controls (`ui-btn*`), flat Progress/Rewards subnav, no button shadows, tinted-purple primary.

They share one pastel token set, so the clash is not mainly a different palette. The strongest vibe drivers are **typography (JetBrains Mono vs DM Sans)**, **elevation**, **chrome**, and **accent roles**. M0 should decide the vibe (Q12) with type in the room, before locking button looks (Q1) or elevation (Q2).

A second structural problem sits under the dialects: **meaning is overloaded on the same accents** (blue = primary button *and* progress bars *and* selection *and* “ahead”; purple = streaks *and* chips *and* next *and* interim primary). Data viz (heatmaps) and domain chrome (priority traffic lights, friendship flavors) add further color languages that the parked-issue list barely mentions.

A third structural problem is **layout and information depth**: a fixed 960px shell, stacked horizontal chrome (tabs + chips + filters), and inconsistent nesting models (route shells vs query tabs vs tab-like filters) produce crammed rows and “tabs within tabs” on the deepest pages.

---

## 1. Theme / chrome

### What exists

| Element | Current look | Cite |
|---------|--------------|------|
| Page canvas | Fixed pink→blue gradient; Sakura tokens in `:root` | [`styles.css` L1–44](../../../../../apps/web/src/styles.css) |
| Shell | Max-width 960, padded | L52 |
| Brand | Mono `career-digest` + 🌸 in top bar | [`App.tsx`](../../../../../apps/web/src/App.tsx); [`pageTheme.ts`](../../../../../apps/web/src/pageTheme.ts) |
| App nav | Mono pill links; active = surface + pink border + `0 1px 0` pink shadow | [`styles.css` L95–118](../../../../../apps/web/src/styles.css) |
| Feature subnav | Flat `NavLink`s; active = `--surface-2` + border (Progress / Rewards) | L5825–5858, L5954–5976; [`ProgressLayout.tsx`](../../../../../apps/web/src/features/progress/ProgressLayout.tsx), [`RewardsLayout.tsx`](../../../../../apps/web/src/features/rewards/RewardsLayout.tsx) |
| Home hero | Larger purple greeting + emoji; denser card padding | [`styles.css` ~L2874+](../../../../../apps/web/src/styles.css); [`Home.tsx`](../../../../../apps/web/src/pages/Home.tsx) |

### Competing patterns

- **A.** Sakura shell (gradient + mono brand + raised pill nav)
- **B.** Flat feature subnav (Progress / Rewards)
- **C.** Soft branded Home hero (purple greeting) sitting on raised `.card`s

### Surface containment (cards vs open canvas) — vibe split

Most list/workflow pages put content in **raised `.card` containers** on the pastel gradient: white/cream surface, border (often reading pink via `--border` / hover `--accent-pink`), soft shadow ([`styles.css` L416–440](../../../../../apps/web/src/styles.css)). That is the “panel on a terminal desk” feel.

**Rewards** is the clear counterexample: the feature shell and many surfaces sit **directly on the page background** with flat subnav and less universal card wrapping ([`RewardsLayout.tsx`](../../../../../apps/web/src/features/rewards/RewardsLayout.tsx), rewards CSS). Collection art then adds its own elevated cards — so Rewards is “open canvas + selective art elevation,” not “everything in a pink-bordered box.”

**Progress is hybrid:** subnav matches Rewards’ flat link chrome ([`styles.css` L5825–5858](../../../../../apps/web/src/styles.css)), but This week / Past work / Lifetime content largely returns to **carded panels** like Jobs/Tasks. Same feature family, two containment languages.

This containment split is as much a Sakura-vs-flat signal as button shadows or mono titles. M0 prototypes should treat **contained vs open canvas** as an explicit axis, not an accident of which page you open.

### Q12 vibe tension — concrete examples

1. Same Progress page: panels use raised `.card` ([`styles.css` L416–424](../../../../../apps/web/src/styles.css)) while LC / range controls use flat `secondary ui-btn*` ([`LeetcodeLogger.tsx`](../../../../../apps/web/src/features/progress/LeetcodeLogger.tsx), [`ThisWeekPage.tsx`](../../../../../apps/web/src/features/progress/ThisWeekPage.tsx)).
2. App nav (pink lift) vs list-page `.tabs` (raised blue fill) vs Progress/Rewards subnav (flat) — three navigation languages.
3. Rewards collection cards still hover-lift and glow ([`catCake.css`](../../../../../apps/web/src/features/rewards/catCake.css)) against flat Rewards subnav / open canvas.
4. Global primary = filled blue + `--shadow-button` ([`styles.css` L359–374](../../../../../apps/web/src/styles.css)) vs interim primary = flat tinted purple (`ui-btn-primary`, ~L1807).
5. Contained card pages (Jobs/Tasks/Home sections) vs open-canvas Rewards vs hybrid Progress (flat tabs + carded body).

---

## 2. Elevation

### Stats

- ~82 `box-shadow` rules in `styles.css`; **~52** are `none`; **~7** use `none !important`.
- `--shadow-minimal: none` is defined ([L36](../../../../../apps/web/src/styles.css)) and **unused**.
- Modals / popovers use ad-hoc `0 8–16px … var(--shadow-strong)` — no named raised-surface token.

### Competing patterns

| Pattern | Where |
|---------|--------|
| Soft card / detail lift | `.card`, `.detail` |
| Strong overlay | `.modal`, `.suggest-list`, rich-text link bubble |
| Button shadows | Global primary; hover deepens |
| Mass undoes | `.secondary`, icon buttons, `ui-btn*`, ledger tabs (`!important`), earn-flash dismiss (`!important`) |
| Re-elevate after flatten | `.pager button.secondary` **re-applies** `--shadow-soft` ([L1949–1950](../../../../../apps/web/src/styles.css)) |
| Feature art elevation | CatCake cards / CE glow |

### Assessment

Elevation is not a single policy today; it is **default raised + local flat patches**. A clean M0 lock is either (a) flat everywhere except named overlays (modal/popover), or (b) soft raised surfaces with matching raised controls — not the current mix. Pager re-shadowing `.secondary` is a sharp example of accidental conflict.

---

## 3. Actions (buttons)

### Distinct looks (production)

| Pattern | Look | Approx. use | Notes |
|---------|------|------------:|-------|
| Bare `<button>` | Filled blue-deep + button shadow | ~17 | List CTAs / some submits (e.g. Interviews “Add interview +”) |
| `secondary` | Flat surface, blue-deep text | ~113 | Escape hatch / workhorse |
| `secondary ui-btn` (+ primary / ghost / `is-active`) | Flat interim system | primary ~4, ghost ~8, base more | Progress / Rewards |
| `modal-confirm-btn` | Flat filled blue, soft-box radius | ~9 | Opt-out of chain |
| `interview-cta-btn` | Raised filled blue | few | Fourth “primary” |
| Icon squares | 1.65rem bordered, no shadow | many one-offs | Parallel classes, same size language |
| `.tab` | Raised pill; on = blue fill + shadow | Jobs/Apps/Tasks/Interviews | |
| `button.ghost` | Transparent muted | **0 TSX uses** | Dead; real ghost is `ui-btn-ghost` |
| Pager buttons | Mono, **shadowed even when secondary** | | |

Also: modal `.form-actions` flattens non-secondary primaries inside modals, so bare submits can *look* like `modal-confirm-btn` without using the class.

### Competing primaries (Q1 seed)

1. Global filled blue + shadow  
2. Flat `modal-confirm-btn` (blue)  
3. Flat purple `ui-btn-primary`  
4. Raised `interview-cta-btn` (blue)

**Assessment:** M0 should collapse to **one primary, one secondary, one ghost**, plus optional danger; sizes sm/md. Interim W is a plausible candidate but must be judged after vibe, not assumed.

---

## 4. Forms

### Competing patterns

| Pattern | Cite / note |
|---------|-------------|
| Global `input, textarea, select, button` box | L336–343 |
| Global focus outline blue | L355–358 |
| Bare textarea `min-height: 10rem` vs modal `6rem` | L2265 vs L1533 |
| Date/time restyled | L347–354 |
| Search: toolbar (pink focus + soft shadow) vs jobs-search (blue focus + soft shadow) | L143–170, L2176–2192 |
| Compact number **pill** (minutes / actual) | ~L1184, ~L5240 |
| Compact number **width-only** (weekly target 4.5rem) — still global padding | ~L4785 (parked oversize) |
| Card apply-by compact 0.75rem | L770–776 |
| Task-detail slightly smaller fields | ~L5263 |
| Compose textarea radius raw `8px` | ~L4247 |

No named field size scale. Number fields are the sharpest pain because three recipes coexist.

**Assessment:** Define field sizes (at least `md` default + `sm` / compact number) and one search-field variant. Kill dual textarea mins via context (modal vs page) as documented variants, not bare element rules.

---

## 5. In-feature navigation

| Pattern | Active look | Used on |
|---------|-------------|---------|
| `.tabs` / `.tab.on` | Raised; filled blue | Tasks, Jobs, Applications, Interviews |
| Feature shell subnav | Flat; surface-2 + border | Progress, Rewards |
| `.ledger-subtab` | Flat; weight + border | Completions ledger |
| `.ui-segmented` + `ui-btn.is-active` | Flat; blue tint | LC logger, Lifetime, Rewards ranges |
| `home-upcoming-range-btn.is-active` | Secondary toggle; purple `--accent` fallback | Home Upcoming |
| `progress-lane-chip` | Purple tint when on | Reflection lane |
| `jobs-loc-chip` | Filled blue (like tabs) | Jobs filters |
| `rw-chip` | Purple when pressed | Rewards Banner |

**Active-accent conflict:** blue fill (tabs / loc) vs blue tint (segmented) vs purple (lane / rw / Home range).

**Assessment (visual part of Q5 / Q9):** M0 can lock the **look** of (1) page tabs, (2) feature subnav, (3) segmented control, (4) filter chips. Which IA pattern to use when stays M1 (Q9), but the visual families should not keep drifting.

---

## 6. Feedback

| Pattern | Role | Issues |
|---------|------|--------|
| `EarnFlash` | Transient mint | Placement parked (R.9); radius `10px` |
| `OneTimeNotice` | Once-per-event mint | Radius `--radius-card` — mismatch with flash |
| `rank-batch-banner` | Jobs ranking | Parked → OneTimeNotice; own dismiss; raw hex greens/yellows |
| `demo-banner` | Demo mode | Blue `#5b7cfa` fallback; radius `8px` |
| `refresh-banner` | Soft status | Separate again |
| `.error` / `.field-error-message` / `.card-inline-error` | Errors | Three tracks |
| Empty states | Many `*-empty` / muted `<p>` | No shared primitive |
| **Achievement unlock modal** | Unlock moment | **Bypasses `ModalLayer`** — own overlay ([`AchievementUnlockModal.tsx` L14–26](../../../../../apps/web/src/features/achievements/AchievementUnlockModal.tsx)); conflicts hard rule 4 / R.4 |

**Assessment:** Banner catalogue in `docs/design-system.md` is incomplete (documents only two). Unlock modal is a real conformance gap, not just a style inconsistency — worth a bug/maintenance note when you agree (do not fix in this spike).

---

## 7. Data viz — heatmaps & intensity (Q13)

### Algorithm ([`intensityScale.ts`](../../../../../apps/web/src/features/progress/intensityScale.ts))

- Stops (ad-hoc RGB, not tokens): baby pink `250,214,228` → light purple → deeper purple → navy `40,68,112` (L11–16).
- Fill: `raw / peak` lerps the scale; `raw ≤ 0` → `var(--surface-2)` (L37–39).
- Peak: max of visible values, floored to ≥ 1 (L42–48).
- Legend: 5 swatches, index 0 = `--surface-2` (L50–55).
- Proportional to **raw apps/LC counts**, not seeds, not the 0–3 credit cap (file header).

### Surfaces

| Surface | Peak window | Future cells | Notes |
|---------|-------------|--------------|-------|
| `ProgressHeatmap` | Days ≤ today in padded grid | Transparent (`.future`) | Apps vs technical = **same hues**, **independent peaks** |
| `HistoryCalendar` | Marks in visible month ≤ today | Transparent + `opacity: 0.35` | Combined apps+LC; selected = blue outline on heat fill |

`effort` on heatmap payload is **ignored for display**; leftover `.effort::after` CSS still references ad-hoc `#d489a8`.

### Other “scales” (related, not the same)

- Lifetime seeds chart: single `--accent-blue-deep` stroke.
- Friendship dots: OKLab flavor gradients ([`flavors.ts`](../../../../../apps/web/src/features/rewards/flavors.ts)).
- Pity / CE gold–purple: art direction in `catCake.css`.

### Q13 decisions this inventory suggests locking

1. Keep one shared sequential scale vs per-lane hues.  
2. Tokenize stops (R0.3) vs leave JS RGB.  
3. Empty / future / peak reading — align heatmap vs calendar dimming.  
4. Whether friendship/pity/CE gradients are under the same foundation rule or art exceptions.  
5. Selection accent (blue outline) vs heat data (pink→navy) — avoid fighting.

---

## 8. Domain chrome & accent overload

| Meaning system | Colors | Tokenized? |
|----------------|--------|------------|
| Priority P0–P2 | Traffic-light red / amber / green | **No** — hex outside Sakura ([`styles.css` L3205–3218](../../../../../apps/web/src/styles.css)) |
| Deadline urgency | Pink → purple → blue → mint | Mostly tokens via tone classes |
| Weekly / achievement bars | Blue fill | Token + **fallback `#5b7cfa`** (drifts from `--accent-blue` `#7ba3c9`) |
| Streak “done” checks | `#3f6b5c` | Ad-hoc (third green vs mint vs P2) |
| App status badges | Assorted pastel hex | Mostly ad-hoc |
| Lane / ledger-kind chips | Purple / yellow / blue | Mixed |
| Rewards flavors / CE | Per-flavor + gold/night | Art hex |

**Accent role collision (feeds Q1 / Q4):**

- **Blue:** global primary, tabs, loc chips, bars, calendar selection, lifetime chart, urgency “ahead”
- **Purple:** interim primary, streaks, lane chips, “next”, nav hover, pity next
- **Pink:** nav active, urgency overdue, heat low end, danger-adjacent
- **Mint:** success banners, urgency ok, some achievements
- **Greens (3):** mint / streak check / P2

**Assessment:** M0 should assign **roles** (action, selection, brand, success, warning, danger, data-sequential, severity) even if the pastel hex set stays. Priority traffic lights may stay a deliberate severity exception, but should be named as such.

---

## 9. Typography & density outliers

| Page | Notes |
|------|-------|
| Home | Greeting ~1.35rem purple sans vs ~0.9rem mono section titles; denser card padding; third toggle pattern for Upcoming |
| Tasks | Long stacked board; sticky section headers; section scroll clamp `max-height: 28rem`; EarnFlash under tabs before board — compaction is M1/M2 but density is a visual input now |
| Progress | Nested cards; kickers ~0.72rem uppercase mono; section titles drift 0.82–0.92rem; flat shell vs raised tabs elsewhere |
| Rewards | Flat subnav + `ui-segmented` + separate `rw-chip` language |
| Jobs | Densest list chrome: raised tabs + shadowed search + loc chips + rank banner |
| Applications / Interviews | Same raised tabs; bare blue “Add …” primaries |

No type scale tokens beyond base 16px + ad-hoc rem sizes. Spacing scale absent (already Pending in design-system.md).

---

## 10. Competing patterns → seed table (for M0-03)

| Area | Competitors | Suggested M0-02 exploration |
|------|-------------|-----------------------------|
| Theme / vibe | Raised Sakura vs flat interim vs hybrid | Lead axis (Q12) |
| Elevation | Soft cards vs strong overlays vs mass `none` vs pager re-shadow vs CatCake lift | Modal/popover-only vs soft surfaces |
| Primary action | Global blue+shadow / modal-confirm / ui-btn-primary / interview-cta | One primary after vibe |
| Secondary / ghost | `secondary` / `ui-btn` / unused `button.ghost` / shadowed pager secondary | One secondary + one ghost |
| Forms | Global box / pill compact / width-only / search forks / dual textarea mins | md + sm (+ search) |
| In-feature nav | Raised tabs / flat subnav / ledger-subtab / segmented / chip filters | 3–4 visual families max |
| Feedback | Mint flash/notice / Jobs/demo/refresh banners / 3 error tracks / ad-hoc empties | Banner tones + empty primitive (visual) |
| Data viz | JS pink→navy heat / calendar dim / friendship OKLab / CE gold | Tokenized sequential + art exceptions |
| Domain color | Priority traffic lights / urgency tones / status badges / ledger-kind | Role map + named exceptions |
| Typography | Mono chrome/labels vs sans body/hero; no type scale | Role map + size scale; later font-family exploration |
| Nav depth | Route shells vs query tabs vs tab-like filters vs calendar∥ledger | Max chrome depth; route vs tab vs filter rule |
| Layout | 960 shell; nowrap chrome; dual-col squeeze; ad-hoc gaps/breakpoints | Shell width + wrap rules + stack rhythm |

---

## 11. Gaps **not** already in F09 Current behavior (R.12)

Parked table already covers: global button chain, global fields, secondary, tokens, ModalLayer anatomy, prototype CSS forks, monolithic CSS, number field oversize, interim `ui-btn`, Jobs banner, unpaginated lists, shell vs tabs, EarnFlash placement, Tasks density, heatmap JS scale.

**Additional gaps this spike found:**

1. Achievement unlock bypasses `ModalLayer` (R.4 conflict).  
2. Banner catalogue incomplete (demo / refresh / rank-batch vs documented two).  
3. No empty-state primitive (many `*-empty` one-offs).  
4. Four+ selectable-chip / toggle families with conflicting active accents.  
5. Dual search-field focus/shadow recipes (toolbar vs jobs).  
6. Two compact-number recipes (pill vs width-only).  
7. Pager re-elevates `.secondary`.  
8. `button.ghost` dead; `ui-btn-ghost` is real ghost.  
9. `--shadow-minimal` unused; no raised-surface token.  
10. Priority traffic-light hex outside Sakura.  
11. Three competing “done” greens.  
12. Token fallback drift `#5b7cfa` vs `--accent-blue`.  
13. Friendship / pity / CE as second intensity family.  
14. Calendar selection accent vs heat data stacking.  
15. Dead `.effort` checkmark styles on heat/calendar.  
16. Subnav CSS duplicated (Progress ≈ Rewards ≈ ledger-subtab).  
17. Interview CTA as fourth primary.  
18. EarnFlash vs OneTimeNotice radius mismatch.  
19. Raw radii (`8px` / `10px`) alongside tokens.  
20. Home Upcoming range as a third toggle pattern (purple).  
21. Type/spacing scales absent; Progress title sizes drift.  
22. **Typography role drift:** JetBrains Mono used for brand, nav, tabs, badges, counters, many section labels — but Home greeting / card titles / Progress section titles / feature subnav are DM Sans (or inherit sans). Mono is inconsistent as a “title” signal.  
23. **~35 distinct `font-size` values** in `styles.css` with no scale tokens (0.5rem–1.75rem cluster).  
24. **Two nav nesting models:** Progress/Rewards route shells vs Jobs/Tasks/Apps/Interviews query tabs; Jobs location chips are a third “tab-like filter” unique to ranked Jobs.  
25. **Past work depth:** feature subnav + calendar + ledger type `tablist` (+ optional nested reflection edit) — deepest stack (~4–5 levels to a write).  
26. **Fixed 960px shell** with no page overrides; Past work dual-column + nowrap compose/chips + shortened ledger labels are concrete width-pressure evidence.  
27. **Breakpoint soup:** 520 / 560 / 640 / 820 / 860 / 900 / `40rem` with Past work column stack (900) ≠ compose wrap (860).  
28. **Vertical gap drift:** Progress shell 1rem vs This week 0.85 vs Past work 0.75; paired columns have no shared height rule.  
29. Jobs search row: fixed select min-widths, **no wrap / no breakpoint**.  
30. Explicit label shortening under width pressure: Past work ledger `notes` / `LC` ([`LedgerCompletionsPanel.tsx` L22–29](../../../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx)).

---

## 12. Typography — fonts, roles, sizes (Q14)

Loaded in [`apps/web/index.html`](../../../../../apps/web/index.html): **DM Sans** (opsz 9–40, weights 400–700) and **JetBrains Mono** (500–700). Tokens: `--font-sans`, `--font-mono` ([`styles.css` L29–30](../../../../../apps/web/src/styles.css)). Root defaults to sans at **16px** (L38–43).

### Role map (what each face currently means)

| Role | Face | Typical sizes | Meaning conveyed today |
|------|------|---------------|------------------------|
| App brand (`career-digest`) | **Mono** | 1.15rem | “Terminal / technical product” |
| Top nav links | **Mono** | 0.8rem | Chrome is technical; pairs with pink-lift pills |
| In-page `.tab` / tabs-row actions | **Mono** | 0.84 / 0.8125rem | List partitions are chrome, not prose |
| Jobs location chips + label | **Mono** | chip-sized | Filter chrome mimics tabs |
| Badges, external-link chips, pager | **Mono** | ~0.7–0.8rem | Metadata / machine-readable |
| Counters / balance / bar “over” | **Mono** | ~0.72–0.8rem | Numeric / ledger feel |
| Status / ops headings & meta | **Mono** | mixed | Ops console aesthetic (strongest remaining “hacker terminal”) |
| Interview section labels/headings | **Mono** | 0.85–1.05rem | Section chrome |
| Home section titles / subheads / see-more | **Mono** | 0.9 / smaller | Section labels — but **not** the Home hero |
| Progress kickers, lane labels/tags, LC readonly, weekly counters | **Mono** | ~0.72–0.8rem | Labels + numbers |
| **Body / forms / buttons** | **Sans** (default) | inherit / 0.78–0.9rem | Readable content; “clean” default |
| **Home greeting** | **Sans** | **1.35rem** semibold purple | Soft human welcome — opposite of mono brand |
| **Card titles** (`.card h2`) | **Sans** (inherit) | 1.05rem | Content titles, not chrome |
| Progress section titles, feature subnav | **Sans** (inherit / 0.88rem) | ~0.88–0.9rem | Flat/clean feature chrome — **not** mono like app tabs |
| Modal titles | Mixed | ~0.95–1rem | Often mono for document preview; forms lean sans |

Explicit `font-family: var(--font-mono)` appears **~39** times in `styles.css`; explicit `--font-sans` resets **~11** times (mostly where a parent might have been mono, or date inputs / buttons). Everything else inherits sans.

### Size landscape (no scale)

Rough frequency in `styles.css` (unique declarations): **0.85rem** (~47), **0.8** (~34), **0.9** (~30), **0.78** (~21), **0.75** (~18), then a long tail including **0.68 / 0.72 / 0.82 / 0.88 / 0.92**, heroes at **1.35**, brand **1.15**, and outliers down to **0.5–0.65** (tiny UI chrome). There is **no** `--text-sm` / `--text-md` token set.

### Vibe clash (typography as driver)

This matches the user’s read: mono was central to the original **pink hacker terminal** look (brand + nav + tabs + badges). Readability pushed **content** onto DM Sans. Over time, “title” stopped meaning mono:

- **Still mono “title-ish”:** top brand, Home *section* titles, interview/ops headings, tab labels.  
- **Sans “title-ish”:** Home *hero* greeting, card `h2`, Progress panel titles, Progress/Rewards subnav.  
- **Sans body** everywhere people actually read (tasks, reflections, job text, forms).

So the flat/clean dialect is not only low elevation — it is **sans-led content + sans feature chrome**, while Sakura terminal survives as **mono app chrome** (and Status/ops). On one Home screen you get mono brand in the header, sans hero greeting, then mono section titles — three type signals in one viewport.

### Competing patterns

1. Mono = all chrome (nav, tabs, labels, badges, numbers)  
2. Mono = only brand + app nav; feature chrome and titles = sans  
3. Mono = numbers/badges only; titles = sans (closest to “readable product”)  
4. Status keeps a heavier mono “console” exception  

### Assessment / M0–M1 split

- **M0 (visual):** Lock type **roles** and a small **size scale**; show mono-heavy vs sans-led directions in vibe prototypes (as important as elevation). Note that later work should **explore fonts beyond these two** — do not treat DM Sans + JetBrains Mono as permanent.  
- **Later (still design-system):** Type specimen pass with alternate families once vibe/roles are clear.

---

## 13. Pages, tabs, and information depth (Q15)

Depth scale used below: **0** app nav → **1** feature entry (shell subnav or list tabs) → **2** secondary chrome (chips, segmented, calendar, category board) → **3** tertiary (panel subtabs, day groups, accordion) → **4+** leaf (detail route, modal write).

### Two nesting models

| Model | Where | How “views” work |
|-------|-------|------------------|
| **Route feature shell** | Progress (3), Rewards (5) | Second horizontal subnav; children are URLs |
| **Query list tabs** | Jobs, Tasks, Applications, Interviews | `?view=` / status tabs in `.tabs-row` |
| **Tab-like filter (unique)** | Jobs ranked only | Location chips under view tabs ([`JobsPage.tsx`](../../../../../apps/web/src/features/jobs/JobsPage.tsx) + [`LocationFilterChips.tsx`](../../../../../apps/web/src/features/jobs/LocationFilterChips.tsx)) |

### Depth comparison (common paths)

| Family | Levels to main content | Levels to common write | Nested / tab-like rows |
|--------|----------------------:|-----------------------:|------------------------|
| Home | 1 | ~3 (open upcoming item) | Upcoming range segmented |
| Jobs | 2–3 (tabs + loc chips) | ~4 | Tabs + location chips + search/sort/source |
| Applications | 2 | 3–4 | Status tabs only |
| Tasks | 2–3 | 3–4 | Open/completed + category sections |
| Interviews | 2–3 | 3–4 | Active/past + in-page sections |
| Progress / week | 2 | 3–4 | Subnav + LC segmented + lane chips |
| Progress / past | **3–4** | **4–5** | Subnav + calendar + ledger type tabs |
| Progress / lifetime | 2 | 3 | Subnav + chart range |
| Rewards / banner | 2 | 2 | Subnav (5 items) |
| Rewards / earnings·history | 3 | 3 | Subnav + range segmented |
| Status | 1 | 1–2 | None (but sits in L0 with 8 peers) |

### Fragile depth patterns

1. **Tabs within tabs (effective):** Past work = Progress subnav + Completions `role="tablist"` ([`LedgerCompletionsPanel.tsx` L318+](../../../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx)).  
2. **Filters wearing tab clothes:** Jobs location chips — only on ranked; compete with view tabs for “which slice am I in?”  
3. **Same job, different depth language:** Progress week/past are routes; Jobs ranked/unranked are query tabs.  
4. **Unique-to-one-page partitions:** Jobs loc chips; Tasks category board; Past work calendar∥ledger dual column; Collection Day/Night; Home upcoming range.  
5. **Segmented controls as L2–3 modes:** Home range, LC Weekly/Misc, Lifetime chart, Rewards ranges, lane chips — many modes outside the nav model.  
6. **Modals as write destinations:** CompleteWork, FinishInterviewStep, Add task/application — no URL.  
7. **Top nav fan-out:** 8 L0 items; wrapping already possible ([`styles.css` L95](../../../../../apps/web/src/styles.css)). Side nav is an open idea — see tradeoffs below.

### Top nav vs side nav (tradeoffs from current layout — not a prescription)

- **Keep / refine top nav:** Matches current mental model; content width stays wide (helps Past work dual column, heatmaps, Jobs cards). Cost: feature shells add a **second horizontal** band, so deepest pages stack horizontal chrome; 8 items already wrap.  
- **Side nav:** Could absorb Progress/Rewards children (and maybe Status) and shrink L0. Cost: persistent rail **steals width** from the pages that already feel cramped; nested side→subside can recreate depth vertically; hesitancy toward side nav is reasonable given Past work / Lifetime width needs.  
- **Hybrid options worth prototyping later (M1):** top L0 + local **vertical** subnav inside the shell only for Progress/Rewards; or promote fewer L0 items (Status under a menu); or demote Jobs location from chip-tabs to a select/filter control so it stops looking like a second tab row.

### What a depth standard should decide (feeds Q9 / Q15)

1. Max **chrome rows before content** (Jobs can show 3; Past work shows subnav + calendar chrome + ledger tabs).  
2. **Route vs tab vs filter** mapping (bookmarkable destination vs list partition vs narrow-within-partition) — and filters must not reuse tab chrome.  
3. Which features earn a **shell**.  
4. Whether **day/calendar selection** counts as a nav level beside type tabs.  
5. Modal vs route for primary writes.  
6. Whether type filters may nest under an existing subnav (Past work ledger) or must promote/demote.

**M0 vs M1:** Visual look of tabs/subnav/chips stays M0 (Q5). **Nesting rules and top vs side** are M1 pattern work (expand Q9) — but M0 vibe prototypes should still show a realistic chrome stack so depth pain is visible.

---

## 14. Shell width, containers, and viewport fit (Q16)

### Shell

- Single content well: [`.shell { max-width: 960px; margin: 0 auto; padding: 1.5rem; }`](../../../../../apps/web/src/styles.css) L52, applied once in [`App.tsx`](../../../../../apps/web/src/App.tsx).  
- No page-level max-width overrides found.  
- Effective content ≈ **912px** at full shell (`960 − 2×1.5rem`); below 960px viewport → `100vw − 3rem`.  
- Top nav wraps inside that width (8 links).

### How containers share space

- **List pages:** `.tabs-row` (space-between, wrap) → optional second chrome → list.  
- **Jobs:** tabs-row → location chips (wrap) → search row (**no wrap**; sort `min-width: 9rem`, source `11.5rem`) ([`styles.css` L2170–2200](../../../../../apps/web/src/styles.css)).  
- **Progress:** shell gap 1rem → subnav → outlet. This week / Past work / Lifetime use different internal grids and gaps.  
- **Past work:** `grid-template-columns: minmax(280px, 1fr) minmax(0, 1.25fr)` ([L4414–4418](../../../../../apps/web/src/styles.css)) — comment says “slightly wider left” but **left is `1fr` and right is `1.25fr`** (comment/CSS contradiction). At ~912px content, left ≈ 405px, right ≈ 507px before card padding.

### Concrete width pressure

1. **Past work compose row:** `.progress-compose-meta` and `.progress-lane-chips` use `flex-wrap: nowrap`; chips and “Add reflection” are `flex-shrink: 0` with full words `application | technical | other`. Wrap unlocks at **860px** viewport, but columns only stack at **900px** — squeeze window in between; panel `overflow: auto` is the escape.  
2. **Past work Completions tabs:** Labels already shortened to `notes` / `LC` for Past work ([`LedgerCompletionsPanel.tsx` L22–29](../../../../../apps/web/src/features/progress/LedgerCompletionsPanel.tsx)); CSS forces `flex-wrap: nowrap` + `overflow-x: auto` + `white-space: nowrap` on those subtabs ([L4434–4444](../../../../../apps/web/src/styles.css)). Default ledger tabs elsewhere **wrap** — Past work opted into horizontal scroll instead.  
3. **Jobs tabs:** long label `"needs description"` wraps via `.tabs` flex-wrap rather than truncating — multi-line chrome.  
4. **Jobs search:** no breakpoint; fixed select mins fight the input.  
5. **Button / action rows:** tabs-row trailing CTAs + nowrap toolbars elsewhere; card action clusters rely on wrap or ellipsis (`.card h2` always ellipsizes).  
6. **Heatmap legend:** nowrap; calendar variant scrolls horizontally.

### Vertical rhythm / height

| Stack | Gap |
|-------|-----|
| Progress shell | 1rem |
| This week page | 0.85rem |
| Past work page | 0.75rem |
| Lifetime | 0.85rem |
| Tasks board | 0.85rem (+ section `max-height: 28rem` clamp) |
| Default `.card` | `margin-bottom: 0.6rem` (zeroed inside some progress stacks) |

Paired Progress columns (week split, past columns, lifetime heats) **grow independently** — no shared panel height. Past work left stack (calendar + day panel blocks) vs Completions list is the sharp height mismatch example. Tasks uses sticky section headers + optional 28rem body clamp — a different height strategy again.

### Breakpoints (no shared tokens)

`40rem` / `520` / `560` / `640` / `820` / `860` / `900` px appear for different collapses. Notable mismatch: Past work columns @ **900**; compose chip wrap @ **860**; week split @ **860**; lifetime heats @ **820**. Jobs search: **none**.

### What a layout standard should decide (Q16)

1. Shell max-width (keep 960, widen for dual-column Progress, or tokenize `--shell-max` / pad).  
2. Content vs chrome budget (max horizontal chrome rows).  
3. Two-column minimums — stack earlier vs squeeze; fix Past work column weight vs comment.  
4. Wrap vs scroll vs truncate vs **shorten labels** — when each is allowed.  
5. Rules for `nowrap` + `flex-shrink: 0` (require a matching breakpoint).  
6. Vertical stack gap scale.  
7. Breakpoint scale (collapse to a few steps).  
8. Paired panel height policy (match Tasks clamp vs natural grow).

**M0 vs M1:** Shell width + spacing/breakpoint **tokens** can lock in M0 with vibe. Chrome-budget and column behavior are M1 layout patterns (with Tasks compaction / Q11). M0-02 prototypes should include a **narrow dual-column / tab-row stress case** (Past work–like), not only a comfy single column.

---

## 15. User review (2026-10-15) — decisions process

Feedback on the review prompts (not yet locking visual winners):

1. **Decide from prototypes, not from inventory alone.** Ad hoc choices each looked fine in the moment; they look disjoint together. Strong preferences need side-by-side options that show a whole composition.
2. **M0 must explore other font families**, primarily via a **font switcher** on the prototype (orthogonal to vibe packs), not by rebuilding every screen per family. Major axis today is **style vs readability** (mono vs sans); more axes may appear while choosing. Type is tied to overall vibe/brand.
3. **Brand / product identity is in F09 scope.** The app grew from a personal job board into a hub (tasks, motivation/rewards, etc.). Whether that deserves a rebrand that names what the site really is belongs in M0 alongside vibe — not only “which pastel button.”
4. **Priority traffic lights:** do not decide keep/drop yet. First iterate a **common color-meaning scheme** that unloads today’s overloads; then place priority (red/yellow/green remains useful if intentional).
5. **Vibe directions: exploratory / broad by default.** Not limited to Sakura Terminal vs flat pastel sans. Keep what is loved (especially **baby pink**) and what feels refreshing about **clean** flat UI, but proactively explore other designs, eliminate, or remix. Readability and at-a-glance color meaning matter as much as liking pastels.
6. **Containers** called out as a first-class clash (carded pink-border panels vs Rewards open canvas vs Progress hybrid) — see §1.
7. **Elevation, nav depth, layout:** same process — develop approaches in prototypes; pick/mix or find gaps. Avoid locking opinions from the audit alone.

---

## 16. Proposed M0 prototype approach (for M0-02)

Inventory stays the **problem map**. M0-02 is the **option lab**. Prefer independent controls over a tiny fixed set of named packs.

### Lab structure

| Layer | What you switch | Purpose |
|-------|-----------------|--------|
| **A. Brand framing** | Short identity theses (name + one-line promise) | Does the chrome feel like a job board, a prep OS, a motivation hub, …? |
| **B. Vibe compositions** | Broad visual directions (packs) | Full sample page: shell, nav, containment, actions, heatmap, priority+urgency |
| **C. Font switcher** | Family pairs / stacks (orthogonal) | Style ↔ readability without rebuilding each pack |
| **D. Color-meaning schemes** | Semantic maps (orthogonal or paired with a pack) | Unload blue/purple/pink; then seat priority + urgency + heat + success |
| **E. Containment / elevation** | Contained cards vs open canvas vs hybrid; shadow policy | Explicit container axis |
| **F. Nav + width stress** | Chrome stack samples; shell width | See depth/width together; full IA rules still M1 |

Hard rules in `docs/design-system.md` still apply to how prototypes are *built* (no new production globals). Prototype-local tokens/CSS under `prototype/f09-design-system/` may explore palettes and fonts not yet in production `:root`.

### Brand theses to put on the table (draft — rename/kill freely)

| ID | Working thesis | Implication for vibe |
|----|----------------|----------------------|
| B1 | **Job board & tracker** (original) | Dense lists, status, urgency; lighter on rewards play |
| B2 | **Career prep OS** | Hub for jobs + tasks + progress; calm system chrome |
| B3 | **Motivation desk** | Rewards/streaks/Seeds are first-class; playful OK if readable |
| B4 | **Personal command center** | Everything-in-one-place; strong brand mark; flexible modules |

Brand can change **name/voice** later; M0 only needs enough identity to judge whether “Sakura terminal,” “clean blush hub,” etc. fit what the site *is*.

### Vibe compositions to start with (broad pool — cut after seeing them)

Not limited to current dialects; baby pink and “clean” are preferences to *try to keep*, not constraints that forbid other packs.

| ID | Direction | Keeps / explores | Why it’s in the pool |
|----|-----------|------------------|----------------------|
| V1 | **Sakura Terminal (baseline)** | Raised cards, mono chrome, pastels, pink desk | Current raised dialect; control sample |
| V2 | **Soft Sakura Clean** | Baby pink canvas, **flat/clean**, readable sans, mono only for brand or numbers | Remix: loved pink + refreshing clean |
| V3 | **Blush Studio** | Soft pink brand, airy open or lightly contained, less “hacker” | Hub/planner energy without terminal |
| V4 | **Ink & Blush** | High-contrast ink type/actions, blush accents only | Max readability; pink as accent not wash |
| V5 | **Seed Garden** | Motivation/rewards-forward; playful but tokenized | Tests B3 identity; CatCake-adjacent |
| V6 | **Cool Focus** | Shift primary wash away from pink (mint/blue-gray) | Elimination sample — is pink load-bearing? |
| V7 | **Editorial Hub** | Slightly literary / portfolio-calm | Alternate personality if rebrand leans narrative |

Packs are starting points; after review we eliminate, merge, or steal pieces (e.g. V2 containment + V4 type + V1 pink).

### Font switcher (M0, orthogonal)

Suggest 5–6 stacks along **style ↔ readability** (adjust when implementing):

1. JetBrains Mono + DM Sans (**current**)  
2. IBM Plex Mono + IBM Plex Sans (systemy, still technical, more readable)  
3. Space Grotesk + Source Sans 3 (modern product, less “hacker”)  
4. Atkinson Hyperlegible + a simple mono for numbers only (max readability)  
5. Fraunces or Newsreader + DM Sans (soft editorial — pairs with V7)  
6. Optional: keep one expressive display only for brand wordmark

Switcher changes CSS variables on the prototype root; packs should not hard-code families.

### Color-meaning schemes (brainstorm before seating priority)

| ID | Idea | Priority traffic lights |
|----|------|-------------------------|
| C1 | **Pastel accents stay decorative**; severity is a separate traffic set (R/Y/G) with documented roles | Keep R/Y/G as the severity language |
| C2 | **One semantic stack** (danger / warn / ok / info / neutral) shared by priority, urgency, banners; pastels only for brand/data | Priority maps onto semantic, may be less “pure” R/Y/G |
| C3 | **Domain hue + severity lightness** (apps/tech/rewards families; worse = darker/hotter) | Priority may become shape/label + shared severity step |
| C4 | **Ink semantics + blush brand** (near-neutral UI, pink brand, clear danger red) | Traffic OK if red is true danger, not pastel pink |

Iterate schemes in the lab *with* heatmap + urgency + priority + success banner on one board — then decide priority’s seat.

### Containment / elevation / nav / layout

Show at least three containment modes on the same content: **all carded**, **open canvas**, **hybrid** (flat feature chrome + carded body — today’s Progress). Elevation (flat / soft cards / overlay-only) switches beside that. Nav and width: sample top-nav + secondary chrome stacks and one dual-column stress frame at 960 vs wider — pick later from what reads clearly, not from the audit’s opinions.

### What M0-02 should not lock yet

Final product name, production font shipping set, final shell width, side vs top nav IA rules, and “delete traffic lights” — those fall out of lab review (and M1 for IA).

### Implemented (2026-10-15)

Single lab page at **`/prototype/f09/lab`** (`apps/web/src/prototype/f09-design-system/`).

**Pool (live):** brand theses (flora.exe + B1/B2/B4), vibes V5/V5b (flora soft / flora ink) + V1–V4 + V6–V7, fonts (Plex default · current · grotesk · hyper · editorial), color maps C1–C4, **heatmap peaks** (rose / orchid / coral / flora / navy-elim), **deadline urgency** (warm-3 / mono / soft-5 / prod-5), containment carded/open/hybrid, shell 1100/960.

**Cohesion rule in lab:** each vibe owns `--f09-chrome`, `--f09-action*`, `--f09-select*` so segmented controls, tabs, titles, and “Keep editing” do not inherit production purple/blue.

### Interim leanings (2026-10-15 — not locked)

| Axis | Leaning | Notes |
|------|---------|--------|
| Vibe | **V1×V4 ink desk** | Sakura desk + ink titles/buttons; tabs = ink + gray wash; rounded segmented; flat elev. |
| Tabs / nav | **Ink + gray wash** | Black text + black border; gray surface-2 background (not blush). App nav, subnav, Jobs tabs. |
| Elevation | **Flat** | No button shadow; secondary never lifts. |
| Brand | **flora.exe** | Locked for M0 framing / mark. |
| Font | **IBM Plex** | Prefer over Space Grotesk + Source Sans (too clean). Titles/tabs in display stack. |
| Priority | **RYG traffic** | Decorative pastels elsewhere; severity stays R/Y/G. |
| Kind badges | **Interview=apps blue · goal=reward pink** | Domain hue map (C3). Keep the named hue set small. |
| Heatmap | **Vivid rose, soft peak** | Locked. Former 4th stop = peak; empties cream. |
| Urgency | **Severity 5** (no purple/blue) | Overdue=P0 · urgent=rose · soon=amber · ahead=muted · ok=mint. |
| Purple | **Domain tech** | Score/streak/interviewing identity chips. Containers & description washes = surface-2. |
| Contain | **All carded** | Including Rewards (earnings, pull history, rules, cat cake, banner). Nested-tab IA → **M1**. |
| Shell | **1100px** | Free dual-column space. |
| Hover / segmented | Vibe-owned | `--f09-hover` gray wash; segmented active = action/ink. |

### M0 lab vs later work (recommendation)

**Finish in this prototyping session (M0-02 → M0-03 lock):**

1. **Role map for the small hue set** — ink, brand/blush, domain apps/tech/reward, severity R/Y/G, success/ok, data-heat steps. Purple’s seat (tech only vs gone) is part of this lock.
2. **Control anatomy** — primary / secondary / ghost, segmented, tabs/chips, fields+selects, modal footer. Hover/focus/active owned by vibe tokens (no prod blue/purple leak).
3. **Type + radius + size scales** — display vs body roles; panel / control / seg / pill radii; a short type-size ladder. Enough to stop inventing per page.
4. **Semantic boards already in the lab** — priority, kind, job/application status badges, heatmap, urgency, “purple leftovers” (streak/rank/description). Verdicts recorded even if “retire purple” or “urgency still open.”
5. **Shell + containment preference** — 1100 + carded as defaults; note open questions for Rewards open-canvas exception.

**Leave for M1+ (page work / patterns — not more lab surface area):**

- Nested-tab IA and how This week / Past / Lifetime / ledger filters are represented.
- Per-page redesigns (Home hero, Tasks/Interviews purple containers, Rewards as its own dialect, Jobs list density).
- Full migration of production CSS; component extraction beyond what M0-03 writes into `design-system.md`.
- Interaction patterns deferred earlier (Q8–Q11).
- Pixel-perfect every badge variant — map the *roles*; apply during page tickets.

**Confidence bar for ending M0:** you can answer “what token/role does this use?” for any new UI without inventing a color, and purple/blue overload has an explicit rule (keep as domain-tech only, or ban). Uncovered page quirks become M1/M2 tickets against that map — they should not reopen vibe from scratch.
