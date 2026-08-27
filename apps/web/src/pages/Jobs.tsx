import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import {
  clearJobFeedback,
  createApplication,
  deleteApplication,
  getBoardRefresh,
  getJobs,
  getRankBatch,
  sendJobFeedback,
  startBoardRefresh,
  type BoardRefreshStatus,
  type JobCard,
  type RankBatchStatus,
} from "../api";
import { RankBadges, RankNote } from "../RankMark";
import StarButton from "../StarButton";
import FeedbackDialog from "./FeedbackDialog";

const PAGE_SIZE = 25;
type JobSort = "rank" | "published" | "updated";

function parseSort(value: string | null): JobSort {
  return value === "published" || value === "updated" ? value : "rank";
}

function refreshLabel(status: BoardRefreshStatus | null): string {
  if (!status || status.status !== "running") return "Refresh board";
  if (status.phase === "scrape") return "Refreshing… scraping";
  if (status.phase === "ingest") return "Refreshing… ingesting";
  if (status.phase === "rank") return "Refreshing… ranking";
  return "Refreshing…";
}

function RankBatchBanner({ status }: { status: RankBatchStatus }) {
  if (status.status === "idle") return null;
  if (status.status === "ok" && status.finishedAt) {
    const age = Date.now() - new Date(status.finishedAt).getTime();
    if (!Number.isFinite(age) || age > 30 * 60 * 1000) return null;
  }
  const active = status.status === "running" || status.status === "ready";
  const className =
    status.status === "error"
      ? "rank-batch-banner error"
      : status.status === "ready"
        ? "rank-batch-banner ready"
        : status.status === "ok"
          ? "rank-batch-banner ok"
          : "rank-batch-banner";
  return (
    <p className={className} role="status">
      {active && <span className="spinner" aria-hidden="true" />}
      {status.hint ?? "Ranking…"}
    </p>
  );
}

function SearchBar({
  initial,
  count,
  loading,
  sort,
  unranked,
  mismatches,
  refresh,
  onQuery,
  onSort,
  onUnranked,
  onMismatches,
  onRefresh,
}: {
  initial: string;
  count: number;
  loading: boolean;
  sort: JobSort;
  unranked: boolean;
  mismatches: boolean;
  refresh: BoardRefreshStatus | null;
  onQuery: (query: string) => void;
  onSort: (sort: JobSort) => void;
  onUnranked: (on: boolean) => void;
  onMismatches: (on: boolean) => void;
  onRefresh: () => void;
}) {
  const [q, setQ] = useState(initial);
  const refreshing = refresh?.status === "running";

  useEffect(() => {
    setQ(initial);
  }, [initial]);

  useEffect(() => {
    const timer = window.setTimeout(() => onQuery(q), 200);
    return () => window.clearTimeout(timer);
  }, [q, onQuery]);

  return (
    <div className="toolbar">
      <input
        placeholder="Search title, company, location"
        value={q}
        onChange={(event) => setQ(event.target.value)}
        aria-label="Search jobs"
      />
      <div className="toolbar-toggles">
        <select
          className="sort"
          aria-label="Sort jobs"
          value={sort}
          onChange={(event) => onSort(parseSort(event.target.value))}
        >
          <option value="rank">Sort: rank</option>
          <option value="published">Sort: published</option>
          <option value="updated">Sort: updated</option>
        </select>
        <label className="toggle">
          <input
            type="checkbox"
            checked={unranked}
            onChange={(event) => onUnranked(event.target.checked)}
          />
          Show unranked
        </label>
        <label className="toggle">
          <input
            type="checkbox"
            checked={mismatches}
            onChange={(event) => onMismatches(event.target.checked)}
          />
          Show mismatches
        </label>
        <button
          type="button"
          className="secondary refresh-btn"
          disabled={refreshing}
          onClick={onRefresh}
        >
          {refreshing && <span className="spinner" aria-hidden="true" />}
          {refreshLabel(refresh)}
        </button>
      </div>
      <span className="count">{loading ? "Loading…" : `${count} open`}</span>
    </div>
  );
}

export default function Jobs() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const sort = parseSort(params.get("sort"));
  const unranked = params.get("unranked") !== "0";
  const mismatches = params.get("mismatches") === "1";
  const page = Math.max(1, Number(params.get("page") || 1));
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<BoardRefreshStatus | null>(null);
  const [rankBatch, setRankBatch] = useState<RankBatchStatus | null>(null);
  const [dialog, setDialog] = useState<{
    job: JobCard;
    kind: "like" | "dismiss" | "unlike";
  } | null>(null);
  const wasRefreshing = useRef(false);
  const wasRanking = useRef(false);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  async function reload(nextPage = page) {
    const data = await getJobs(query, nextPage, PAGE_SIZE, { mismatches, unranked, sort });
    setJobs(data.jobs);
    setCount(data.count);
    return data;
  }

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getJobs(query, page, PAGE_SIZE, { mismatches, unranked, sort })
      .then((data) => {
        if (cancelled) return;
        setJobs(data.jobs);
        setCount(data.count);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [query, page, mismatches, unranked, sort]);

  useEffect(() => {
    let cancelled = false;
    getBoardRefresh()
      .then((status) => {
        if (!cancelled) setRefresh(status);
      })
      .catch(() => undefined);
    getRankBatch()
      .then((status) => {
        if (!cancelled) setRankBatch(status);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (refresh?.status !== "running") return;
    wasRefreshing.current = true;
    const timer = window.setInterval(() => {
      getBoardRefresh()
        .then((status) => setRefresh(status))
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [refresh?.status]);

  useEffect(() => {
    if (!refresh || refresh.status === "running") return;
    if (!wasRefreshing.current) return;
    wasRefreshing.current = false;
    if (refresh.status === "error") {
      setError(refresh.error || "Board refresh failed");
    }
    setLoading(true);
    reload()
      .then(() => setError((current) => (refresh.status === "error" ? current : null)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const active =
      rankBatch?.status === "running" || rankBatch?.status === "ready";
    // Poll often while active; occasionally while idle so a CLI-started batch appears.
    const ms = active ? 2500 : 12_000;
    if (active) wasRanking.current = true;
    const timer = window.setInterval(() => {
      getRankBatch()
        .then((status) => setRankBatch(status))
        .catch(() => undefined);
    }, ms);
    return () => window.clearInterval(timer);
  }, [rankBatch?.status]);

  useEffect(() => {
    if (!rankBatch) return;
    if (rankBatch.status === "running" || rankBatch.status === "ready") {
      wasRanking.current = true;
      return;
    }
    if (!wasRanking.current) return;
    if (rankBatch.status !== "ok" && rankBatch.status !== "error") return;
    wasRanking.current = false;
    setLoading(true);
    reload()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [rankBatch]);

  const setQuery = useCallback(
    (next: string) => {
      const trimmed = next.trim();
      setParams(
        (current) => {
          const currentQ = current.get("q") ?? "";
          if (trimmed === currentQ) return current;
          const nextParams = new URLSearchParams();
          if (trimmed) nextParams.set("q", trimmed);
          if (current.get("mismatches") === "1") nextParams.set("mismatches", "1");
          if (current.get("unranked") === "0") nextParams.set("unranked", "0");
          const currentSort = current.get("sort");
          if (currentSort === "published" || currentSort === "updated") {
            nextParams.set("sort", currentSort);
          }
          return nextParams;
        },
        { replace: true },
      );
    },
    [setParams],
  );

  function jobsParams(
    nextPage: number,
    nextMismatches = mismatches,
    nextUnranked = unranked,
    nextQuery = query,
    nextSort = sort,
  ) {
    const nextParams = new URLSearchParams();
    if (nextQuery) nextParams.set("q", nextQuery);
    if (nextMismatches) nextParams.set("mismatches", "1");
    if (!nextUnranked) nextParams.set("unranked", "0");
    if (nextSort !== "rank") nextParams.set("sort", nextSort);
    if (nextPage > 1) nextParams.set("page", String(nextPage));
    return nextParams;
  }

  function setPage(next: number) {
    setParams(jobsParams(next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setMismatches(on: boolean) {
    setParams(jobsParams(1, on));
  }

  function setUnranked(on: boolean) {
    setParams(jobsParams(1, mismatches, on));
  }

  function setSort(next: JobSort) {
    setParams(jobsParams(1, mismatches, unranked, query, next));
  }

  async function refreshBoard() {
    try {
      const status = await startBoardRefresh();
      wasRefreshing.current = true;
      setRefresh(status);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start board refresh");
    }
  }

  async function toggleStar(job: JobCard) {
    if (pendingId) return;
    setPendingId(job.id);
    const starred = job.applicationStatus === "starred";
    setJobs((current) =>
      current.map((row) =>
        row.id === job.id
          ? {
              ...row,
              applicationStatus: starred ? null : "starred",
              applicationId: starred ? null : row.applicationId,
            }
          : row,
      ),
    );
    try {
      if (starred) {
        if (job.applicationId) await deleteApplication(job.applicationId);
      } else {
        const created = await createApplication({ postingId: job.id, status: "starred" });
        setJobs((current) =>
          current.map((row) =>
            row.id === job.id
              ? { ...row, applicationId: created.id, applicationStatus: "starred" }
              : row,
          ),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update star");
      await reload().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  async function markApplied(job: JobCard) {
    try {
      await createApplication({ postingId: job.id, status: "applied" });
      const data = await reload();
      if (data.jobs.length === 0 && page > 1) {
        setPage(page - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark applied");
    }
  }

  async function confirmFeedback(note: string) {
    if (!dialog) return;
    const { job, kind } = dialog;
    setPendingId(job.id);
    try {
      if (kind === "unlike") {
        await clearJobFeedback(job.id);
      } else {
        await sendJobFeedback(job.id, kind, note);
      }
      setDialog(null);
      const data = await reload();
      if (data.jobs.length === 0 && page > 1) setPage(page - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback");
    } finally {
      setPendingId(null);
    }
  }

  const refreshing = refresh?.status === "running";

  return (
    <section>
      <SearchBar
        initial={query}
        count={count}
        loading={loading}
        unranked={unranked}
        mismatches={mismatches}
        sort={sort}
        refresh={refresh}
        onQuery={setQuery}
        onSort={setSort}
        onUnranked={setUnranked}
        onMismatches={setMismatches}
        onRefresh={() => void refreshBoard()}
      />
      {refreshing && (
        <p className="refresh-banner" role="status">
          <span className="spinner" aria-hidden="true" />
          Refreshing board
          {refresh.phase === "ingest"
            ? " — ingesting listings"
            : refresh.phase === "scrape"
              ? " — scraping descriptions"
              : refresh.phase === "rank"
                ? " — ranking new roles"
                : ""}
          …
        </p>
      )}
      {rankBatch && <RankBatchBanner status={rankBatch} />}
      {error && <p className="error">{error}</p>}
      {loading && jobs.length === 0 && <p className="muted">Loading jobs…</p>}
      {jobs.map((job) => (
        <article key={job.id} className="card">
          <StarButton
            starred={job.applicationStatus === "starred"}
            disabled={pendingId === job.id}
            onClick={() => toggleStar(job)}
          />
          <h2>
            <Link to={`/jobs/${job.id}`}>{job.title}</Link>
          </h2>
          <div className="meta">
            <span className="employer">{job.company}</span>
            <span className="location">{job.location ?? ""}</span>
            <RankBadges job={job} />
          </div>
          <RankNote job={job} compact />
          <div className="row-actions">
            <button type="button" onClick={() => markApplied(job)}>
              Applied
            </button>
            <button
              type="button"
              className="secondary"
              disabled={pendingId === job.id}
              onClick={() =>
                setDialog({
                  job,
                  kind: job.feedbackKind === "like" ? "unlike" : "like",
                })
              }
            >
              {job.feedbackKind === "like" ? "Liked" : "Like"}
            </button>
            <button
              type="button"
              className="secondary"
              disabled={pendingId === job.id}
              onClick={() => setDialog({ job, kind: "dismiss" })}
            >
              Dismiss
            </button>
            <a className="external" href={job.url} target="_blank" rel="noreferrer">
              Apply on site <span className="ext-icon" aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      ))}
      {count > 0 && (
        <nav className="pager" aria-label="Jobs pages">
          {page > 1 ? (
            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() => setPage(page - 1)}
            >
              ‹
            </button>
          ) : (
            <span />
          )}
          <label className="pager-jump">
            <span className="muted">Page</span>
            <select
              aria-label="Go to page"
              value={page}
              disabled={loading}
              onChange={(event) => setPage(Number(event.target.value))}
            >
              {Array.from({ length: pageCount }, (_, index) => index + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span className="muted">/ {pageCount}</span>
          </label>
          {page < pageCount ? (
            <button
              type="button"
              className="secondary"
              disabled={loading}
              onClick={() => setPage(page + 1)}
            >
              ›
            </button>
          ) : (
            <span />
          )}
        </nav>
      )}
      {dialog && (
        <FeedbackDialog
          kind={dialog.kind}
          title={`${dialog.job.company} — ${dialog.job.title}`}
          pending={pendingId === dialog.job.id}
          onCancel={() => setDialog(null)}
          onConfirm={(note) => void confirmFeedback(note)}
        />
      )}
    </section>
  );
}
