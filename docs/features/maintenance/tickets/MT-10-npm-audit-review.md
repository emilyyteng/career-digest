# MT-10: Review `npm audit` warnings

**Status:** Draft (not scheduled)
**Blocked by:** none
**Implements:** n/a (maintenance)
**Type:** spike

## Found during

MT-08, 2026-10-13: `npm install` printed audit warnings. The user agreed the same day to a ticket so they can be checked later for real problems.

## Evidence

`npm audit` on 2026-10-13 (read-only): 8 vulnerabilities, 2 moderate, 3 high and 3 critical. All 8 packages were already in the lockfile before MT-08; MT-08 added only `@types/*` packages, none of them flagged.

| Package | Severity | Pulled in by | Runs in | `npm audit` fix |
|---------|----------|--------------|---------|-----------------|
| `multer` 2.2.0 | high | API (direct) | API server (uploads) | non-breaking |
| `proxy-addr` 2.0.7 | critical | `express` | API server | non-breaking |
| `qs` 6.15.3 | moderate | `express` | API server | non-breaking |
| `undici` 7.29.0 | high | `cheerio` | API scrapers | non-breaking |
| `source-map-js` 1.2.1 | high | `vite` → `postcss` | web build only | non-breaking |
| `vitest` 3.2.7, `@vitest/mocker`, `tinypool` 1.1.1 | critical, moderate | API (dev) | tests only | "breaking": `--force` would install vitest 2.0.5, a downgrade |

The app runs locally for one user, so how much any of these matters depends on what each advisory needs (for example, untrusted input reaching the server).

## Questions to answer

1. For each advisory, can it be reached in how this app runs (local server, own data, scrapers fetching job boards)?
2. Does `npm audit fix` (non-breaking) pass `npm run check` and leave the app working?
3. For vitest: is there a patched 3.x or 4.x, rather than the 2.0.5 downgrade `--force` suggests?
4. Should CI run `npm audit` (and at what level), or is a periodic review enough?

## Out of scope

- Running `npm audit fix --force`.
- Upgrades beyond what's needed to clear the advisories.

## Definition of done

- [ ] Each question answered with a recommendation
- [ ] Any fix agreed with the user first; if made, `npm run check` passes and it's committed as `MT-10: …`
- [ ] End-of-task report given, including **Issues found**

## Verification notes

(Filled in when done.)
