# M0-01: Production UI visual inventory (spike)

**Status:** In progress
**Blocked by:** (none)
**Implements:** R.12, R0.1 (input), R0.3 (scope), Q5 / Q12 / Q13 (findings)
**Type:** spike

## What to build

A thorough inventory of **production** visual UI in `apps/web` (not a restyle, and not limited to the F09 Current behavior table or the F08 visual-direction conflict list). The spike produces findings that M0-02 prototypes against and that M0-03 folds into `docs/design-system.md`.

Cover at least:

- Theme / chrome: shell, nav, page backgrounds, brand moments
- Elevation: cards, modals, popovers, buttons (where shadows appear or are undone)
- Actions: every distinct button / link-button look
- Forms: text, number, date/time, select, textarea sizing
- Navigation within features: tabs, segmented controls, chips, subnav
- Feedback: banners, flashes, errors, empty states
- Data viz: Progress heatmaps and any other intensity / gradient scales
- Domain chrome that carries color meaning: priority, urgency, lanes, streaks, rewards/collection accents
- Typography: font families (mono vs sans), roles (brand/nav/title/body/badge/number), size landscape, vibe impact
- Information depth: app nav → feature shell/tabs → secondary filters → leaf; nested tabs; Jobs location chips; top vs side nav tradeoffs
- Layout fit: shell width, container nesting, width pressure (tab labels, button rows, Past work), vertical rhythm / height, breakpoints
- Density outliers on major pages (Home, Tasks, Progress, Rewards, Jobs, Applications, Interviews)

Prototype-only stylesheets are out of scope except as optional historical notes.

## Acceptance criteria

- [x] Written findings doc in this ticket's Verification notes (or a short linked section in the F09 spec Current behavior / a spike appendix)—enough for M0-02 to design variants without re-auditing → [M0-01-findings.md](./M0-01-findings.md)
- [x] Competing patterns listed per area (feeds the "Conflicting patterns → chosen standard" table)
- [x] Explicit call-out of vibe tension: raised Sakura Terminal vs clean/flat (Q12), with concrete examples (file + lines)
- [x] Heatmap / intensity coloring described (current scale behavior, hues, empty/future/peak) for Q13
- [x] Gaps called out that are **not** already in the F09 Current behavior table (proves R.12)
- [x] No production code changes required; if a blocking bug is found, report it per Issues found—do not fix in this spike
- [ ] **User review:** fold feedback into findings; then mark Done

## Design questions (prototype tickets only)

n/a

## Reuse notes

- Start from F09 Current behavior and the conflict list in `apps/web/src/prototype/f08-weekly/VisualDirectionPrototypePage.tsx` as **seeds only**
- `docs/design-system.md` component catalogue for area names
- Production: `styles.css` `:root`, `ModalLayer`, `ProgressHeatmap` / `intensityScale`, Rewards/Progress layouts, Tasks

## Definition of done

- [ ] Acceptance criteria met and checked (including user review)
- [ ] `npm run check` passes (no code changes expected; still run if anything was touched)
- [ ] Follows `docs/design-system.md` (variants only, no global CSS, shared modal)
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M0-01: …`
- [ ] End-of-task report given (`AGENTS.md` → End-of-task report), including tests added and **Issues found**

## Verification notes

**2026-10-15 — agent draft (awaiting user review):**

- Findings: [M0-01-findings.md](./M0-01-findings.md)
- Method: read-only production CSS/TSX audit (chrome/elevation/actions; forms/nav/feedback; heatmap/domain color; then addendum on typography, information depth, shell/layout). Not browser-verified.
- Headline: two dialects (raised Sakura vs flat interim) share one pastel palette; **typography (mono vs sans) is a primary vibe driver**; accent roles overloaded; heatmaps use an ad-hoc pink→navy JS scale; deepest IA is Progress Past work; shell width pressure shows in Past work / Jobs chrome.
- Addendum sections: findings §§12–14 (type Q14, depth Q15, layout Q16); open questions added to F09 spec.
- Issues found while inventorying (not fixed): Achievement unlock modal bypasses `ModalLayer` ([`AchievementUnlockModal.tsx`](../../../../../apps/web/src/features/achievements/AchievementUnlockModal.tsx)); Past work grid comment vs column weights disagree ([`styles.css` L4416–4417](../../../../../apps/web/src/styles.css)); see findings.
