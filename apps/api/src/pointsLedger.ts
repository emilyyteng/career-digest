import type { Pool, PoolClient } from "pg";
import {
  applyDeltaToBalance,
  type PointsBreakdownSlice,
  type PointsCategory,
} from "./pointsFormulas.js";

type Queryable = Pool | PoolClient;

export type PointsEventKind = "earn" | "reverse" | "adjust" | "spend" | "refund";

export type PointsEventRow = {
  id: string;
  createdAt: string;
  kind: PointsEventKind;
  category: PointsCategory;
  amount: number;
  balanceAfter: number;
  message: string;
  sourceType: string;
  sourceId: string | null;
  breakdown: PointsBreakdownSlice[] | null;
  meta: Record<string, unknown>;
  reversesEventId: string | null;
};

export type TaskCategoryPoints = {
  /** null is the "Deleted tasks" row. */
  taskCategoryId: string | null;
  name: string;
  points: number;
};

export type PointsSummary = {
  balance: number;
  categories: Array<{ category: PointsCategory; points: number }>;
  /** The `task` category split by task category (R5.21); sums to its `task` row. */
  taskCategories: TaskCategoryPoints[];
};

/** Compact earn payload for complete/applied/finish API responses. */
export type PointsEarnInfo = {
  amount: number;
  message: string;
  balanceAfter: number;
};

export function serializePointsEarn(
  event: PointsEventRow | null | undefined,
): PointsEarnInfo | null {
  if (!event) return null;
  return {
    amount: event.amount,
    message: event.message,
    balanceAfter: event.balanceAfter,
  };
}

/**
 * Current effective value of an earn after adjusts.
 * Earn `amount` stays as the original ledger delta (for history / SUM);
 * adjusts update `meta.current_amount`.
 */
export function effectiveEarnAmount(earn: PointsEventRow): number {
  if (earn.meta.superseded === true) return 0;
  const cur = earn.meta.current_amount;
  if (typeof cur === "number" && Number.isFinite(cur)) {
    return Math.max(0, Math.floor(cur));
  }
  return Math.max(0, earn.amount);
}

function mapEvent(row: {
  id: string;
  created_at: Date | string;
  kind: PointsEventKind;
  category: PointsCategory;
  amount: number;
  balance_after: number;
  message: string;
  source_type: string;
  source_id: string | null;
  breakdown: PointsBreakdownSlice[] | null;
  meta: Record<string, unknown> | null;
  reverses_event_id: string | null;
}): PointsEventRow {
  return {
    id: row.id,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at),
    kind: row.kind,
    category: row.category,
    amount: row.amount,
    balanceAfter: row.balance_after,
    message: row.message,
    sourceType: row.source_type,
    sourceId: row.source_id,
    breakdown: row.breakdown ?? null,
    meta: row.meta ?? {},
    reversesEventId: row.reverses_event_id,
  };
}

export async function getPointsBalance(db: Queryable): Promise<number> {
  // Sum of amounts — not the latest balance_after. Two earns in one transaction can
  // share a created_at, and UUID id order may not match insert order, so the
  // balance_after chain can skip an earn (streak +2 then LC +30 left latest
  // balance_after at 30). SUM stays correct.
  const { rows } = await db.query<{ balance: string }>(
    `SELECT COALESCE(SUM(amount), 0)::text AS balance FROM points_events`,
  );
  return Number(rows[0]?.balance ?? 0);
}

export async function getPointsSummary(db: Queryable): Promise<PointsSummary> {
  const balance = await getPointsBalance(db);
  const { rows } = await db.query<{ category: PointsCategory; points: string }>(
    `SELECT category, COALESCE(SUM(amount), 0)::text AS points
     FROM points_events
     GROUP BY category
     ORDER BY SUM(amount) DESC`,
  );
  return {
    balance,
    categories: rows
      .map((r) => ({ category: r.category, points: Number(r.points) }))
      .filter((r) => r.points !== 0),
    taskCategories: await getTaskCategoryPoints(db),
  };
}

/**
 * Each task's events (earn, adjusts, reverses) go where its earn says: the category
 * recorded at completion, else the task's current one (earns from before R5.21).
 * Events whose task no longer exists go to "Deleted tasks".
 */
async function getTaskCategoryPoints(db: Queryable): Promise<TaskCategoryPoints[]> {
  const { rows } = await db.query<{
    category_id: string | null;
    name: string | null;
    points: string;
  }>(
    `WITH per_task AS (
       SELECT source_type, source_id, SUM(amount) AS points
       FROM points_events
       WHERE category = 'task'
       GROUP BY source_type, source_id
     ),
     attributed AS (
       SELECT
         pt.points,
         CASE WHEN t.id IS NULL THEN NULL
              ELSE COALESCE(e.meta->>'task_category_id', t.category_id::text)
         END AS category_id,
         CASE WHEN t.id IS NULL THEN NULL ELSE e.meta->>'task_category_name' END AS recorded_name
       FROM per_task pt
       LEFT JOIN points_events e
         ON e.kind = 'earn' AND e.source_type = pt.source_type AND e.source_id = pt.source_id
       LEFT JOIN tasks t ON t.id::text = pt.source_id
     )
     SELECT
       a.category_id,
       COALESCE(c.name, MAX(a.recorded_name)) AS name,
       SUM(a.points)::text AS points
     FROM attributed a
     LEFT JOIN task_categories c ON c.id::text = a.category_id
     GROUP BY a.category_id, c.name
     ORDER BY SUM(a.points) DESC, COALESCE(c.name, MAX(a.recorded_name))`,
  );
  return rows
    .map((r) => ({
      taskCategoryId: r.category_id,
      name: r.category_id === null ? "Deleted tasks" : (r.name ?? "Uncategorized"),
      points: Number(r.points),
    }))
    .filter((r) => r.points !== 0);
}

export async function listPointsEvents(
  db: Queryable,
  opts: { limit?: number; offset?: number } = {},
): Promise<PointsEventRow[]> {
  const limit = Math.min(Math.max(opts.limit ?? 50, 1), 200);
  const offset = Math.max(opts.offset ?? 0, 0);
  const { rows } = await db.query({
    text: `SELECT
       id,
       created_at,
       kind,
       category,
       amount,
       balance_after,
       message,
       source_type,
       source_id,
       breakdown,
       meta,
       reverses_event_id
     FROM points_events
     ORDER BY created_at DESC, id DESC
     LIMIT $1 OFFSET $2`,
    values: [limit, offset],
  });
  return rows.map((r) => mapEvent(r as Parameters<typeof mapEvent>[0]));
}

export async function findEarnEvent(
  db: Queryable,
  sourceType: string,
  sourceId: string,
): Promise<PointsEventRow | null> {
  const { rows } = await db.query({
    text: `SELECT
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id
     FROM points_events
     WHERE kind = 'earn' AND source_type = $1 AND source_id = $2
     LIMIT 1`,
    values: [sourceType, sourceId],
  });
  const row = rows[0];
  return row ? mapEvent(row as Parameters<typeof mapEvent>[0]) : null;
}

export type RecordEarnInput = {
  category: PointsCategory;
  amount: number;
  message: string;
  sourceType: string;
  sourceId: string;
  breakdown?: PointsBreakdownSlice[] | null;
  meta?: Record<string, unknown>;
};

/**
 * Insert an earn event. Idempotent on (source_type, source_id) for kind=earn —
 * returns existing row if already present.
 */
export async function recordEarn(
  db: Queryable,
  input: RecordEarnInput,
): Promise<{ event: PointsEventRow; created: boolean }> {
  const existing = await findEarnEvent(db, input.sourceType, input.sourceId);
  if (existing) return { event: existing, created: false };

  const amount = Math.max(0, Math.floor(input.amount));
  const balance = await getPointsBalance(db);
  const balanceAfter = balance + amount;
  const { rows } = await db.query({
    text: `INSERT INTO points_events (
       kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta
     ) VALUES (
       'earn', $1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb
     )
     RETURNING
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id`,
    values: [
      input.category,
      amount,
      balanceAfter,
      input.message,
      input.sourceType,
      input.sourceId,
      input.breakdown ? JSON.stringify(input.breakdown) : null,
      JSON.stringify({
        ...(input.meta ?? {}),
        original_amount: amount,
      }),
    ],
  });
  return {
    event: mapEvent(rows[0] as Parameters<typeof mapEvent>[0]),
    created: true,
  };
}

/**
 * Reverse an earn (uncomplete, LC down, etc.). Emits a reverse event; balance
 * may go negative (R7.3). Marks earn meta.superseded = true but keeps
 * earn.amount, so category SUM(amount) nets the earn and its reverse.
 * Idempotent if already fully reversed.
 */
export async function reverseEarn(
  db: Queryable,
  sourceType: string,
  sourceId: string,
  message: string,
): Promise<{ event: PointsEventRow | null; appliedDelta: number }> {
  const earn = await findEarnEvent(db, sourceType, sourceId);
  if (!earn) return { event: null, appliedDelta: 0 };
  if (earn.meta.superseded === true) return { event: null, appliedDelta: 0 };

  const currentAmount = effectiveEarnAmount(earn);
  if (currentAmount <= 0) {
    await db.query(
      `UPDATE points_events SET meta = meta || '{"superseded":true}'::jsonb WHERE id = $1`,
      [earn.id],
    );
    return { event: null, appliedDelta: 0 };
  }

  const balance = await getPointsBalance(db);
  const { appliedDelta, requestedDelta, balanceAfter } = applyDeltaToBalance(
    balance,
    -currentAmount,
  );

  const { rows } = await db.query({
    text: `INSERT INTO points_events (
       kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id
     ) VALUES (
       'reverse', $1, $2, $3, $4, $5, $6, NULL, $7::jsonb, $8
     )
     RETURNING
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id`,
    values: [
      earn.category,
      appliedDelta,
      balanceAfter,
      message,
      sourceType,
      sourceId,
      JSON.stringify({
        requested_delta: requestedDelta,
        applied_delta: appliedDelta,
      }),
      earn.id,
    ],
  });

  await db.query(
    `UPDATE points_events
     SET meta = meta || $2::jsonb
     WHERE id = $1`,
    [
      earn.id,
      JSON.stringify({
        superseded: true,
        reversed_amount: currentAmount,
        clawback_applied: -appliedDelta,
      }),
    ],
  );

  return {
    event: mapEvent(rows[0] as Parameters<typeof mapEvent>[0]),
    appliedDelta,
  };
}

/**
 * Bring a reversed earn back at `newAmount` (re-complete, LC count raised from 0).
 * Emits an adjust event for newAmount minus what the earn still holds after its
 * reverse (retained is non-zero only for legacy reverses that were clamped to ≥0),
 * clears `superseded`, and sets meta.current_amount so later adjusts and reverses
 * work from it. Returns nulls if there's no earn or it isn't superseded.
 */
export async function reinstateEarn(
  db: Queryable,
  sourceType: string,
  sourceId: string,
  newAmount: number,
  message: (delta: number) => string,
  meta: Record<string, unknown> = {},
): Promise<{
  earn: PointsEventRow | null;
  adjust: PointsEventRow | null;
  appliedDelta: number;
}> {
  const earn = await findEarnEvent(db, sourceType, sourceId);
  if (!earn || earn.meta.superseded !== true) {
    return { earn: null, adjust: null, appliedDelta: 0 };
  }

  const reversed = Number(earn.meta.reversed_amount ?? 0);
  const clawedBack = Number(earn.meta.clawback_applied ?? reversed);
  const retained = Math.max(0, reversed - clawedBack);
  const target = Math.max(0, Math.floor(newAmount));
  const requestedDelta = target - retained;

  let adjust: PointsEventRow | null = null;
  let appliedDelta = 0;
  if (requestedDelta !== 0) {
    const balance = await getPointsBalance(db);
    const applied = applyDeltaToBalance(balance, requestedDelta);
    appliedDelta = applied.appliedDelta;
    const base = message(appliedDelta);
    const { rows } = await db.query({
      text: `INSERT INTO points_events (
         kind, category, amount, balance_after, message,
         source_type, source_id, breakdown, meta, reverses_event_id
       ) VALUES (
         'adjust', $1, $2, $3, $4, $5, $6, NULL, $7::jsonb, $8
       )
       RETURNING
         id, created_at, kind, category, amount, balance_after, message,
         source_type, source_id, breakdown, meta, reverses_event_id`,
      values: [
        earn.category,
        appliedDelta,
        applied.balanceAfter,
        base,
        sourceType,
        sourceId,
        JSON.stringify({
          reinstated: true,
          requested_delta: requestedDelta,
          applied_delta: appliedDelta,
          previous_amount: retained,
          new_amount: retained + appliedDelta,
        }),
        earn.id,
      ],
    });
    adjust = mapEvent(rows[0] as Parameters<typeof mapEvent>[0]);
  }

  const { rows: updated } = await db.query({
    text: `UPDATE points_events
     SET meta = (meta - 'reversed_amount' - 'clawback_applied') || $2::jsonb
     WHERE id = $1
     RETURNING
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id`,
    values: [
      earn.id,
      JSON.stringify({
        ...meta,
        superseded: false,
        current_amount: retained + appliedDelta,
        last_adjusted_at: new Date().toISOString(),
      }),
    ],
  });

  return {
    earn: mapEvent(updated[0] as Parameters<typeof mapEvent>[0]),
    adjust,
    appliedDelta,
  };
}

/**
 * Move an earn to `newAmount` (e.g. actual minutes edit).
 * Emits an adjust event for the delta; keeps earn.amount as the original
 * historical delta so category SUM(amount) stays correct. Current value lives
 * in meta.current_amount.
 */
export async function adjustEarnAmount(
  db: Queryable,
  sourceType: string,
  sourceId: string,
  newAmount: number,
  message: string,
): Promise<{
  earn: PointsEventRow | null;
  adjust: PointsEventRow | null;
  appliedDelta: number;
  requestedDelta: number;
}> {
  const earn = await findEarnEvent(db, sourceType, sourceId);
  if (!earn || earn.meta.superseded === true) {
    return { earn: null, adjust: null, appliedDelta: 0, requestedDelta: 0 };
  }

  const current = effectiveEarnAmount(earn);
  const target = Math.max(0, Math.floor(newAmount));
  const requestedDelta = target - current;
  if (requestedDelta === 0) {
    return { earn, adjust: null, appliedDelta: 0, requestedDelta: 0 };
  }

  const balance = await getPointsBalance(db);
  const { appliedDelta, balanceAfter } = applyDeltaToBalance(balance, requestedDelta);
  const finalAmount = current + appliedDelta;

  const { rows } = await db.query({
    text: `INSERT INTO points_events (
       kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id
     ) VALUES (
       'adjust', $1, $2, $3, $4, $5, $6, NULL, $7::jsonb, $8
     )
     RETURNING
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id`,
    values: [
      earn.category,
      appliedDelta,
      balanceAfter,
      message,
      sourceType,
      sourceId,
      JSON.stringify({
        requested_delta: requestedDelta,
        applied_delta: appliedDelta,
        previous_amount: current,
        new_amount: finalAmount,
      }),
      earn.id,
    ],
  });

  const original =
    typeof earn.meta.original_amount === "number"
      ? earn.meta.original_amount
      : earn.amount;

  const { rows: updated } = await db.query({
    text: `UPDATE points_events
     SET meta = meta || $2::jsonb
     WHERE id = $1
     RETURNING
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id`,
    values: [
      earn.id,
      JSON.stringify({
        original_amount: original,
        current_amount: finalAmount,
        last_adjusted_at: new Date().toISOString(),
      }),
    ],
  });

  return {
    earn: mapEvent(updated[0] as Parameters<typeof mapEvent>[0]),
    adjust: mapEvent(rows[0] as Parameters<typeof mapEvent>[0]),
    appliedDelta,
    requestedDelta,
  };
}

export type RecordGachaLedgerInput = {
  /** Positive Seeds moved (spend cost or refund credit). */
  amount: number;
  message: string;
  sourceType: string;
  sourceId: string;
  meta?: Record<string, unknown>;
};

/**
 * Record a gacha spend. `amount` is the positive cost; the ledger stores −amount.
 * Does not enforce affordability (M7-04); may leave the balance negative (R7.3).
 */
export async function recordSpend(
  db: Queryable,
  input: RecordGachaLedgerInput,
): Promise<PointsEventRow> {
  const cost = Math.max(0, Math.floor(input.amount));
  const balance = await getPointsBalance(db);
  const { appliedDelta, balanceAfter } = applyDeltaToBalance(balance, -cost);
  const { rows } = await db.query({
    text: `INSERT INTO points_events (
       kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta
     ) VALUES (
       'spend', 'gacha', $1, $2, $3, $4, $5, NULL, $6::jsonb
     )
     RETURNING
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id`,
    values: [
      appliedDelta,
      balanceAfter,
      input.message,
      input.sourceType,
      input.sourceId,
      JSON.stringify(input.meta ?? {}),
    ],
  });
  return mapEvent(rows[0] as Parameters<typeof mapEvent>[0]);
}

/**
 * Record a manual duplicate refund. `amount` is the positive credit.
 */
export async function recordRefund(
  db: Queryable,
  input: RecordGachaLedgerInput,
): Promise<PointsEventRow> {
  const credit = Math.max(0, Math.floor(input.amount));
  const balance = await getPointsBalance(db);
  const { appliedDelta, balanceAfter } = applyDeltaToBalance(balance, credit);
  const { rows } = await db.query({
    text: `INSERT INTO points_events (
       kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta
     ) VALUES (
       'refund', 'gacha', $1, $2, $3, $4, $5, NULL, $6::jsonb
     )
     RETURNING
       id, created_at, kind, category, amount, balance_after, message,
       source_type, source_id, breakdown, meta, reverses_event_id`,
    values: [
      appliedDelta,
      balanceAfter,
      input.message,
      input.sourceType,
      input.sourceId,
      JSON.stringify(input.meta ?? {}),
    ],
  });
  return mapEvent(rows[0] as Parameters<typeof mapEvent>[0]);
}
