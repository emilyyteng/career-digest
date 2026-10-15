# M1-05: Pilot migrate Home (and app shell chrome)

**Status:** Draft
**Blocked by:** M1-02, M1-03, M1-04
**Implements:** R.1, R1.1, R.15, Q17
**Type:** build

## What to build

Pilot the Ink desk system on **Home** plus shared **app shell** chrome (brand mark, top nav, shell width). Home is the chosen pilot because container placement is straightforward compared with Progress’s nested bands. Prove primitives, tokens, tabs, and carded layout without sandbox `!important` hacks. Strip purple container washes on Home in favor of surface-2; domain-tech purple may remain on streak/score identity chips only.

## Acceptance criteria

- [ ] Home uses Button / field / tab / card primitives (or documented shared classes) — not bare global button styling
- [ ] App shell: flora.exe mark, chrome-tab nav language, 1100px shell
- [ ] Home cards follow all-carded + Ink desk tokens; no purple panel washes
- [ ] Visually aligned with M0 lab intent (spot-check against `/prototype/f09/lab`)
- [ ] Issues found outside Home logged per AGENTS (not silently expanded)
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a

## Reuse notes

- M1-01–04 primitives/tokens
- [`Home.tsx`](../../../../../apps/web/src/pages/Home.tsx), app chrome in `App.tsx` / `styles.css`
- Height/overflow policy (M1-07) may not fully apply on Home; do not invent a Progress dual-column height fix here

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-05: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)
