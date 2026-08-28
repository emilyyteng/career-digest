import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { deleteApplication, getApplications, type ApplicationRow } from "../api";
import { formatShortDate } from "../formatDate";
import PostingDates from "../PostingDates";
import StarButton from "../StarButton";
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

export default function Applications() {
  const [searchParams, setSearchParams] = useSearchParams();
  const status = searchParams.get("status") ?? "all";
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const addFormRef = useRef<AddApplicationFormHandle>(null);

  async function load() {
    const data = await getApplications(status);
    setRows(data.applications);
    setCounts({ ...EMPTY_COUNTS, ...data.counts });
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
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
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not unstar");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  function onCreated(row: ApplicationRow) {
    setAdding(false);
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
      {rows.length === 0 && <p className="muted">Nothing in this tab yet.</p>}
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
