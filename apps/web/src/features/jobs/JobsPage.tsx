import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  addPostingToTasks,
  clearJobFeedback,
  createApplication,
  getBoardRefresh,
  getJobs,
  getRankBatch,
  getRerankQueue,
  queueJobRerank,
  removePostingFromTasks,
  sendJobFeedback,
  startBoardRefresh,
  type BoardRefreshStatus,
  type JobCard,
  type JobView,
  type RankBatchStatus,
  type RerankQueueSnapshot,
} from "../../api";
import { isMismatch, RankBadges, RankNote } from "./RankMark";
import JobFeedbackButtons from "./JobFeedbackButtons";
import { invalidateListCache, readListCache, writeListCache } from "../../listCache";
import MarkAppliedDialog from "./MarkAppliedDialog";
import FeedbackDialog from "./FeedbackDialog";
import RerankDialog from "./RerankDialog";
import { listLinkState } from "../../navigationReturn";
import LocationFilterChips from "./LocationFilterChips";

const PAGE_SIZE = 25;

type JobsListSnapshot = {
  jobs: JobCard[];
  count: number;
  counts: Record<JobView, number>;
  locationCounts?: Record<string, number>;
};

function jobsListCacheKey(
  query: string,
  page: number,
  view: JobView,
  sort: JobSort,
  loc: string | null,
): string {
  return `jobs:${view}:${sort}:${loc ?? ""}:${page}:${query}`;
}

const TABS: { id: JobView; label: string }[] = [
  { id: "ranked", label: "ranked" },
  { id: "mismatches", label: "mismatches" },
  { id: "unranked", label: "unranked" },
  { id: "needs-description", label: "needs description" },
];

const EMPTY_COUNTS: Record<JobView, number> = {
  ranked: 0,
  mismatches: 0,
  unranked: 0,
  "needs-description": 0,
};

type JobSort = "rank" | "published" | "updated";

function parseView(value: string | null): JobView {
  if (
    value === "mismatches" ||
    value === "unranked" ||
    value === "needs-description"
  ) {
    return value;
  }
  return "ranked";
}

function parseSort(value: string | null, view: JobView): JobSort {
  if (value === "published" || value === "updated") return value;
  return view === "ranked" ? "rank" : "published";
}

function refreshLabel(status: BoardRefreshStatus | null): string {
  if (!status || status.status !== "running") return "Refresh board";
  if (status.phase === "scrape") return "Refreshing… scraping";
  if (status.phase === "ingest") return "Refreshing… ingesting";
  if (status.phase === "rank") return "Refreshing… ranking";
  return "Refreshing…";
}

/** User-dismissed rank banners for this browser tab (survives route changes and reloads). */
const DISMISSED_RANK_BANNERS_KEY = "career-digest:dismissed-rank-banners";

function readDismissedRankBannerKeys(): Set<string> {
  try {
    const raw = sessionStorage.getItem(DISMISSED_RANK_BANNERS_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((item): item is string => typeof item === "string"));
  } catch {
    return new Set();
  }
}

function persistDismissedRankBannerKey(key: string): void {
  const keys = readDismissedRankBannerKeys();
  keys.add(key);
  sessionStorage.setItem(DISMISSED_RANK_BANNERS_KEY, JSON.stringify([...keys]));
}

const dismissedRankBannerKeys = readDismissedRankBannerKeys();

function RankBatchBanner({
  status,
  onDismiss,
}: {
  status: RankBatchStatus;
  onDismiss: () => void;
}) {
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
    <div className={className} role="status">
      <span className="rank-batch-banner-text">
        {active && <span className="spinner" aria-hidden="true" />}
        {status.hint ?? "Ranking…"}
      </span>
      <button
        type="button"
        className="rank-batch-dismiss"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6.3 6.3 17.7 17.7M17.7 6.3 6.3 17.7" />
        </svg>
      </button>
    </div>
  );
}

export default function Jobs() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const query = params.get("q") ?? "";
  const view = parseView(params.get("view"));
  const sort = parseSort(params.get("sort"), view);
  const page = Math.max(1, Number(params.get("page") || 1));
  const locationFilter = view === "ranked" ? params.get("loc") : null;
  const initialCacheKey = jobsListCacheKey(query, page, view, sort, locationFilter);
  const initialSnapshot = readListCache<JobsListSnapshot>(initialCacheKey);
  const [jobs, setJobs] = useState<JobCard[]>(() => initialSnapshot?.jobs ?? []);
  const [count, setCount] = useState(() => initialSnapshot?.count ?? 0);
  const [counts, setCounts] = useState<Record<JobView, number>>(
    () => initialSnapshot?.counts ?? EMPTY_COUNTS,
  );
  const [locationCounts, setLocationCounts] = useState<Record<string, number>>(
    () => initialSnapshot?.locationCounts ?? {},
  );
  const [loading, setLoading] = useState(() => !initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState<BoardRefreshStatus | null>(null);
  const [rankBatch, setRankBatch] = useState<RankBatchStatus | null>(null);
  const [dismissedRankBannerKey, setDismissedRankBannerKey] = useState<string | null>(null);
  const [dialog, setDialog] = useState<{
    job: JobCard;
    kind: "like" | "dismiss" | "unlike";
  } | null>(null);
  const [rerankDialog, setRerankDialog] = useState<JobCard | null>(null);
  const [appliedConfirm, setAppliedConfirm] = useState<JobCard | null>(null);
  const [rerankQueue, setRerankQueue] = useState<RerankQueueSnapshot["items"]>([]);
  const [searchInput, setSearchInput] = useState(query);
  const wasReranking = useRef(false);
  const wasRefreshing = useRef(false);
  const wasRanking = useRef(false);

  const pageCount = Math.max(1, Math.ceil(count / PAGE_SIZE));

  function jobsParams(
    nextPage: number,
    nextView = view,
    nextQuery = query,
    nextSort = sort,
    nextLoc = locationFilter,
  ) {
    const nextParams = new URLSearchParams();
    if (nextQuery) nextParams.set("q", nextQuery);
    if (nextView !== "ranked") nextParams.set("view", nextView);
    const defaultSort: JobSort = nextView === "ranked" ? "rank" : "published";
    if (nextSort !== defaultSort) {
      nextParams.set("sort", nextSort);
    }
    if (nextView === "ranked" && nextLoc) nextParams.set("loc", nextLoc);
    if (nextPage > 1) nextParams.set("page", String(nextPage));
    return nextParams;
  }

  function applyJobsData(data: Awaited<ReturnType<typeof getJobs>>, cacheKey: string) {
    const snapshot: JobsListSnapshot = {
      jobs: data.jobs,
      count: data.count,
      counts: { ...EMPTY_COUNTS, ...data.counts },
      locationCounts: data.locationCounts,
    };
    writeListCache(cacheKey, snapshot);
    setJobs(snapshot.jobs);
    setCount(snapshot.count);
    setCounts(snapshot.counts);
    if (data.locationCounts) setLocationCounts(data.locationCounts);
  }

  async function reload(nextPage = page) {
    const cacheKey = jobsListCacheKey(query, nextPage, view, sort, locationFilter);
    const data = await getJobs(query, nextPage, PAGE_SIZE, {
      view,
      sort,
      loc: locationFilter,
    });
    applyJobsData(data, cacheKey);
    return data;
  }

  useEffect(() => {
    setSearchInput(query);
  }, [query]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const trimmed = searchInput.trim();
      if (trimmed === query) return;
      setParams(jobsParams(1, view, trimmed), { replace: true });
    }, 200);
    return () => window.clearTimeout(timer);
  }, [searchInput, query, view, sort, setParams]);

  useEffect(() => {
    let cancelled = false;
    const cacheKey = jobsListCacheKey(query, page, view, sort, locationFilter);
    const cached = readListCache<JobsListSnapshot>(cacheKey);
    if (cached) {
      setJobs(cached.jobs);
      setCount(cached.count);
      setCounts(cached.counts);
      if (cached.locationCounts) setLocationCounts(cached.locationCounts);
      setLoading(false);
    } else {
      setLoading(true);
    }

    getJobs(query, page, PAGE_SIZE, { view, sort, loc: locationFilter })
      .then((data) => {
        if (cancelled) return;
        applyJobsData(data, cacheKey);
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
  }, [query, page, view, sort, locationFilter]);

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
    getRerankQueue()
      .then((snapshot) => {
        if (!cancelled) setRerankQueue(snapshot.items);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const active = rerankQueue.some(
      (item) => item.status === "queued" || item.status === "running",
    );
    if (!active) return;
    wasReranking.current = true;
    const timer = window.setInterval(() => {
      getRerankQueue()
        .then((snapshot) => setRerankQueue(snapshot.items))
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [rerankQueue]);

  useEffect(() => {
    if (!rerankQueue.some((item) => item.status === "queued" || item.status === "running")) {
      if (!wasReranking.current) return;
      wasReranking.current = false;
      invalidateListCache("jobs:");
      setLoading(jobs.length === 0);
      reload()
        .catch((err: Error) => setError(err.message))
        .finally(() => setLoading(false));
    }
  }, [rerankQueue]);

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
    invalidateListCache("jobs:");
    setLoading(jobs.length === 0);
    reload()
      .then(() => setError((current) => (refresh.status === "error" ? current : null)))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [refresh]);

  useEffect(() => {
    const active = rankBatch?.status === "running" || rankBatch?.status === "ready";
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
    invalidateListCache("jobs:");
    setLoading(jobs.length === 0);
    reload()
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [rankBatch]);

  function setView(next: JobView) {
    const nextSort =
      next === "ranked" ? "rank" : sort === "rank" ? "published" : sort;
    setParams(jobsParams(1, next, query, nextSort, next === "ranked" ? locationFilter : null));
  }

  function setSort(next: JobSort) {
    setParams(jobsParams(1, view, query, next));
  }

  function setPage(next: number) {
    setParams(jobsParams(next));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function setLocationFilter(next: string | null) {
    const nextParams = new URLSearchParams(params);
    if (!next) nextParams.delete("loc");
    else nextParams.set("loc", next);
    nextParams.delete("page");
    setParams(nextParams, { replace: true });
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

  async function toggleTasks(job: JobCard) {
    if (pendingId) return;
    setPendingId(job.id);
    const onTasks = job.onTasks || job.applicationStatus === "todo";
    setJobs((current) =>
      current.map((row) =>
        row.id === job.id
          ? {
              ...row,
              onTasks: !onTasks,
              applicationStatus: onTasks ? null : "todo",
            }
          : row,
      ),
    );
    try {
      if (onTasks) {
        await removePostingFromTasks(job.id);
      } else {
        await addPostingToTasks(job.id);
      }
      invalidateListCache("applications:");
      invalidateListCache("tasks:");
      await reload().catch(() => undefined);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update tasks");
      await reload().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  async function confirmApplied(notes: string) {
    if (!appliedConfirm) return;
    const job = appliedConfirm;
    setAppliedConfirm(null);
    try {
      await createApplication({
        postingId: job.id,
        status: "applied",
        ...(notes ? { notes } : {}),
      });
      invalidateListCache("applications:");
      invalidateListCache("tasks:");
      const data = await reload();
      if (data.jobs.length === 0 && page > 1) {
        setPage(page - 1);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark applied");
    }
  }

  async function markApplied(job: JobCard) {
    setAppliedConfirm(job);
  }

  async function confirmFeedback(result: { note: string; teach: boolean }) {
    if (!dialog) return;
    const { job, kind } = dialog;
    setPendingId(job.id);
    try {
      if (kind === "unlike") {
        await clearJobFeedback(job.id);
      } else {
        await sendJobFeedback(job.id, kind, result.note, result.teach);
      }
      setDialog(null);
      invalidateListCache("jobs:");
      const data = await reload();
      if (data.jobs.length === 0 && page > 1) setPage(page - 1);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback");
    } finally {
      setPendingId(null);
    }
  }

  async function confirmRerank(note: string) {
    if (!rerankDialog) return;
    const job = rerankDialog;
    setPendingId(job.id);
    try {
      await queueJobRerank(job.id, note);
      setRerankDialog(null);
      const snapshot = await getRerankQueue();
      setRerankQueue(snapshot.items);
      wasReranking.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue rerank");
    } finally {
      setPendingId(null);
    }
  }

  function rerankStatusFor(jobId: string): RerankQueueSnapshot["items"][number] | null {
    return rerankQueue.find((item) => item.postingId === jobId) ?? null;
  }

  const refreshing = refresh?.status === "running";
  const showRankActions = view !== "needs-description";
  const rankBannerKey =
    rankBatch == null
      ? null
      : rankBatch.status === "ok" || rankBatch.status === "error"
        ? `${rankBatch.status}:${rankBatch.finishedAt ?? ""}`
        : `${rankBatch.status}:${rankBatch.batchId ?? rankBatch.updatedAt ?? ""}`;
  const rankBannerDismissed =
    rankBannerKey != null &&
    (dismissedRankBannerKey === rankBannerKey ||
      dismissedRankBannerKeys.has(rankBannerKey));

  return (
    <section>
      <div className="tabs-row">
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={tab.id === view ? "tab on" : "tab"}
              aria-current={tab.id === view ? "page" : undefined}
              aria-label={`${tab.label}, ${counts[tab.id]} posting${counts[tab.id] === 1 ? "" : "s"}`}
              onClick={() => setView(tab.id)}
            >
              <span className="tab-label">{tab.label}</span>
              <span className="tab-count">{counts[tab.id]}</span>
            </button>
          ))}
        </div>
        <button
          type="button"
          className="secondary refresh-btn"
          disabled={refreshing}
          onClick={() => void refreshBoard()}
        >
          {refreshing && <span className="spinner" aria-hidden="true" />}
          {refreshLabel(refresh)}
        </button>
      </div>

      {view === "ranked" && (
        <LocationFilterChips
          active={locationFilter}
          counts={locationCounts}
          total={counts.ranked}
          onSelect={setLocationFilter}
        />
      )}

      <div className="jobs-search-row">
        <input
          className="jobs-search-input"
          placeholder="Search title, company, location"
          value={searchInput}
          onChange={(event) => setSearchInput(event.target.value)}
          aria-label="Search jobs in this tab"
        />
        <select
          className="sort jobs-sort-select"
          aria-label="Sort jobs"
          value={sort}
          onChange={(event) => {
            const next = event.target.value;
            if (next === "rank" || next === "published" || next === "updated") {
              setSort(next);
            }
          }}
        >
          {view === "ranked" && <option value="rank">Sort: rank</option>}
          <option value="published">Sort: published</option>
          <option value="updated">Sort: updated</option>
        </select>
      </div>

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
      {rankBatch && rankBannerKey && !rankBannerDismissed && (
          <RankBatchBanner
            status={rankBatch}
            onDismiss={() => {
              dismissedRankBannerKeys.add(rankBannerKey);
              persistDismissedRankBannerKey(rankBannerKey);
              setDismissedRankBannerKey(rankBannerKey);
            }}
          />
        )}
      {error && <p className="error">{error}</p>}
      {loading && jobs.length === 0 && <p className="muted">Loading jobs…</p>}
      {!loading && jobs.length === 0 && <p className="muted">Nothing in this tab yet.</p>}
      {jobs.map((job) => {
        const mismatch = isMismatch(job);
        const rerank = rerankStatusFor(job.id);
        const rerankBusy =
          rerank?.status === "queued" || rerank?.status === "running" || pendingId === job.id;
        return (
          <article key={job.id} className="card">
            <div className="card-title-row">
              <h2>
                <Link to={`/jobs/${job.id}`} state={listLinkState(location)}>
                  {job.title}
                </Link>
              </h2>
              <JobFeedbackButtons
                liked={job.feedbackKind === "like"}
                dismissed={job.feedbackKind === "dismiss"}
                disabled={pendingId === job.id}
                onLike={() =>
                  setDialog({
                    job,
                    kind: job.feedbackKind === "like" ? "unlike" : "like",
                  })
                }
                onDismiss={() => setDialog({ job, kind: "dismiss" })}
              />
            </div>
            <div className="meta">
              <span className="employer">{job.company}</span>
              <span className="location">{job.location ?? ""}</span>
              <RankBadges job={job} view={view} />
            </div>
            <RankNote job={job} compact view={view} />
            <div className="row-actions">
              <button
                type="button"
                className={
                  job.onTasks || job.applicationStatus === "todo"
                    ? "secondary todo-toggle on"
                    : "secondary todo-toggle"
                }
                disabled={pendingId === job.id}
                onClick={() => void toggleTasks(job)}
              >
                {job.onTasks || job.applicationStatus === "todo"
                  ? "Remove from tasks"
                  : "Add to tasks"}
              </button>
              <button
                type="button"
                className="secondary"
                disabled={pendingId === job.id}
                onClick={() => markApplied(job)}
              >
                Applied<span className="btn-icon" aria-hidden="true">✓</span>
              </button>
              {showRankActions &&
                mismatch && (
                  <button
                    type="button"
                    className="secondary"
                    disabled={rerankBusy}
                    onClick={() => setRerankDialog(job)}
                  >
                    {rerank?.status === "queued" || rerank?.status === "running" ? (
                      <>
                        <span className="spinner" aria-hidden="true" />
                        Reranking…
                      </>
                    ) : rerank?.status === "error" ? (
                      "Rerank failed"
                    ) : (
                      "Rerank"
                    )}
                  </button>
                )}
              <a className="external" href={job.url} target="_blank" rel="noreferrer">
                Apply on site <span className="ext-icon" aria-hidden="true">↗</span>
              </a>
            </div>
            {rerank?.status === "error" && rerank.error && (
              <p className="error card-inline-error">{rerank.error}</p>
            )}
          </article>
        );
      })}
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
          onConfirm={(result) => void confirmFeedback(result)}
        />
      )}
      {rerankDialog && (
        <RerankDialog
          title={`${rerankDialog.company} — ${rerankDialog.title}`}
          pending={pendingId === rerankDialog.id}
          onCancel={() => setRerankDialog(null)}
          onConfirm={(note) => void confirmRerank(note)}
        />
      )}
      {appliedConfirm && (
        <MarkAppliedDialog
          title={`${appliedConfirm.company} — ${appliedConfirm.title}`}
          pending={pendingId === appliedConfirm.id}
          onCancel={() => setAppliedConfirm(null)}
          onConfirm={(notes) => void confirmApplied(notes)}
        />
      )}
    </section>
  );
}
