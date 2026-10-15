# M1-02: Button, field, and segmented primitives

**Status:** Ready
**Blocked by:** (none) — M1-01 Done
**Implements:** R.1, R1.1, Q1–Q3
**Type:** build

## What to build

Shared Ink desk control primitives: **Button** (primary / secondary / ghost × sm / md), **form fields** (text, select, date, compact number), and **segmented** control (rounded track; active = ink fill). Flat elevation; hover/focus per `design-system.md` (fields: border-only hover, wash on focus). Styles are variant classes/components — not new bare-element globals.

## Acceptance criteria

- [ ] Primitives live in a shared web location (e.g. `apps/web/src/ui/` or agreed equivalent); catalogue in `design-system.md` updated with class/component names
- [ ] Button variants match M0 lock (ink primary, flat secondary/ghost; no blue/purple fills or button shadows)
- [ ] Compact number field size exists and is usable next to labels (Progress LC target class of problem)
- [ ] Segmented active state matches primary (ink), not blush/purple/blue
- [ ] Documented usage; no expansion of `button:not(...)` chain
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a — visuals locked in M0; lab is reference only

## Reuse notes

- Supersedes F08 M5 `ui-btn*` interim looks
- Prefer extending toward one Button API rather than keeping parallel `secondary` + `ui-btn` forever (full call-site cleanup is M1-04 / pilot)

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-02: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
