import path from "node:path";
import { fileURLToPath } from "node:url";
import { isMiscellaneousApplyUrl } from "./adapters/simplify.js";
import { migrate, pool } from "./db.js";
import { descriptionFromHtml } from "./descriptionFromHtml.js";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const TIMEOUT_MS = 12_000;
const MAX_BYTES = 1_500_000;
const CONCURRENCY = 6;
const HOST_GAP_MS = 450;

type ScrapeStatus =
  | "ok"
  | "empty"
  | "blocked"
  | "timeout"
  | "error"
  | "too_large"
  | "skipped_ats";

type BlankPosting = {
  id: string;
  url: string;
};

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return "";
  }
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

class HostGate {
  private tails = new Map<string, Promise<void>>();

  schedule<T>(host: string, work: () => Promise<T>): Promise<T> {
    const key = host || "_";
    const previous = this.tails.get(key) ?? Promise.resolve();
    const run = previous.then(work, work);
    this.tails.set(
      key,
      run.then(
        () => wait(HOST_GAP_MS),
        () => wait(HOST_GAP_MS),
      ),
    );
    return run;
  }
}

async function fetchPage(
  url: string,
): Promise<{ status: ScrapeStatus; html?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      redirect: "follow",
      headers: {
        Accept: "text/html,application/xhtml+xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "User-Agent": USER_AGENT,
      },
    });
    if (response.status === 401 || response.status === 403 || response.status === 429) {
      return { status: "blocked" };
    }
    if (!response.ok) return { status: "error" };

    const contentType = (response.headers.get("content-type") ?? "").toLowerCase();
    if (contentType.includes("pdf")) return { status: "empty" };
    const length = Number(response.headers.get("content-length"));
    if (Number.isFinite(length) && length > MAX_BYTES) return { status: "too_large" };

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > MAX_BYTES) return { status: "too_large" };
    const html = new TextDecoder("utf-8").decode(buffer);
    if (!html.trim()) return { status: "empty" };
    return { status: "ok", html };
  } catch (error) {
    const name = error instanceof Error ? error.name : "";
    if (name === "AbortError" || name === "TimeoutError") return { status: "timeout" };
    return { status: "error" };
  } finally {
    clearTimeout(timer);
  }
}

async function scrapeOne(
  posting: BlankPosting,
  gate: HostGate,
): Promise<ScrapeStatus> {
  if (!isMiscellaneousApplyUrl(posting.url)) return "skipped_ats";
  const host = hostnameOf(posting.url);
  if (!host) return "error";

  const fetched = await gate.schedule(host, () => fetchPage(posting.url));
  if (fetched.status !== "ok" || !fetched.html) {
    return fetched.status === "ok" ? "empty" : fetched.status;
  }

  let html: string | null = null;
  try {
    html = descriptionFromHtml(fetched.html, posting.url);
  } catch {
    return "error";
  }
  if (!html) return "empty";

  await pool.query(
    `UPDATE postings
     SET description_html = $2,
         scrape_status = 'ok',
         scraped_at = now()
     WHERE id = $1
       AND (description_html IS NULL OR btrim(description_html) = '')`,
    [posting.id, html],
  );
  return "ok";
}

async function markFailure(id: string, status: ScrapeStatus): Promise<void> {
  await pool.query(
    `UPDATE postings
     SET scrape_status = $2,
         scraped_at = now()
     WHERE id = $1
       AND (description_html IS NULL OR btrim(description_html) = '')`,
    [id, status],
  );
}

async function mapPool(
  items: BlankPosting[],
  worker: (item: BlankPosting) => Promise<ScrapeStatus>,
): Promise<ScrapeStatus[]> {
  const results: ScrapeStatus[] = new Array(items.length);
  let next = 0;
  async function run(): Promise<void> {
    while (true) {
      const index = next;
      next += 1;
      if (index >= items.length) return;
      results[index] = await worker(items[index]);
    }
  }
  const size = Math.min(CONCURRENCY, items.length);
  await Promise.all(Array.from({ length: size }, () => run()));
  return results;
}

export async function runScrape(): Promise<void> {
  await migrate();
  // Never-scraped blanks always retry. Failed attempts back off so board refresh
  // does not hammer blocked hosts every run. skipped_ats never yields a JD here.
  const { rows } = await pool.query<BlankPosting>(
    `SELECT id, url
     FROM postings
     WHERE source = 'simplify'
       AND (description_html IS NULL OR btrim(description_html) = '')
       AND (scrape_status IS DISTINCT FROM 'skipped_ats')
       AND (
         scraped_at IS NULL
         OR scrape_status IS NULL
         OR (
           scrape_status IN ('timeout', 'error')
           AND scraped_at < now() - interval '6 hours'
         )
         OR (
           scrape_status IN ('empty', 'too_large')
           AND scraped_at < now() - interval '24 hours'
         )
         OR (
           scrape_status = 'blocked'
           AND scraped_at < now() - interval '48 hours'
         )
       )
     ORDER BY last_seen_at DESC`,
  );

  const deferred = await pool.query<{ count: string }>(
    `SELECT COUNT(*)::text AS count
     FROM postings
     WHERE source = 'simplify'
       AND (description_html IS NULL OR btrim(description_html) = '')
       AND scraped_at IS NOT NULL
       AND scrape_status IS DISTINCT FROM 'skipped_ats'
       AND NOT (
         (scrape_status IN ('timeout', 'error') AND scraped_at < now() - interval '6 hours')
         OR (scrape_status IN ('empty', 'too_large') AND scraped_at < now() - interval '24 hours')
         OR (scrape_status = 'blocked' AND scraped_at < now() - interval '48 hours')
       )`,
  );
  const deferredCount = Number(deferred.rows[0]?.count ?? 0) || 0;

  console.log(
    `Simplify blanks due now: ${rows.length}${deferredCount ? ` (${deferredCount} deferred by retry backoff)` : ""}`,
  );
  const counts: Record<ScrapeStatus, number> = {
    ok: 0,
    empty: 0,
    blocked: 0,
    timeout: 0,
    error: 0,
    too_large: 0,
    skipped_ats: 0,
  };
  const gate = new HostGate();
  let done = 0;

  await mapPool(rows, async (posting) => {
    const status = await scrapeOne(posting, gate);
    if (status !== "ok") await markFailure(posting.id, status);
    counts[status] += 1;
    done += 1;
    if (done % 25 === 0 || done === rows.length) {
      console.log(
        `scrape ${done}/${rows.length} ok=${counts.ok} empty=${counts.empty} blocked=${counts.blocked} timeout=${counts.timeout} error=${counts.error} skipped_ats=${counts.skipped_ats} too_large=${counts.too_large}`,
      );
    }
    return status;
  });

  console.log(
    `Done. Filled ${counts.ok} of ${rows.length}. empty=${counts.empty} blocked=${counts.blocked} timeout=${counts.timeout} error=${counts.error} skipped_ats=${counts.skipped_ats} too_large=${counts.too_large}`,
  );
}

const isMain =
  process.argv[1] != null &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isMain) {
  try {
    await runScrape();
  } finally {
    await pool.end();
  }
}
