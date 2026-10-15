# M1-02: Button, field, and segmented primitives

**Status:** Done
**Blocked by:** (none) — M1-01 Done
**Implements:** R.1, R1.1, Q1–Q3
**Type:** build

## What to build

Shared Ink desk control primitives: **Button** (primary / secondary / ghost × sm / md), **form fields** (text, select, date, compact number), and **segmented** control (rounded track; active = ink fill). Flat elevation; hover/focus per `design-system.md` (fields: border-only hover, wash on focus). Styles are variant classes/components — not new bare-element globals.

## Acceptance criteria

- [x] Primitives live in a shared web location (e.g. `apps/web/src/ui/` or agreed equivalent); catalogue in `design-system.md` updated with class/component names
- [x] Button variants match M0 lock (ink primary, flat secondary/ghost; no blue/purple fills or button shadows)
- [x] Compact number field size exists and is usable next to labels (Progress LC target class of problem)
- [x] Segmented active state matches primary (ink), not blush/purple/blue
- [x] Documented usage; no expansion of `button:not(...)` chain
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a — visuals locked in M0; lab is reference only

## Reuse notes

- Supersedes F08 M5 `ui-btn*` interim looks
- Prefer extending toward one Button API rather than keeping parallel `secondary` + `ui-btn` forever (full call-site cleanup is M1-04 / pilot)
- Reused: `.secondary` escape for global blue default; Progress `LeetcodeLogger` + `WeeklyGoalsBlock` as first production call sites

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-02: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15:**

- Added `apps/web/src/ui/`: `Button`, `TextField` / `SelectField` / `TextAreaField`, `Segmented`, `ui.css`, barrel `index.ts`
- `main.tsx` imports `ui/ui.css`; Button always includes `.secondary` (no `:not(...)` chain growth)
- Proof call sites: `LeetcodeLogger` → `Segmented` + `Button`; `WeeklyGoalsBlock` → `TextField fieldSize="num"` + `Button` / `TextField` for LC label
- `design-system.md` Components catalogue lists class/component names and policies
- Also: user-facing docs product name → flora.exe (repo/package names unchanged)
- `npm run check`: typecheck, web build, 345 API tests — pass
- Commit: (recorded after commit)
