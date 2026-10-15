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

They share one pastel token set, so the clash is mostly **elevation, chrome, and accent roles**, not an entirely different palette. M0 should decide the vibe (Q12) before locking button looks (Q1) or elevation (Q2).

A second structural problem sits under the dialects: **meaning is overloaded on the same accents** (blue = primary button *and* progress bars *and* selection *and* “ahead”; purple = streaks *and* chips *and* next *and* interim primary). Data viz (heatmaps) and domain chrome (priority traffic lights, friendship flavors) add further color languages that the parked-issue list barely mentions.

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

---

## 12. Recommendations for M0-02 (agent opinion — not locked)

1. **Start prototypes at vibe (Q12)** with 4–6 directions that are not just F08 W/A/B/C remakes — e.g. Raised Sakura, Flat Pastel, Hybrid (flat controls + soft cards), Ink+Flat, Ink+Raised, optional “softer Sakura” (keep gradient/chrome, flatten buttons only).  
2. On each direction, show: shell+nav, card, primary/secondary/ghost, segmented, modal chrome, **heatmap sample**, one priority + urgency pair.  
3. Treat **accent roles** as a first-class deliverable, not a side effect of picking a primary button.  
4. Decide early whether Rewards art (CatCake / friendship) is inside the system or a documented exception zone.  
5. Keep Q8–Q11 out of these prototypes (M1), but use Tasks/Jobs density as **visual** context only.

---

## Review prompts for you

Please mark up or reply with:

1. Which vibe directions you want built (agree / cut / add).  
2. Whether Rewards/CatCake art should follow the same elevation rules.  
3. Whether priority traffic lights should stay outside the pastel system.  
4. Any surfaces you care about that this inventory still missed (Status page, rich-text toolbar, document links, etc.).  
5. Corrections to any claim above — especially if runtime behavior differs from what the CSS/TSX suggest.

Once you respond, M0-01 can be closed with your feedback folded into Verification notes / this file.
