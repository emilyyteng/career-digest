# M6-02: Departure log API

**Status:** Done
**Blocked by:** (none)
**Implements:** R6.2, R6.6, R6.7 (read model) (from `../../spec.md`)
**Type:** build

## What to build

Expose the departure log for the Status page.

- `GET` endpoint (e.g. `/api/ops/board-departures` or under the existing ops surface) that accepts the **browser timezone** (query param, same spirit as Progress).
- Returns departures still within retention, grouped by **local calendar day** (or a flat list plus day keys the client can group — prefer server-grouped days to match R6.7).
- Each day includes: local date key, rows (title, company, location, reason label or enum, `taskRemoved`), and **`taskRemovedCount`** (number of rows with task removed that day).
- **Does not purge** on read (R6.7).
- Reason values map to user-facing `Left board` / `Duplicate` (mapping may live in API or UI; pick one and keep it consistent with M6-03).

## Acceptance criteria

- [x] GET returns only non-purged rows, sectioned (or keyed) by browser-local day.
- [x] Row payload includes title, company, location, reason, `taskRemoved`.
- [x] Each day exposes `taskRemovedCount` (0 when none).
- [x] Calling GET does not delete rows.
- [x] Integration tests cover empty log, mixed reasons, `taskRemoved` flags, and TZ day boundaries.

## Reuse notes

[`boardDepartures.ts`](../../../../../apps/api/src/boardDepartures.ts) `getBoardDeparturesSnapshot`; Progress `resolveTimezone` / `localDateInTimezone`; [`routes.ts`](../../../../../apps/api/src/routes.ts) `/api/ops/board-departures`. Reason labels on the API (`reason` + `reasonLabel`) for M6-03.

## Definition of done

- [x] Acceptance criteria met and checked
- [x] `npm run check` passes
- [x] Reuse check done
- [x] Committed as `F08 M6-02: …`
- [x] End-of-task report given, including tests added and **Issues found**

## Verification notes

- `GET /api/ops/board-departures?tz=` → `{ tz, localDate, days: [{ date, taskRemovedCount, rows }] }`.
- Retention filter: local today + yesterday in `tz` (no purge on read).
- Labels: `Left board` / `Duplicate`.
- Tests: `boardDepartures.api.test.ts` (4). `npm run check` green (356 tests).
- Commit: (this commit).
