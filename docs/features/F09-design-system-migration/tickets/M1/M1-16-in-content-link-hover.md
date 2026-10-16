# M1-16: Apply in-content link hover app-wide

**Status:** Done
**Blocked by:** (none)
**Implements:** R.15, M1-15 link verdict
**Type:** build
**Scheduled with:** after Home pilot link rule (M1-15)

## What to build

M1-15 locked in-content link hover as **underline on hover; text may stay dark/ink** (no purple/blue required). Apply one standard so list/detail titles and section links match Home. Do not change ChromeTab hover (text-only ink; underline only when active).

## Acceptance criteria

- [x] `docs/design-system.md` states the in-content link rule and named exceptions
- [x] Global `a` / `a:hover` matches the lock; page-local purple/blue hovers removed where they conflict
- [x] Spot-check surfaces covered: Home, Jobs cards, Applications cards, Tasks titles, Progress ledger titles (Rewards has no in-content `<a>` titles)
- [x] ChromeTab / brand / rich-text / `a.external` behavior documented and verified
- [x] `npm run check` passes

## Design questions (prototype tickets only)

n/a — verdict locked in M1-15; this ticket applies it.

## Reuse notes

- M1-15 Home rules retained for section links / title wrappers
- Global `styles.css` `a` / `a:hover`; ChromeTab in `ui/ui.css`

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Follows `docs/design-system.md`
- [x] Reuse check done (Home patterns + global `a`; no new component)
- [x] No production imports of prototype code
- [x] Committed as `F09 M1-16: …`
- [x] End-of-task report given

## Verification notes

**Exceptions documented:** ChromeTab (text-only hover), `.top-brand`, block card-hits (title child underline), `a.external` (same ink+underline; layout class), rich-text/JD body (always underlined).

`npm run check` pass (typecheck, web build, 356 API tests).

Commit below.
