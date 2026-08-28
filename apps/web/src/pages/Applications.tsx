import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { deleteApplication, getApplications, type ApplicationRow } from "../api";
import { formatShortDate } from "../formatDate";
import PostingDates from "../PostingDates";
import StarButton from "../StarButton";
import { invalidateListCache, readListCache, writeListCache } from "../listCache";
import AddApplicationForm, { type AddApplicationFormHandle } from "./AddApplicationForm";

const TABS = ["all", "starred", "applied", "interviewing", "accepted", "declined"] as const;

const EMPTY_COUNTS: Record<(typeof TABS)[number], number> = {
  all: 0,
  starred: 0,
  applied: 0,
  interviewing: 0,
  accepted: 0,
  declined: 0,
};

type ApplicationsSnapshot = {
  applications: ApplicationRow[];
  counts: Record<(typeof TABS)[number], number>;
};

function applicationsCacheKey(status: string): string {
  return `applications:${status}`;
}

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const initialCacheKey = applicationsCacheKey(status);
  const initialSnapshot = readListCache<ApplicationsSnapshot>(initialCacheKey);
  const [rows, setRows] = useState<ApplicationRow[]>(
    () => initialSnapshot?.applications ?? [],
  );
  const [counts, setCounts] = useState(
    () => initialSnapshot?.counts ?? EMPTY_COUNTS,
  );
  const [loaded, setLoaded] = useState(() => !!initialSnapshot);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const addFormRef = useRef<AddApplicationFormHandle>(null);

  function applyApplicationsData(
    data: Awaited<ReturnType<typeof getApplications>>,
    cacheKey: string,
  ) {
    const snapshot: ApplicationsSnapshot = {
      applications: data.applications,
      counts: { ...EMPTY_COUNTS, ...data.counts },
    };
    writeListCache(cacheKey, snapshot);
    setRows(snapshot.applications);
    setCounts(snapshot.counts);
    setLoaded(true);
  }

  async function load() {
    const cacheKey = applicationsCacheKey(status);
    const data = await getApplications(status);
    applyApplicationsData(data, cacheKey);
  }

  useEffect(() => {
    let cancelled = false;
    const cacheKey = applicationsCacheKey(status);
    const cached = readListCache<ApplicationsSnapshot>(cacheKey);
    if (cached) {
      setRows(cached.applications);
      setCounts(cached.counts);
      setLoaded(true);
    } else {
      setLoaded(false);
    }

    getApplications(status)
      .then((data) => {
        if (cancelled) return;
        applyApplicationsData(data, cacheKey);
        setError(null);
      })
      .catch((err: Error) => {
        if (!cancelled) setError(err.message);
      });

    return () => {
      cancelled = true;
    };
  }, [status]);

  useEffect(() => {
    if (!adding) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") addFormRef.current?.requestClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [adding]);

  function requestCloseAdd() {
    addFormRef.current?.requestClose();
  }

  async function unstar(row: ApplicationRow) {
    if (row.status !== "starred" || pendingId) return;
    setPendingId(row.id);
    setRows((current) => current.filter((item) => item.id !== row.id));
    setCounts((current) => ({
      ...current,
      all: Math.max(0, current.all - 1),
      starred: Math.max(0, current.starred - 1),
    }));
    try {
      await deleteApplication(row.id);
      invalidateListCache("applications:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unstar");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  function onCreated(row: ApplicationRow) {
    setAdding(false);
    invalidateListCache("applications:");
    if (status !== "all" && row.status !== status) {
      setSearchParams({ status: row.status });
      return;
    }
    void load().catch((err: Error) => setError(err.message));
  }

  return (
    <section>
      <div className="tabs-row">
        <div className="tabs">
          {TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              className={tab === status ? "tab on" : "tab"}
              aria-current={tab === status ? "page" : undefined}
              aria-label={`${tab}, ${counts[tab]} application${counts[tab] === 1 ? "" : "s"}`}
              onClick={() => setSearchParams(tab === "all" ? {} : { status: tab })}
            >
              <span className="tab-label">{tab}</span>
              <span className="tab-count">{counts[tab]}</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={() => setAdding(true)}>
          Add application +
        </button>
      </div>
      {error && <p className="error">{error}</p>}
      {!loaded && rows.length === 0 && <p className="muted">Loading…</p>}
      {loaded && rows.length === 0 && <p className="muted">Nothing in this tab yet.</p>}
      {rows.map((row) => {
        const appliedLabel = formatShortDate(row.appliedAt);
        return (
          <article key={row.id} className="card">
            {row.status === "starred" && (
              <StarButton
                starred
                disabled={pendingId === row.id}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  void unstar(row);
                }}
              />
            )}
            <Link
              className="card-hit"
              to={`/applications/${row.id}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <h2>{row.title ?? "Untitled"}</h2>
              <div className="meta">
                <span className="employer">{row.company}</span>
                <span className="location">{row.location ?? ""}</span>
                <span className="meta-badges">
                  {row.status !== "starred" && (
                  <span className={`badge status-${row.status}`}>{row.status}</span>
                )}
                  {row.postingId ? (
                    <span className="badge">{row.source ?? "linked"}</span>
                  ) : (
                    <span className="badge">manual</span>
                  )}
                  <PostingDates
                    firstPublishedAt={row.firstPublishedAt}
                    sourceUpdatedAt={row.sourceUpdatedAt}
                  />
                </span>
              </div>
            </Link>
            {(appliedLabel || row.url) && (
              <div className="row-actions">
                {appliedLabel && (
                  <span className="applied-date">Date applied: {appliedLabel}</span>
                )}
                {row.url && (
                  <a
                    className="external"
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    {row.status === "starred" ? "Apply on site" : "Link to posting"}
                    <span className="ext-icon" aria-hidden="true">↗</span>
                  </a>
                )}
              </div>
            )}
          </article>
        );
      })}
      {adding && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) requestCloseAdd();
          }}
        >
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="add-app-title">
            <AddApplicationForm
              ref={addFormRef}
              onCreated={onCreated}
              onCancel={() => setAdding(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
