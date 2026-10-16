# M6-02: Departure log API

**Status:** Ready
**Blocked by:** M6-01
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

- [ ] GET returns only non-purged rows, sectioned (or keyed) by browser-local day.
- [ ] Row payload includes title, company, location, reason, `taskRemoved`.
- [ ] Each day exposes `taskRemovedCount` (0 when none).
- [ ] Calling GET does not delete rows.
- [ ] Integration tests cover empty log, mixed reasons, `taskRemoved` flags, and TZ day boundaries.

## Reuse notes

M6-01 table + helpers; Progress TZ query pattern (`tz` on progress routes); [`opsStatus.ts`](../../../../../apps/api/src/opsStatus.ts) / [`routes.ts`](../../../../../apps/api/src/routes.ts) for ops route placement.

## Definition of done

- [ ] Acceptance criteria met and checked
- [ ] `npm run check` passes
- [ ] Reuse check done
- [ ] Committed as `F08 M6-02: …`
- [ ] End-of-task report given, including tests added and **Issues found**

## Verification notes

(filled when done)
