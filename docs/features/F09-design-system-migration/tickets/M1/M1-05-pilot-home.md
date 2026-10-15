# M1-05: Pilot migrate Home (and app shell chrome)

**Status:** Done
**Blocked by:** M1-02, M1-03, M1-04
**Implements:** R.1, R1.1, R.15, Q17
**Type:** build

## What to build

Pilot the Ink desk system on **Home** plus shared **app shell** chrome (brand mark, top nav, shell width). Home is the chosen pilot because container placement is straightforward compared with Progress’s nested bands. Prove primitives, tokens, tabs, and carded layout without sandbox `!important` hacks. Strip purple container washes on Home in favor of surface-2; domain-tech purple may remain on streak/score identity chips only.

## Acceptance criteria

- [x] Home uses Button / field / tab / card primitives (or documented shared classes) — not bare global button styling
- [x] App shell: flora.exe mark, chrome-tab nav language, 1100px shell
- [x] Home cards follow all-carded + Ink desk tokens; no purple panel washes
- [x] Visually aligned with M0 lab intent (spot-check against `/prototype/f09/lab`)
- [x] Issues found outside Home logged per AGENTS (not silently expanded)
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M1-01–04 primitives/tokens
- [`Home.tsx`](../../../../../apps/web/src/pages/Home.tsx), app chrome in `App.tsx` / `styles.css`
- Height/overflow policy (M1-07) may not fully apply on Home; do not invent a Progress dual-column height fix here
- Reused: `Segmented`, `Badge`, `PriorityBadge`, `.card`, ChromeTabLink nav (already on shell)

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-05: …`
- [x] End-of-task report given

## Verification notes

**2026-10-15:**

- App shell already flora.exe + ChromeTab nav + `--shell-max` 1100 (M1-01/03); brand hover → ink; display font on mark
- Home: upcoming range → `Segmented`; greeting/section titles → ink + display; section links ink hover; last-digest → surface-2 panel; job-title hover ink (not blue)
- Domain-tech purple kept on streak checkmark / score badges only
- Spot-check vs lab: chrome-tab nav + carded sections + ink titles match Ink desk shortlist
- Outside Home: Jobs/Applications still use legacy `.tab.on` blue — logged for M2 wave (not expanded here)
- `npm run check` pass
- Commit: `6ab5517`
