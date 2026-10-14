/**
 * Rewards Pull history (F08 M7-09 / R7.8): banner spends only.
 */
import type { Pool, PoolClient } from "pg";
import type { EarningsRange } from "./pointsLedger.js";
import type { CatCakeEdition } from "./catCakeCatalog.js";

type Queryable = Pool | PoolClient;

export type PullHistoryResult = {
  flavorId: string;
  edition: CatCakeEdition;
  isNew: boolean;
  copiesAfter: number;
  pityAt: number;
  viaHardPity: boolean;
  /** 1-based nth pull of this variant across all time (survives refunds). */
  timesPulled: number;
  /** Cost share for this single cake (session cost / count). */
  seedsSpent: number;
};

export type PullHistorySession = {
  id: string;
  createdAt: string;
  count: 1 | 10;
  cost: number;
  /** Running lifetime spend (absolute seeds spent) after this session. */
  lifetimeSpendAfter: number;
  results: PullHistoryResult[];
};

export type PullHistorySnapshot = {
  range: EarningsRange;
  from: string | null;
  to: string | null;
  /** Sum of |amount| for all gacha spends ever. */
  lifetimeSpend: number;
  /** Spend inside the selected range. */
  rangeSpend: number;
  sessions: PullHistorySession[];
};

type MetaResult = {
  flavorId?: unknown;
  edition?: unknown;
  isNew?: unknown;
  copiesAfter?: unknown;
  pityAt?: unknown;
  viaHardPity?: unknown;
  timesPulled?: unknown;
};

function asEdition(value: unknown): CatCakeEdition | null {
  return value === "classic" || value === "collector" ? value : null;
}

function parseResults(
  raw: unknown,
  cost: number,
  count: number,
): PullHistoryResult[] {
  if (!Array.isArray(raw)) return [];
  const share = count > 0 ? Math.round(cost / count) : 0;
  const out: PullHistoryResult[] = [];
  for (const item of raw) {
    const r = item as MetaResult;
    const edition = asEdition(r.edition);
    if (typeof r.flavorId !== "string" || !edition) continue;
    out.push({
      flavorId: r.flavorId,
      edition,
      isNew: Boolean(r.isNew),
      copiesAfter: Number(r.copiesAfter) || 0,
      pityAt: Number(r.pityAt) || 0,
      viaHardPity: Boolean(r.viaHardPity),
      timesPulled:
        typeof r.timesPulled === "number" && Number.isFinite(r.timesPulled)
          ? r.timesPulled
          : 0,
      seedsSpent: share,
    });
  }
  return out;
}

/**
 * Fill missing timesPulled by walking all gacha pulls oldest→newest.
 * Mutates `sessions` (which may be a filtered subset) using a full chrono pass.
 */
async function attachTimesPulled(
  db: Queryable,
  sessionsNewestFirst: PullHistorySession[],
): Promise<void> {
  const needsBackfill = sessionsNewestFirst.some((s) =>
    s.results.some((r) => r.timesPulled <= 0),
  );
  if (!needsBackfill) return;

  const { rows } = await db.query<{
    id: string;
    meta: { results?: unknown };
  }>(
    `SELECT id, meta
     FROM points_events
     WHERE kind = 'spend' AND source_type = 'gacha_pull'
     ORDER BY created_at ASC, id ASC`,
  );

  const counts = new Map<string, number>();
  const byId = new Map<string, number[]>();
  for (const row of rows) {
    const results = Array.isArray(row.meta?.results) ? row.meta.results : [];
    const times: number[] = [];
    for (const item of results) {
      const r = item as MetaResult;
      const edition = asEdition(r.edition);
      if (typeof r.flavorId !== "string" || !edition) {
        times.push(0);
        continue;
      }
      const key = `${r.flavorId}:${edition}`;
      const n = (counts.get(key) ?? 0) + 1;
      counts.set(key, n);
      times.push(n);
    }
    byId.set(row.id, times);
  }

  for (const session of sessionsNewestFirst) {
    const times = byId.get(session.id);
    if (!times) continue;
    session.results.forEach((r, i) => {
      if (r.timesPulled <= 0 && times[i] != null) r.timesPulled = times[i]!;
    });
  }
}

export async function getLifetimeSpend(db: Queryable): Promise<number> {
  const { rows } = await db.query<{ total: string }>(
    `SELECT COALESCE(SUM(-amount), 0)::text AS total
     FROM points_events
     WHERE kind = 'spend'`,
  );
  return Number(rows[0]?.total ?? 0);
}

export async function getPullHistorySnapshot(
  db: Queryable,
  opts: {
    range: EarningsRange;
    from: Date | null;
    to: Date | null;
    limit?: number;
  },
): Promise<PullHistorySnapshot> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 300);
  const { from, to } = opts;
  const lifetimeSpend = await getLifetimeSpend(db);

  const { rows: rangeRow } = await db.query<{ total: string }>(
    `SELECT COALESCE(SUM(-amount), 0)::text AS total
     FROM points_events
     WHERE kind = 'spend'
       AND ($1::timestamptz IS NULL OR created_at >= $1)
       AND ($2::timestamptz IS NULL OR created_at < $2)`,
    [from, to],
  );
  const rangeSpend = Number(rangeRow[0]?.total ?? 0);

  const { rows } = await db.query<{
    id: string;
    created_at: Date | string;
    amount: number;
    meta: Record<string, unknown>;
    lifetime_spend_after: number | string;
  }>(
    {
      text: `WITH spends AS (
         SELECT
           id, created_at, amount, meta,
           SUM(-amount) OVER (ORDER BY created_at ASC, id ASC)::float8 AS lifetime_spend_after
         FROM points_events
         WHERE kind = 'spend' AND source_type = 'gacha_pull'
       )
       SELECT id, created_at, amount, meta, lifetime_spend_after
       FROM spends
       WHERE ($1::timestamptz IS NULL OR created_at >= $1)
         AND ($2::timestamptz IS NULL OR created_at < $2)
       ORDER BY created_at DESC, id DESC
       LIMIT $3`,
      values: [from, to, limit],
    },
  );

  const sessions: PullHistorySession[] = rows.map((row) => {
    const cost = Math.abs(Number(row.amount));
    const pullsRaw = row.meta?.pulls;
    const count: 1 | 10 =
      pullsRaw === 10 || pullsRaw === "10"
        ? 10
        : Array.isArray(row.meta?.results) && row.meta.results.length === 10
          ? 10
          : 1;
    const createdAt =
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : String(row.created_at);
    return {
      id: row.id,
      createdAt,
      count,
      cost,
      lifetimeSpendAfter: Number(row.lifetime_spend_after),
      results: parseResults(row.meta?.results, cost, count),
    };
  });

  await attachTimesPulled(db, sessions);

  return {
    range: opts.range,
    from: from ? from.toISOString() : null,
    to: to ? to.toISOString() : null,
    lifetimeSpend,
    rangeSpend,
    sessions,
  };
}
