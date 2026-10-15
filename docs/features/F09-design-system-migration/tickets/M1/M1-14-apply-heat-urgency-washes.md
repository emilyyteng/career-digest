# M1-14: Apply heat, urgency, and surface-2 washes on hotspots

**Status:** Done
**Blocked by:** (none) — M1-01 Done
**Implements:** R0.3, R0.5, R1.1
**Type:** build

## What to build

Apply locked **vivid-rose soft-peak** heatmap stops, **Severity-5** deadline urgency colors, and replace purple container/description washes with **surface-2** on high-visibility hotspots (Progress heatmaps, `DeadlineUrgency`, Home/Jobs description-style panels as touched). Identity chips may keep domain-tech purple. Not a full Progress/Rewards restyle.

## Acceptance criteria

- [x] Heat intensity scale uses design-system stops (tokens or shared module reading tokens)
- [x] Deadline urgency uses Severity-5 (no purple/blue mid steps)
- [x] Named purple panel/description washes on touched surfaces → surface-2
- [x] `design-system.md` notes implementation location
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- `intensityScale.ts`, `DeadlineUrgency`, M1-01 tokens
- Full Past work height layout is M1-07 (docs) + later wave — out of scope here
- Identity purple kept on ops “active” badge (tokenized), streak mark color, progress link-kind app chip

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-14: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15:**

- `intensityScale.ts` RGB stops = `--heat-0`…`--heat-4`; legend uses CSS heat vars; empty cells still `--surface-2`
- `DeadlineUrgency` pie/countdown tones → `--urgency-*` (soon/ahead no longer purple/blue)
- Surface-2 washes: Jobs `.description` panel, complete-optional panel, reflections create/picker; ops active badge tokenized domain-tech (identity)
- Catalogue rows for Heatmap / Deadline urgency updated in `design-system.md`
- Also: M1-04 marked Ready for next pass
- `npm run check` pass
- Commit: `7e7c335`
