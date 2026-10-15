# M1-14: Apply heat, urgency, and surface-2 washes on hotspots

**Status:** Draft
**Blocked by:** M1-01
**Implements:** R0.3, R0.5, R1.1
**Type:** build

## What to build

Apply locked **vivid-rose soft-peak** heatmap stops, **Severity-5** deadline urgency colors, and replace purple container/description washes with **surface-2** on high-visibility hotspots (Progress heatmaps, `DeadlineUrgency`, Home/Jobs description-style panels as touched). Identity chips may keep domain-tech purple. Not a full Progress/Rewards restyle.

## Acceptance criteria

- [ ] Heat intensity scale uses design-system stops (tokens or shared module reading tokens)
- [ ] Deadline urgency uses Severity-5 (no purple/blue mid steps)
- [ ] Named purple panel/description washes on touched surfaces → surface-2
- [ ] `design-system.md` notes implementation location
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- `intensityScale.ts`, `DeadlineUrgency`, M1-01 tokens
- Full Past work height layout is M1-07 (docs) + later wave — out of scope here

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-14: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
