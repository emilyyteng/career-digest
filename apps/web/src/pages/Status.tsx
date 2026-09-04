import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  getOpsStatus,
  startBoardRefresh,
  startBackup,
  startLiveRankBacklog,
  type OpsStatus,
} from "../api";
import { demoGatedTitle, useDemoMode } from "../demoMode";
import { formatStepWhen } from "../formatDate";

function StatusBadge({ tone, children }: { tone: string; children: string }) {
  return <span className={`badge ops-status-badge ops-status-${tone}`}>{children}</span>;
}

function formatWhen(value: string | null | undefined): string {
  if (!value) return "—";
  return formatStepWhen(value) ?? value;
}

function formatBackupSize(bytes: number | null): string | null {
  if (bytes == null) return null;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

const SCRAPE_STATUS_HINT: Record<string, string> = {
  never: "Not scraped yet — will try on next board refresh.",
  empty: "Page fetched but no description extracted (may be genuinely empty).",
  blocked: "Site blocked the scraper (401/403/429). Retries after 48h.",
  timeout: "Request timed out. Retries after 6h.",
  error: "Fetch or parse error. Retries after 6h.",
  too_large: "Page too large. Retries if posting updates after 24h.",
  skipped_ats:
    "Simplify URL points to Ashby/Greenhouse/Lever — scrape skipped; those boards get descriptions from ingest JSON.",
  ok: "Filled successfully (should not appear among blanks).",
};

export default function Status() {
  const [ops, setOps] = useState<OpsStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshBusy, setRefreshBusy] = useState(false);
  const [backupBusy, setBackupBusy] = useState(false);
  const [rankBacklogBusy, setRankBacklogBusy] = useState(false);
  const wasRefreshing = useRef(false);
  const demo = useDemoMode();
  const demoGateTitle = demoGatedTitle(demo);
  async function load() {
    const data = await getOpsStatus();
    setOps(data);
    return data;
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    if (ops?.boardRefresh.status !== "running") return;
    wasRefreshing.current = true;
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [ops?.boardRefresh.status]);

  useEffect(() => {
    const rankActive =
      ops?.rankBatch.status === "running" || ops?.rankBatch.status === "ready";
    const refreshActive = ops?.boardRefresh.status === "running";
    const rerankActive = ops?.rerankQueue.items.some(
      (item) => item.status === "queued" || item.status === "running",
    );
    const backupActive = ops?.backupJob.status === "running";
    const liveBacklogActive = ops?.liveRankBacklog.status === "running";
    if (!rankActive && !refreshActive && !rerankActive && !backupActive && !liveBacklogActive) {
      return;
    }
    const ms =
      rankActive || refreshActive || liveBacklogActive ? 2500 : backupActive ? 2000 : 8000;
    const timer = window.setInterval(() => {
      load().catch(() => undefined);
    }, ms);
    return () => window.clearInterval(timer);
  }, [
    ops?.boardRefresh.status,
    ops?.rankBatch.status,
    ops?.rerankQueue.items,
    ops?.backupJob.status,
    ops?.liveRankBacklog.status,
  ]);

  async function triggerRefresh() {
    setRefreshBusy(true);
    setError(null);
    try {
      await startBoardRefresh();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start refresh");
    } finally {
      setRefreshBusy(false);
    }
  }

  async function triggerBackup() {
    setBackupBusy(true);
    setError(null);
    try {
      await startBackup();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start backup");
    } finally {
      setBackupBusy(false);
    }
  }

  async function triggerRankBacklog() {
    setRankBacklogBusy(true);
    setError(null);
    try {
      await startLiveRankBacklog();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start ranking");
    } finally {
      setRankBacklogBusy(false);
    }
  }

  if (error && !ops) return <p className="error">{error}</p>;
  if (!ops) return <p className="muted">Loading status…</p>;

  const board = ops.boardRefresh;
  const rank = ops.rankBatch;
  const backupJob = ops.backupJob;
  const liveBacklog = ops.liveRankBacklog;
  const liveBacklogActive = liveBacklog.status === "running";
  const rankBatchActive = rank.status === "running" || rank.status === "ready";
  const rankActive = rankBatchActive || liveBacklogActive;
  const rankModel = rank.model ?? ops.rankingModel;
  const rankFinished = rank.finishedAt ?? board.lastOkAt;
  const rankLastOk = rank.lastOkAt ?? board.lastOkAt;

  return (
    <section className="ops-page">
      <h2 className="ops-page-title">Pipeline status</h2>
      <p className="muted ops-page-lede">
        Background ingest, scrape, and ranking. Daily cron runs board refresh; light rank
        processes up to {ops.boardRankLimit} postings per run.
      </p>
      {error && <p className="error">{error}</p>}

      <div className="ops-grid">
        <article className="card ops-card ops-card-action">
          <h3 className="ops-card-heading">Board refresh</h3>
          <div className="ops-card-body">
            <p className="ops-card-status">
              <StatusBadge
                tone={
                  board.status === "error"
                    ? "error"
                    : board.status === "running"
                      ? "active"
                      : board.status === "ok"
                        ? "ok"
                        : "idle"
                }
              >
                {board.status === "running"
                  ? `Running · ${board.phase ?? "…"}`
                  : board.status}
              </StatusBadge>
            </p>
            <dl className="ops-meta">
              <dt>Last finished</dt>
              <dd>{formatWhen(board.finishedAt)}</dd>
              <dt>Last success</dt>
              <dd>{formatWhen(board.lastOkAt)}</dd>
              {board.startedAt && board.status === "running" && (
                <>
                  <dt>Started</dt>
                  <dd>{formatWhen(board.startedAt)}</dd>
                </>
              )}
              {board.lastRun && board.lastRun.leftBoard > 0 && (
                <>
                  <dt>Left board</dt>
                  <dd>
                    −{board.lastRun.leftBoard}
                    {board.lastRun.leftBoardRetained > 0 && (
                      <span className="muted">
                        {" "}
                        ({board.lastRun.leftBoardDeleted} removed ·{" "}
                        {board.lastRun.leftBoardRetained} kept for application)
                      </span>
                    )}
                  </dd>
                </>
              )}
              {board.lastRun && board.lastRun.mergeDeduped > 0 && (
                <>
                  <dt>Deduped</dt>
                  <dd>−{board.lastRun.mergeDeduped} duplicate Simplify rows</dd>
                </>
              )}
              {board.lastRun && board.lastRun.rankedProcessed > 0 && (
                <>
                  <dt>Light rank</dt>
                  <dd>{board.lastRun.rankedProcessed} unranked processed</dd>
                </>
              )}
            </dl>
            {board.error && <p className="error ops-card-error">{board.error}</p>}
            <p className="muted ops-card-hint">
              Ingest → scrape Simplify blanks → rank up to {ops.boardRankLimit} unranked
              postings (live API, not batch).
            </p>
          </div>
          <div className="ops-card-actions">
            <button
              type="button"
              className="secondary"
              disabled={refreshBusy || board.status === "running" || demo.enabled}
              title={demoGateTitle}
              onClick={() => void triggerRefresh()}
            >
              {board.status === "running" ? "Refreshing…" : "Run board refresh"}
            </button>
          </div>
        </article>

        <article className="card ops-card ops-card-action">
          <h3 className="ops-card-heading">OpenAI ranking</h3>
          <div className="ops-card-body">
            <p className="ops-card-status">
              <StatusBadge
                tone={
                  liveBacklog.status === "error" || rank.status === "error"
                    ? "error"
                    : rankActive
                      ? "active"
                      : liveBacklog.status === "ok" || rank.status === "ok"
                        ? "ok"
                        : "idle"
                }
              >
                {liveBacklogActive
                  ? "Running · live backlog"
                  : rankBatchActive
                    ? rank.openaiStatus ?? rank.status
                    : liveBacklog.status === "ok"
                      ? `Done · ${liveBacklog.rankedOk ?? 0} ranked`
                      : rank.status}
              </StatusBadge>
            </p>
            <dl className="ops-meta">
              <dt>Prompt version</dt>
              <dd>{ops.rankPromptVersion}</dd>
              <dt>Model</dt>
              <dd>{rankModel}</dd>
              <dt>Last finished</dt>
              <dd>{formatWhen(rankFinished)}</dd>
              <dt>Last success</dt>
              <dd>{formatWhen(rankLastOk)}</dd>
              {rank.total != null && rankBatchActive && (
                <>
                  <dt>Progress</dt>
                  <dd>
                    {rank.completed ?? 0}/{rank.total}
                    {rank.failed ? ` (${rank.failed} failed)` : ""}
                  </dd>
                </>
              )}
              {liveBacklog.rankedOk != null && liveBacklog.status === "ok" && (
                <>
                  <dt>Last backlog run</dt>
                  <dd>
                    {liveBacklog.rankedOk} ranked
                    {liveBacklog.rankedError ? `, ${liveBacklog.rankedError} failed` : ""}
                    {liveBacklog.halted ? " (stopped early)" : ""}
                  </dd>
                </>
              )}
              {rank.appliedOk != null && !rankActive && liveBacklog.status !== "ok" && (
                <>
                  <dt>Applied scores</dt>
                  <dd>
                    {rank.appliedOk} ok
                    {rank.appliedError ? `, ${rank.appliedError} failed` : ""}
                  </dd>
                </>
              )}
            </dl>
            {liveBacklog.error && <p className="error ops-card-error">{liveBacklog.error}</p>}
            {rank.error && !liveBacklog.error && <p className="error ops-card-error">{rank.error}</p>}
            <p className="muted ops-card-hint">
              Rank all unranked postings with descriptions, then refresh outdated scores — live API,
              not batch.
            </p>
          </div>
          <div className="ops-card-actions">
            <button
              type="button"
              className="secondary"
              disabled={
                rankBacklogBusy ||
                liveBacklogActive ||
                rankBatchActive ||
                board.status === "running" ||
                demo.enabled
              }
              title={demoGateTitle}
              onClick={() => void triggerRankBacklog()}
            >
              {liveBacklogActive ? "Ranking backlog…" : "Rank full backlog"}
            </button>
          </div>
        </article>

        <article className="card ops-card ops-card-action">
          <h3 className="ops-card-heading">Jobs board</h3>
          <div className="ops-card-body">
            <p className="ops-card-status">
              {backupJob.status !== "idle" ? (
                <StatusBadge
                  tone={
                    backupJob.status === "error"
                      ? "error"
                      : backupJob.status === "running"
                        ? "active"
                        : "ok"
                  }
                >
                  {backupJob.status === "running"
                    ? "Running · backup"
                    : backupJob.status === "ok"
                      ? "Backup succeeded"
                      : "Backup failed"}
                </StatusBadge>
              ) : (
                <StatusBadge tone="idle">Ready</StatusBadge>
              )}
            </p>
            <dl className="ops-meta ops-meta-counts">
              <dt>
                <Link to="/jobs">Ranked</Link>
              </dt>
              <dd>{ops.jobCounts.ranked}</dd>
              <dt>
                <Link to="/jobs?view=unranked">Unranked</Link>
              </dt>
              <dd>{ops.jobCounts.unranked}</dd>
              <dt>
                <Link to="/jobs?view=mismatches">Mismatches</Link>
              </dt>
              <dd>{ops.jobCounts.mismatches}</dd>
              <dt>
                <Link to="/jobs?view=needs-description">Needs description</Link>
              </dt>
              <dd>{ops.jobCounts.needsDescription}</dd>
            </dl>
            {ops.jobCounts.unranked > 0 && (
              <p className="muted ops-card-hint">
                {ops.jobCounts.unranked} unranked with descriptions — about{" "}
                {Math.ceil(ops.jobCounts.unranked / ops.boardRankLimit)} daily refresh
                run{Math.ceil(ops.jobCounts.unranked / ops.boardRankLimit) === 1 ? "" : "s"} at
                {ops.boardRankLimit}/run.
                {ops.unrankedBlank > 0 && (
                  <> {ops.unrankedBlank} unranked are waiting on descriptions.</>
                )}
              </p>
            )}
            {backupJob.error && <p className="error ops-card-error">{backupJob.error}</p>}
          </div>
          <div className="ops-card-actions">
            <button
              type="button"
              className="secondary"
              disabled={backupBusy || backupJob.status === "running"}
              onClick={() => void triggerBackup()}
            >
              {backupJob.status === "running" ? "Backing up…" : "Backup data"}
            </button>
          </div>
        </article>

        <article className="card ops-card ops-card-wide">
          <h3 className="ops-card-heading">Empty descriptions</h3>
          <p className="muted ops-card-hint">
            Ranking skips blank job descriptions. Simplify links are scraped automatically on
            board refresh; Ashby postings usually have descriptions from ingest.
          </p>
          <dl className="ops-meta">
            <dt>Simplify blanks on board</dt>
            <dd>{ops.descriptions.simplifyBlankTotal}</dd>
            <dt>Due for scrape now</dt>
            <dd>{ops.descriptions.simplifyDueNow}</dd>
            <dt>Deferred (retry backoff)</dt>
            <dd>{ops.descriptions.simplifyDeferred}</dd>
          </dl>
          {ops.descriptions.bySource.length > 0 && (
            <div className="ops-subsection">
              <h4>Blanks by source</h4>
              <ul className="ops-list">
                {ops.descriptions.bySource.map((row) => (
                  <li key={row.source}>
                    <span className="ops-list-label">{row.source}</span>
                    <span>{row.blank}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {ops.descriptions.byScrapeStatus.length > 0 && (
            <div className="ops-subsection">
              <h4>Simplify scrape status</h4>
              <ul className="ops-scrape-list">
                {ops.descriptions.byScrapeStatus.map((row) => (
                  <li key={row.status}>
                    <div className="ops-scrape-row">
                      <span className="badge">{row.status}</span>
                      <span>{row.count}</span>
                    </div>
                    <p className="muted ops-scrape-hint">
                      {SCRAPE_STATUS_HINT[row.status] ?? "—"}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        <article className="card ops-card ops-card-wide">
          <h3 className="ops-card-heading">Schedule &amp; retries</h3>
          <dl className="ops-meta">
            <dt>Daily board refresh</dt>
            <dd>
              {ops.schedule.cronInstalled
                ? `${ops.schedule.cronTimeLocal} local`
                : "Not installed (npm run cron:install)"}
            </dd>
            <dt>Next scheduled run</dt>
            <dd>{formatWhen(ops.schedule.nextBoardRefreshAt)}</dd>
            <dt>Last database backup</dt>
            <dd>
              {ops.backup.lastAt
                ? [
                    formatWhen(ops.backup.lastAt),
                    formatBackupSize(ops.backup.sizeBytes),
                    ops.backup.backupCount > 0
                      ? `${ops.backup.backupCount} retained`
                      : null,
                  ]
                    .filter(Boolean)
                    .join(" · ")
                : "None yet — run Backup data below"}
            </dd>
          </dl>
          <p className="muted ops-card-hint">
            {ops.schedule.cronInstalled
              ? "Requires your Mac to be awake at the scheduled time. Board refresh runs a backup first."
              : "Install the LaunchAgent for automatic daily backup, ingest, scrape, and light rank."}
          </p>
          <ol className="ops-schedule-steps">
            {ops.schedule.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <p className="muted ops-card-hint">{ops.schedule.scrapeRetryNote}</p>
          {ops.schedule.scrapeNextRetries.length > 0 && (
            <div className="ops-subsection">
              <h4>Next scrape retries</h4>
              <ul className="ops-list">
                {ops.schedule.scrapeNextRetries.map((row) => (
                  <li key={row.status}>
                    <span className="badge">{row.status}</span>
                    <span>{row.count} posting{row.count === 1 ? "" : "s"}</span>
                    {row.nextRetryAt && (
                      <span className="muted">· {formatWhen(row.nextRetryAt)}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </article>

        {ops.rerankQueue.items.length > 0 && (
          <article className="card ops-card ops-card-wide">
            <h3 className="ops-card-heading">Rerank queue</h3>
            <ul className="ops-list">
              {ops.rerankQueue.items.map((item) => (
                <li key={item.postingId}>
                  <Link to={`/jobs/${item.postingId}`}>{item.postingId}</Link>
                  <span className={`badge status-${item.status}`}>{item.status}</span>
                  {item.error && <span className="error">{item.error}</span>}
                </li>
              ))}
            </ul>
          </article>
        )}
      </div>
    </section>
  );
}
