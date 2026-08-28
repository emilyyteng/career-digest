import path from "node:path";
import { fileURLToPath } from "node:url";
import type { PoolClient } from "pg";
import { migrate, pool } from "./db.js";

type DuplicatePair = {
  simplify_id: string;
  canonical_id: string;
  match_key: string;
  source: "greenhouse" | "lever" | "ashby";
};

type ApplicationRow = {
  id: string;
  posting_id: string | null;
  notes: string | null;
  status: string;
};

type FeedbackRow = {
  id: string;
  posting_id: string;
  kind: string;
  note: string | null;
};

/** Greenhouse job id embedded in Simplify misc URLs or embed links. */
export function extractGreenhouseJobId(url: string): string | null {
  const ghJid = url.match(/(?:^|[?&])gh_jid=(\d+)/i);
  if (ghJid?.[1]) return ghJid[1];
  if (/boards\.greenhouse\.io\/embed\/job_app/i.test(url)) {
    const token = url.match(/[?&]token=(\d+)/i);
    if (token?.[1]) return token[1];
  }
  return null;
}

/** Lever posting uuid from a jobs.lever.co apply URL. */
export function extractLeverPostingId(url: string): string | null {
  const direct = url.match(/jobs\.lever\.co\/[^/?#]+\/([^/?#]+)/i);
  if (direct?.[1]) return direct[1];
  const uuid = url.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i,
  );
  return uuid?.[1] ?? null;
}

/** Ashby posting id from a jobs.ashbyhq.com URL. */
export function extractAshbyPostingId(url: string): string | null {
  const direct = url.match(/jobs\.ashbyhq\.com\/[^/?#]+\/([^/?#]+)/i);
  if (direct?.[1]) return decodeURIComponent(direct[1]);
  const uuid = url.match(
    /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/i,
  );
  return uuid?.[1] ?? null;
}

async function loadGreenhousePairs(client: PoolClient): Promise<DuplicatePair[]> {
  const { rows } = await client.query<DuplicatePair>(
    `SELECT
       s.id AS simplify_id,
       g.id AS canonical_id,
       g.external_id AS match_key,
       'greenhouse'::text AS source
     FROM postings s
     JOIN postings g ON g.source = 'greenhouse'
     WHERE s.source = 'simplify'
       AND s.removed_from_board_at IS NULL
       AND g.removed_from_board_at IS NULL
       AND (
         g.external_id = substring(s.url from '(?:^|[?&])gh_jid=([0-9]+)')
         OR g.external_id = substring(s.url from 'boards\\.greenhouse\\.io/[^/]+/jobs/([0-9]+)')
         OR g.external_id = substring(s.url from 'job-boards\\.greenhouse\\.io/[^/]+/jobs/([0-9]+)')
         OR (
           s.url ~ 'boards\\.greenhouse\\.io/embed'
           AND g.external_id = substring(s.url from '[?&]token=([0-9]+)')
         )
       )`,
  );
  return rows;
}

async function loadLeverPairs(client: PoolClient): Promise<DuplicatePair[]> {
  const { rows } = await client.query<DuplicatePair>(
    `SELECT
       s.id AS simplify_id,
       l.id AS canonical_id,
       l.external_id AS match_key,
       'lever'::text AS source
     FROM postings s
     JOIN postings l ON l.source = 'lever'
     WHERE s.source = 'simplify'
       AND s.removed_from_board_at IS NULL
       AND l.removed_from_board_at IS NULL
       AND (
         substring(s.url from 'jobs\\.lever\\.co/[^/]+/([^/?#]+)') = l.external_id
         OR (
           s.url ~* l.external_id
           AND l.external_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         )
       )`,
  );
  return rows;
}

async function loadAshbyPairs(client: PoolClient): Promise<DuplicatePair[]> {
  const { rows } = await client.query<DuplicatePair>(
    `SELECT
       s.id AS simplify_id,
       a.id AS canonical_id,
       a.external_id AS match_key,
       'ashby'::text AS source
     FROM postings s
     JOIN postings a ON a.source = 'ashby'
     WHERE s.source = 'simplify'
       AND s.removed_from_board_at IS NULL
       AND a.removed_from_board_at IS NULL
       AND (
         substring(s.url from 'jobs\\.ashbyhq\\.com/[^/]+/([^/?#]+)') = a.external_id
         OR (
           s.url ~* a.external_id
           AND a.external_id ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
         )
       )`,
  );
  return rows;
}

function mergeNotes(a: string | null, b: string | null): string | null {
  const left = a?.trim() ?? "";
  const right = b?.trim() ?? "";
  if (!left) return right || null;
  if (!right) return left;
  if (left.includes(right)) return left;
  if (right.includes(left)) return right;
  return `${left}\n\n${right}`;
}

async function repointApplication(
  client: PoolClient,
  simplifyId: string,
  canonicalId: string,
): Promise<"moved" | "merged" | "none"> {
  const apps = await client.query<ApplicationRow>(
    `SELECT id, posting_id, notes, status
     FROM applications
     WHERE posting_id = $1 OR posting_id = $2`,
    [simplifyId, canonicalId],
  );
  const simplifyApp = apps.rows.find((row) => row.posting_id === simplifyId);
  const canonicalApp = apps.rows.find((row) => row.posting_id === canonicalId);

  if (!simplifyApp) return "none";
  if (!canonicalApp) {
    await client.query(`UPDATE applications SET posting_id = $2 WHERE id = $1`, [
      simplifyApp.id,
      canonicalId,
    ]);
    return "moved";
  }

  const mergedNotes = mergeNotes(canonicalApp.notes, simplifyApp.notes);
  await client.query(
    `UPDATE applications
     SET notes = $2,
         updated_at = now()
     WHERE id = $1`,
    [canonicalApp.id, mergedNotes],
  );
  await client.query(`DELETE FROM applications WHERE id = $1`, [simplifyApp.id]);
  return "merged";
}

async function repointFeedback(
  client: PoolClient,
  simplifyId: string,
  canonicalId: string,
): Promise<void> {
  const feedback = await client.query<FeedbackRow>(
    `SELECT id, posting_id, kind, note
     FROM posting_feedback
     WHERE posting_id = $1 OR posting_id = $2`,
    [simplifyId, canonicalId],
  );
  const simplifyFb = feedback.rows.find((row) => row.posting_id === simplifyId);
  const canonicalFb = feedback.rows.find((row) => row.posting_id === canonicalId);
  if (!simplifyFb) return;
  if (!canonicalFb) {
    await client.query(`UPDATE posting_feedback SET posting_id = $2 WHERE id = $1`, [
      simplifyFb.id,
      canonicalId,
    ]);
    return;
  }
  if (!canonicalFb.note?.trim() && simplifyFb.note?.trim()) {
    await client.query(`UPDATE posting_feedback SET note = $2 WHERE id = $1`, [
      canonicalFb.id,
      simplifyFb.note,
    ]);
  }
  await client.query(`DELETE FROM posting_feedback WHERE id = $1`, [simplifyFb.id]);
}

async function absorbRanking(
  client: PoolClient,
  simplifyId: string,
  canonicalId: string,
): Promise<void> {
  await client.query(
    `UPDATE postings c
     SET rank_score = COALESCE(c.rank_score, s.rank_score),
         rank_eligible = COALESCE(c.rank_eligible, s.rank_eligible),
         rank_reason = COALESCE(c.rank_reason, s.rank_reason),
         rank_location_fit = COALESCE(c.rank_location_fit, s.rank_location_fit),
         ranked_at = COALESCE(c.ranked_at, s.ranked_at),
         rank_model = COALESCE(c.rank_model, s.rank_model),
         rank_prompt_version = COALESCE(c.rank_prompt_version, s.rank_prompt_version)
     FROM postings s
     WHERE c.id = $1
       AND s.id = $2
       AND c.ranked_at IS NULL
       AND s.ranked_at IS NOT NULL`,
    [canonicalId, simplifyId],
  );
}

export type MergeSourceStats = {
  pairs: number;
  deletedSimplify: number;
};

export type MergeDuplicateResult = {
  greenhouse: MergeSourceStats;
  lever: MergeSourceStats;
  ashby: MergeSourceStats;
  applicationsMoved: number;
  applicationsMerged: number;
};

async function mergePairs(
  client: PoolClient,
  pairs: DuplicatePair[],
  stats: MergeSourceStats,
  applicationsMoved: { count: number },
  applicationsMerged: { count: number },
  seenSimplify: Set<string>,
): Promise<void> {
  for (const pair of pairs) {
    if (seenSimplify.has(pair.simplify_id)) continue;
    seenSimplify.add(pair.simplify_id);
    stats.pairs += 1;

    try {
      await client.query("BEGIN");
      const appResult = await repointApplication(
        client,
        pair.simplify_id,
        pair.canonical_id,
      );
      if (appResult === "moved") applicationsMoved.count += 1;
      if (appResult === "merged") applicationsMerged.count += 1;
      await repointFeedback(client, pair.simplify_id, pair.canonical_id);
      await absorbRanking(client, pair.simplify_id, pair.canonical_id);
      const deleted = await client.query(`DELETE FROM postings WHERE id = $1`, [
        pair.simplify_id,
      ]);
      if ((deleted.rowCount ?? 0) > 0) stats.deletedSimplify += 1;
      await client.query("COMMIT");
    } catch (error) {
      await client.query("ROLLBACK");
      const message = error instanceof Error ? error.message : String(error);
      console.error(
        `merge duplicate failed ${pair.source}=${pair.match_key} simplify=${pair.simplify_id}: ${message}`,
      );
    }
  }
}

export async function runMergeDuplicatePostings(): Promise<MergeDuplicateResult> {
  await migrate();
  const client = await pool.connect();
  const greenhouse: MergeSourceStats = { pairs: 0, deletedSimplify: 0 };
  const lever: MergeSourceStats = { pairs: 0, deletedSimplify: 0 };
  const ashby: MergeSourceStats = { pairs: 0, deletedSimplify: 0 };
  const applicationsMoved = { count: 0 };
  const applicationsMerged = { count: 0 };
  const seenSimplify = new Set<string>();

  try {
    await mergePairs(
      client,
      await loadGreenhousePairs(client),
      greenhouse,
      applicationsMoved,
      applicationsMerged,
      seenSimplify,
    );
    await mergePairs(
      client,
      await loadLeverPairs(client),
      lever,
      applicationsMoved,
      applicationsMerged,
      seenSimplify,
    );
    await mergePairs(
      client,
      await loadAshbyPairs(client),
      ashby,
      applicationsMoved,
      applicationsMerged,
      seenSimplify,
    );
  } finally {
    client.release();
  }

  return {
    greenhouse,
    lever,
    ashby,
    applicationsMoved: applicationsMoved.count,
    applicationsMerged: applicationsMerged.count,
  };
}

const isMain =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    const result = await runMergeDuplicatePostings();
    console.log(
      `Done. greenhouse=${result.greenhouse.deletedSimplify}/${result.greenhouse.pairs} lever=${result.lever.deletedSimplify}/${result.lever.pairs} ashby=${result.ashby.deletedSimplify}/${result.ashby.pairs} simplify rows removed; moved ${result.applicationsMoved} application(s), merged ${result.applicationsMerged} application(s).`,
    );
  } finally {
    await pool.end();
  }
}
