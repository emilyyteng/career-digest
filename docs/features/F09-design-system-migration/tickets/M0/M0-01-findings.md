# F09 M0-01 — Production UI inventory (draft findings)

**Status:** Draft for user review (ticket remains open)  
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

### Q12 vibe tension — concrete examples

1. Same Progress page: panels use raised `.card` ([`styles.css` L416–424](../../../../../apps/web/src/styles.css)) while LC / range controls use flat `secondary ui-btn*` ([`LeetcodeLogger.tsx`](../../../../../apps/web/src/features/progress/LeetcodeLogger.tsx), [`ThisWeekPage.tsx`](../../../../../apps/web/src/features/progress/ThisWeekPage.tsx)).
2. App nav (pink lift) vs list-page `.tabs` (raised blue fill) vs Progress/Rewards subnav (flat) — three navigation languages.
3. Rewards collection cards still hover-lift and glow ([`catCake.css`](../../../../../apps/web/src/features/rewards/catCake.css)) against flat Rewards subnav.
4. Global primary = filled blue + `--shadow-button` ([`styles.css` L359–374](../../../../../apps/web/src/styles.css)) vs interim primary = flat tinted purple (`ui-btn-primary`, ~L1807).

**Assessment for M0-02:** Prototypes should lead with **full-page vibe samples** (shell + nav + card + actions + one data viz), not a button strip alone. Axes worth exploring: pure raised Sakura, pure flat, hybrid (flat controls + soft cards / modal-only elevation), and “ink primary” as a separate action dialect on either elevation story.

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

## 15. Recommendations for M0-02 (agent opinion — not locked)

1. **Start prototypes at vibe (Q12)** with type + elevation as co-equal axes — e.g. Raised Sakura + mono chrome, Flat Pastel + sans-led titles, Hybrid, Ink variants; optional “softer Sakura” (mono brand/nav only, sans titles).  
2. On each direction, show: shell+nav, card, primary/secondary/ghost, segmented, modal chrome, **heatmap sample**, one priority + urgency pair, and a **type specimen** (brand / nav / section title / body / badge / counter).  
3. Treat **accent roles** and **type roles** as first-class deliverables.  
4. Decide early whether Rewards art (CatCake / friendship) is inside the system or a documented exception zone.  
5. Include one **width-stress** frame (tabs + chips + dual column) so layout pain informs shell-width discussion.  
6. Keep Q8–Q11 / Q15 nesting rules / full layout policy for M1, but don’t hide depth/width problems from M0 visuals.  
7. Plan a **later font exploration** beyond DM Sans + JetBrains Mono once roles are locked — do not freeze the pair as permanent in M0.

---

## Review prompts for you

Please mark up or reply with:

1. Which vibe directions you want built (agree / cut / add) — including how **mono vs sans** should show up in those directions.  
2. Whether Rewards/CatCake art should follow the same elevation rules.  
3. Whether priority traffic lights should stay outside the pastel system.  
4. Typography: keep JetBrains Mono for which roles (brand only / nav+tabs / numbers+badges / drop entirely from content chrome)? Interest in exploring other font families in M0 vs a later pass?  
5. Nav depth: max chrome rows you’re willing to live with; gut feel on side nav vs refined top nav; should Jobs location stop looking like tabs?  
6. Layout: is 960px still the right shell, or should dual-column Progress force a wider well / earlier stack?  
7. Any surfaces this inventory still missed; corrections if runtime differs from CSS/TSX.

Once you respond, M0-01 can be closed with your feedback folded into Verification notes / this file.
