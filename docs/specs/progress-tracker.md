# Spec: Progress tracker (Activity · Effort · Outcome)

## Problem

The user wants daily motivation for internship search work without Goodhart-ing easy applies. They need visible **Activity** (volume), **Effort** (deep work), and **Outcome** (period totals)—separate from interview pipeline status and Needs attention.

## Solution (v1)

### Two prep lanes

| Lane | Activity volume | Effort |
|------|-----------------|--------|
| **Application prep** | Applications logged (`applied_at` date, including backdates) | Reflection logs (company research, targeted responses, behavioral prep) |
| **Technical prep** | Daily LeetCode solve count (user-logged) | Reflection logs (tricky concepts, interview problems) |

- **Copy:** Progress is application vs technical **prep**—not interview pipeline.
- Both lanes stay visible together on the Today tab (stacked heatmaps). No Applications/Technical tabs for switching heatmaps.

### Credit scale (not binary)

- Activity **earned credit** per day: `min(raw_count, 5)` for both applications and LeetCode.
- Heatmap intensity maps to earned credit (0–5), not a on/off “full day.”
- **Raw totals** available in History day detail—not headline Home. Heatmap **hover tooltips** may show brief day info (earned credit + effort); do not promote raw volume in tooltips.

### Effort rules

- Reflection logs scoped to **application** or **technical** lane.
- Multiple entries per day allowed; **≥1 entry in a lane → Effort credit** for that lane that day.
- Home **deep work ✓** if **either** lane earned Effort today (single check, not split).
- Heatmap Effort mark: **centered pink checkmark** on cells with Effort that day (per lane heatmap).

### Outcome (progress totals—not pipeline)

Aggregates at **day / week / month** (local TZ; week = Sunday 00:00 – Saturday 23:59; calendar month):

1. Applications logged (count)
2. LeetCode solves (sum of daily totals)
3. Deep work units (reflection entry count, both lanes)

Shown on the **Today** tab as **week and month cards side-by-side** (no week/month toggle). **Not** interview step completion or application status funnel.

### Progress page: two tabs (not two pages)

Working names (rename later if needed): **Today** (primary) and **History**.

#### Today tab (log + motivational overview)

Top → bottom:

1. **Header** — local date + today strip (`3/5 apps · 2/5 LC · deep work ✓`)
2. **Outcome** — This week + This month cards side-by-side
3. **Main band** — dual stacked heatmaps (Application prep above Technical prep) taking most horizontal width; **Log today** in a right-hand container that spans the height of both heatmaps. On narrow screens, log stacks below the heatmaps. Log is dedicated but not enormous.
4. Heatmaps are **overview only**—not date controls. Hover tooltips for brief day info are OK; clicking a cell does not change the selected day.
5. **Log today**
   - **LeetCode** in its own block: stepper (`−` / count / `+`) with the count directly editable
   - **Reflection compose** with lane selector (**Application** / **Technical**) next to the note field—not tied to heatmap tabs
   - Today’s notes: accordion (truncated header → expand body); pencil → edit → save (same pattern as History)

Happy path is always **today**. No arbitrary-day dig on this tab.

#### History tab (granular records)

- **View-first.** Calendar (month) is the primary day control and visual focus.
- Selecting a day shows that day’s apps, LC total, and reflections.
- Reflections: **accordion**—truncated note as header; one expanded at a time.
- **Edit this day** toggle (off by default) unlocks modifications for the selected day:
  - Adjust LC (same stepper + direct edit)
  - Add reflection
  - Edit existing note bodies (pencil on the note → editable + save)
- Retroactive logging lives **only** here—not via heatmap clicks on Today.
- Do **not** duplicate year heatmaps or week/month Outcome cards on History (those stay on Today).

### Home

- Row under “Your internship digest at a glance,” peer to “Pipeline status →”:
  - `Today: 3/5 apps · 2/5 LC · deep work ✓` or `… · no deep work` (same strip wording as Progress Today)
  - `Update progress →` on the same row (right), under Pipeline status
- No week line on Home.

### Logging UX

- **LeetCode:** stepper + direct edit of the daily total (Today = today in `tz`; History = selected day after Edit).
- **Reflections:** add entry per deep-work block (lane-scoped); edit via pencil + save.
- **Applications:** derived from tracker; backdating `applied_at` moves Activity to that date (no Progress-side editor for apps).

### Explicitly out of v1

- Interview pipeline metrics on Progress
- Per-problem LeetCode metadata (difficulty/topic)
- LeetCode API sync
- School/personal task metrics
- Single headline “progress score” across lanes
- Heatmap cells as date pickers on the Today tab
- Separate Progress pages (tabs only)

## Data model

| Entity | Purpose |
|--------|---------|
| `leetcode_daily` | `date` (local), `count` — technical Activity |
| `reflection_logs` | `lane` (`application` \| `technical`), `body`, optional `application_id`, `created_at` |
| Applications | Activity source via `applied_at` (existing table) |

### API (`tz` = IANA timezone, required on reads; writes that are “today” also take `tz`)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/progress/today` | Today strip: app/LC earned credit, `deepWork` |
| GET | `/api/progress/heatmap?lane=application\|technical&days=365` | Per-day `raw`, `earned`, `effort` |
| GET | `/api/progress/outcome?period=day\|week\|month&date=` | Period totals |
| GET | `/api/progress/day/:date` | Drill-down: apps, LC, reflections |
| PATCH | `/api/progress/leetcode` | Body `{ count }` or `{ delta }`; optional `date` (YYYY-MM-DD) for History backfill—default today in `tz` |
| POST | `/api/progress/reflections` | Body `{ lane, body, applicationId? }`; optional `createdAt`/`localDate` for History backfill if needed |
| PATCH | `/api/progress/reflections/:id` | Body `{ body }` — edit note text (Today + History) |

Ticket 1 shipped the read model + today-only LeetCode create + reflection create. Ticket 2 UI may need the **date-scoped LeetCode** and **reflection PATCH** extensions above.

## Delivery phases

| # | Ticket | Scope |
|---|--------|--------|
| 0 | Mark applied + notes | Jobs/Job detail modal with optional notes → `applications.notes` ✅ |
| 1 | Progress data + API | Tables, LeetCode log, reflections, aggregates from `applied_at` ✅ |
| 2 | Progress page | Today + History tabs per UI model above; wire APIs; add reflection PATCH + dated LeetCode if missing ✅ |
| 3 | Home today strip | Daily row wired to API ✅ |
| 4 | Effort visual | **Locked:** centered pink checkmark on heatmap effort days (no further prototype required unless checkmark fails in real cells) ✅ |

### UI grill lock (2026-08-30)

Validated against throwaway prototypes on branch `prototype/progress-page-ui` (`/prototype/progress`). Do not merge prototype variants to `main`; implement Ticket 2 from this spec.

## ADR candidate

**Multi-lane Progress with 0–5 earned credit** — avoids single-number Goodhart; hard to reverse once habit-forming. Capture when implementing if desired.

**Today vs History tabs on one Progress page** — separates log/motivation from record dig-in so heatmaps never become date controls.

## Glossary

See `CONTEXT.md`: Application prep, Technical prep, Activity, Effort, Outcome, Application logged, Reflection log.
