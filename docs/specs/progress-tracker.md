# Spec: Progress tracker (Activity · Effort · Outcome)

## Problem

Emily wants daily motivation for internship search work without Goodhart-ing easy applies. She needs visible **Activity** (volume), **Effort** (deep work), and **Outcome** (period totals)—separate from interview pipeline status and Needs attention.

## Solution (v1)

### Two prep lanes (Progress page)

| Lane | Activity volume | Effort |
|------|-----------------|--------|
| **Application prep** | Applications logged (`applied_at` date, including backdates) | Reflection logs (company research, targeted responses, behavioral prep) |
| **Technical prep** | Daily LeetCode solve count (user-logged) | Reflection logs (tricky concepts, interview problems) |

- **Tabs:** “Applications” / “Technical” (short labels).
- **Primary tab:** Applications.
- Each lane: GitHub-style **heatmap** (Activity credit 0–5 scale) + Effort marker on days with ≥1 reflection in that lane (visual TBD—ring/star via prototype).
- **Copy:** heatmaps are explicitly application vs technical progress—not interview pipeline.

### Credit scale (not binary)

- Activity **earned credit** per day: `min(raw_count, 5)` for both applications and LeetCode.
- Heatmap intensity maps to earned credit (0–5), not a on/off “full day.”
- **Raw totals** stored and available in day detail / drill-down—not headline Home or heatmap tooltips by default (avoid optimizing for huge numbers).

### Effort rules

- Reflection logs scoped to **application** or **technical** lane.
- Multiple entries per day allowed; **≥1 entry in a lane → Effort credit** for that lane that day.
- Home **deep work ✓** if **either** lane earned Effort today (single check, not split).

### Outcome (progress totals—not pipeline)

Aggregates at **day / week / month** (local TZ; week = Sunday 00:00 – Saturday 23:59; calendar month):

1. Applications logged (count)
2. LeetCode solves (sum of daily totals)
3. Deep work units (reflection entry count, both lanes)

Shown on Progress page (week summary required; month on same page). **Not** interview step completion or application status funnel.

### Home

- Row under “Your internship digest at a glance,” peer to “Pipeline status →”:
  - `Today: 3/5 apps · 2/5 LC · deep work ✓` (deep work only if Effort earned today)
- Links to Progress. No week line on Home.

### Logging UX

- **LeetCode:** +1 quick button + ability to set absolute daily total.
- **Reflections:** add entry per deep-work block (lane-scoped).
- **Applications:** derived from tracker; backdating `applied_at` moves Activity to that date.

### Explicitly out of v1

- Interview pipeline metrics on Progress
- Per-problem LeetCode metadata (difficulty/topic)
- LeetCode API sync
- School/personal task metrics
- Single headline “progress score” across lanes

## Data model (sketch)

| Entity | Purpose |
|--------|---------|
| `leetcode_daily` | `date` (local), `count` — technical Activity |
| `reflection_logs` | `lane` (`application` \| `technical`), `body`, optional `application_id`, `created_at` |
| Applications | Activity source via `applied_at` (existing table) |

API aggregates: today strip, heatmap series (earned credit + effort flags), Outcome summaries.

### API (`tz` = IANA timezone, required on reads)

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/progress/today` | Today strip: app/LC earned credit, `deepWork` |
| GET | `/api/progress/heatmap?lane=application\|technical&days=365` | Per-day `raw`, `earned`, `effort` |
| GET | `/api/progress/outcome?period=day\|week\|month&date=` | Period totals |
| GET | `/api/progress/day/:date` | Drill-down: apps, LC, reflections |
| PATCH | `/api/progress/leetcode` | Body `{ count }` or `{ delta }` for today in `tz` |
| POST | `/api/progress/reflections` | Body `{ lane, body, applicationId? }` |

## Delivery phases

| # | Ticket | Scope |
|---|--------|--------|
| 0 | Mark applied + notes | Jobs/Job detail modal with optional notes → `applications.notes` |
| 1 | Progress data + API | Tables, LeetCode log, reflections, aggregates from `applied_at` |
| 2 | Progress page | Dual heatmaps, day detail, week/month Outcome |
| 3 | Home today strip | Daily row wired to API |
| 4 | Effort visual polish | Prototype ring/star/fill; apply winner to heatmaps |

## ADR candidate

**Multi-lane Progress with 0–5 earned credit** — avoids single-number Goodhart; hard to reverse once habit-forming. Capture when implementing if desired.

## Glossary

See `CONTEXT.md`: Application prep, Technical prep, Activity, Effort, Outcome, Application logged, Reflection log.
