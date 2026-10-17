import { getDemoStatus } from "./demoMode.js";
import { getBackupStatus } from "./backupStatus.js";
import { getBackupJob } from "./backupJob.js";
import {
  formatLocalTime,
  nextDailyLocalTime,
  readDailyBoardSchedule,
} from "./dailyBoardSchedule.js";
import { pool } from "./db.js";
import { getBoardRefresh } from "./boardRefresh.js";
import { HYBRID_SCRAPE_URL_SQL, SCRAPE_DUE_NOW_SQL } from "./scrape.js";
import { getLiveRankBacklogJob } from "./liveRankBacklogJob.js";
import { getRankBatchStatus } from "./rankBatchStatus.js";
import { RANK_PROMPT_VERSION } from "./rankPrompt.js";
import { getRerankQueueSnapshot } from "./rankRerankQueue.js";

const JOBS_LIST_BASE = `
  p.removed_from_board_at IS NULL
  AND (a.id IS NULL OR a.status = 'todo')
`;
const HAS_DESCRIPTION = `p.description_html IS NOT NULL AND btrim(p.description_html) <> ''`;
const BLANK_DESCRIPTION_P = `(p.description_html IS NULL OR btrim(p.description_html) = '')`;
const BLANK_DESCRIPTION = `(description_html IS NULL OR btrim(description_html) = '')`;

function boardRankLimit(): number {
  const n = Number(process.env.BOARD_RANK_LIMIT);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 40;
}

function defaultRankingModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

export type OpsStatusSnapshot = {
  boardRefresh: Awaited<ReturnType<typeof getBoardRefresh>>;
  rankBatch: Awaited<ReturnType<typeof getRankBatchStatus>>;
  rerankQueue: ReturnType<typeof getRerankQueueSnapshot>;
  rankPromptVersion: string;
  boardRankLimit: number;
  rankingModel: string;
  jobCounts: {
    ranked: number;
    unranked: number;
    mismatches: number;
    needsDescription: number;
  };
  unrankedBlank: number;
  descriptions: {
    simplifyBlankTotal: number;
    simplifyDueNow: number;
    simplifyDeferred: number;
    bySource: Array<{ source: string; blank: number }>;
    byScrapeStatus: Array<{ status: string; count: number }>;
  };
  schedule: {
    cronInstalled: boolean;
    cronTimeLocal: string;
    nextBoardRefreshAt: string;
    steps: string[];
    scrapeRetryNote: string;
    scrapeNextRetries: Array<{
      status: string;
      count: number;
      nextRetryAt: string | null;
    }>;
  };
  backup: Awaited<ReturnType<typeof getBackupStatus>>;
  backupJob: Awaited<ReturnType<typeof getBackupJob>>;
  liveRankBacklog: Awaited<ReturnType<typeof getLiveRankBacklogJob>>;
  demo: ReturnType<typeof getDemoStatus>;
};

export async function getOpsStatus(): Promise<OpsStatusSnapshot> {
  const countsResult = await pool.query<{
    ranked: string;
    mismatches: string;
    unranked: string;
    needs_description: string;
    unranked_blank: string;
  }>(
    `SELECT
       COUNT(*) FILTER (
         WHERE ${HAS_DESCRIPTION}
           AND p.ranked_at IS NOT NULL
           AND p.rank_eligible IS NOT FALSE
       )::text AS ranked,
       COUNT(*) FILTER (
         WHERE p.rank_eligible IS FALSE
       )::text AS mismatches,
       COUNT(*) FILTER (
         WHERE ${HAS_DESCRIPTION}
           AND p.ranked_at IS NULL
           AND p.rank_eligible IS NOT FALSE
       )::text AS unranked,
       COUNT(*) FILTER (
         WHERE ${BLANK_DESCRIPTION_P} AND p.rank_eligible IS NOT FALSE
       )::text AS needs_description,
       COUNT(*) FILTER (
         WHERE ${BLANK_DESCRIPTION_P}
           AND p.ranked_at IS NULL
           AND p.rank_eligible IS NOT FALSE
       )::text AS unranked_blank
     FROM postings p
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}`,
  );
  const row = countsResult.rows[0];

  const dueNow = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM postings
     WHERE source = 'simplify'
       AND ${BLANK_DESCRIPTION}
       AND (
         scrape_status IS DISTINCT FROM 'skipped_ats'
         OR ${HYBRID_SCRAPE_URL_SQL}
       )
       AND ${SCRAPE_DUE_NOW_SQL}`,
  );

  const deferred = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM postings
     WHERE source = 'simplify'
       AND ${BLANK_DESCRIPTION}
       AND scraped_at IS NOT NULL
       AND (
         scrape_status IS DISTINCT FROM 'skipped_ats'
         OR ${HYBRID_SCRAPE_URL_SQL}
       )
       AND NOT ${SCRAPE_DUE_NOW_SQL}`,
  );

  const simplifyBlank = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM postings p
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}
       AND p.source = 'simplify'
       AND ${BLANK_DESCRIPTION_P}`,
  );

  const bySource = await pool.query<{ source: string; blank: string }>(
    `SELECT p.source, COUNT(*)::text AS blank
     FROM postings p
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}
       AND ${BLANK_DESCRIPTION_P}
     GROUP BY p.source
     ORDER BY COUNT(*) DESC, p.source`,
  );

  const byScrape = await pool.query<{ status: string; count: string }>(
    `SELECT COALESCE(p.scrape_status, 'never') AS status, COUNT(*)::text AS count
     FROM postings p
     LEFT JOIN applications a ON a.posting_id = p.id
     WHERE ${JOBS_LIST_BASE}
       AND p.source = 'simplify'
       AND ${BLANK_DESCRIPTION_P}
     GROUP BY COALESCE(p.scrape_status, 'never')
     ORDER BY COUNT(*) DESC`,
  );

  const scrapeRetries = await pool.query<{
    status: string;
    count: string;
    next_retry_at: string | null;
  }>(
    `SELECT
       scrape_status AS status,
       COUNT(*)::text AS count,
       MIN(
         CASE
           WHEN scrape_status IN ('timeout', 'error')
             THEN scraped_at + interval '6 hours'
           WHEN scrape_status IN ('empty', 'too_large')
             THEN scraped_at + interval '24 hours'
           WHEN scrape_status = 'blocked'
             THEN scraped_at + interval '48 hours'
           ELSE NULL
         END
       ) AS next_retry_at
     FROM postings
     WHERE source = 'simplify'
       AND ${BLANK_DESCRIPTION}
       AND scraped_at IS NOT NULL
       AND scrape_status IS DISTINCT FROM 'skipped_ats'
       AND scrape_status IS NOT NULL
       AND NOT (
         scrape_status IN ('timeout', 'error')
         AND scraped_at < now() - interval '6 hours'
       )
       AND NOT (
         scrape_status IN ('empty', 'too_large')
         AND scraped_at < now() - interval '24 hours'
         AND COALESCE(source_updated_at, last_seen_at) > scraped_at
       )
       AND NOT (
         scrape_status = 'blocked'
         AND scraped_at < now() - interval '48 hours'
       )
     GROUP BY scrape_status
     ORDER BY MIN(
       CASE
         WHEN scrape_status IN ('timeout', 'error')
           THEN scraped_at + interval '6 hours'
         WHEN scrape_status IN ('empty', 'too_large')
           THEN scraped_at + interval '24 hours'
         WHEN scrape_status = 'blocked'
           THEN scraped_at + interval '48 hours'
         ELSE NULL
       END
     ) NULLS LAST`,
  );

  const cron = await readDailyBoardSchedule();
  const nextBoard = nextDailyLocalTime(cron.hour, cron.minute);
  const limit = boardRankLimit();
  const backup = await getBackupStatus();

  return {
    boardRefresh: await getBoardRefresh(),
    rankBatch: await getRankBatchStatus(),
    rerankQueue: getRerankQueueSnapshot(),
    rankPromptVersion: RANK_PROMPT_VERSION,
    boardRankLimit: limit,
    rankingModel: defaultRankingModel(),
    jobCounts: {
      ranked: Number(row?.ranked ?? 0) || 0,
      unranked: Number(row?.unranked ?? 0) || 0,
      mismatches: Number(row?.mismatches ?? 0) || 0,
      needsDescription: Number(row?.needs_description ?? 0) || 0,
    },
    unrankedBlank: Number(row?.unranked_blank ?? 0) || 0,
    descriptions: {
      simplifyBlankTotal: Number(simplifyBlank.rows[0]?.count ?? 0) || 0,
      simplifyDueNow: Number(dueNow.rows[0]?.count ?? 0) || 0,
      simplifyDeferred: Number(deferred.rows[0]?.count ?? 0) || 0,
      bySource: bySource.rows.map((r) => ({
        source: r.source,
        blank: Number(r.blank) || 0,
      })),
      byScrapeStatus: byScrape.rows.map((r) => ({
        status: r.status,
        count: Number(r.count) || 0,
      })),
    },
    schedule: {
      cronInstalled: cron.installed,
      cronTimeLocal: formatLocalTime(cron.hour, cron.minute),
      nextBoardRefreshAt: nextBoard.toISOString(),
      steps: [
        `pg_dump snapshot to backups/ (${backup.retentionDays}-day retention)`,
        "Ingest company boards (Ashby / Greenhouse / Lever JSON) + Simplify miscellaneous links",
        "Scrape Simplify miscellaneous apply pages for missing descriptions",
        `Light rank up to ${limit} unranked postings only (live OpenAI, ${defaultRankingModel()})`,
      ],
      scrapeRetryNote:
        "Scrape retries: timeout/error after 6h; empty/too_large after 24h if posting updated; blocked after 48h. Ashby/Lever/Greenhouse descriptions come from board JSON at ingest — scrape skipped_ats only for those ATS hosts on Simplify. Oracle/SmartRecruiters hybrid Simplify rows are scraped from apply URLs.",
      scrapeNextRetries: scrapeRetries.rows.map((r) => ({
        status: r.status,
        count: Number(r.count) || 0,
        nextRetryAt: r.next_retry_at,
      })),
    },
    backup,
    backupJob: await getBackupJob(),
    liveRankBacklog: await getLiveRankBacklogJob(),
    demo: getDemoStatus(),
  };
}
