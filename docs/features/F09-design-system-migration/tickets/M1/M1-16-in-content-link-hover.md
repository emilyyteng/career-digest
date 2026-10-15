# M1-16: Apply in-content link hover app-wide

**Status:** Ready
**Blocked by:** (none) — prefer after M1-06 nesting lock; can run in parallel with other M1 pattern tickets
**Implements:** R.15, M1-15 link verdict
**Type:** build
**Scheduled with:** after Home pilot link rule (M1-15); before or during early M2 if not done

## What to build

M1-15 locked in-content link hover as **underline on hover; text may stay dark/ink** (no purple/blue required). Home section links and job titles were updated; the rest of the app still mixes global `a` blue + purple hover, page-local rules, and missing underlines.

Audit exceptions (external links, rich-text editor, brand mark, ChromeTabs, buttons-as-links), then apply one standard so list/detail titles and section links match Home. Do not change ChromeTab hover (text-only ink; underline only when active).

## Acceptance criteria

- [ ] `docs/design-system.md` states the in-content link rule and named exceptions
- [ ] Global `a` / `a:hover` (or a named content-link class) matches the lock; page-local purple/blue hovers removed where they conflict
- [ ] Spot-check: Home, Jobs cards, Applications cards, Tasks titles, Progress ledger titles, Rewards
- [ ] ChromeTab / brand / rich-text / `a.external` behavior documented and verified
- [ ] `npm run check` passes

## Design questions (prototype tickets only)

n/a — verdict locked in M1-15; this ticket applies it.

## Reuse notes

- M1-15 Home rules: `.home-section-link`, `.home-job-main` title underline
- Global [`styles.css`](../../../../../apps/web/src/styles.css) `a` / `a:hover` (~L103–104)

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Follows `docs/design-system.md`
- [ ] Reuse check done
- [ ] No production imports of prototype code
- [ ] Committed as `F09 M1-16: …`
- [ ] End-of-task report given

## Verification notes

(filled when done)

## Why not in M1-06

Nesting lock is IA/chrome; link color is orthogonal and needs an exception inventory so we do not break rich-text, external, or chrome links while flipping globals.
