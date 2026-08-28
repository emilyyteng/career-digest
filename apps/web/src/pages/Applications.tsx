import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  deleteApplication,
  getApplications,
  patchApplication,
  type ApplicationRow,
} from "../api";
import {
  combineApplyByDateTime,
  formatShortDate,
  toDateInputValue,
  applyByTimeInputValue,
} from "../formatDate";
import InterviewCountdown from "../InterviewCountdown";
import ApplicationMetaBadges from "../ApplicationMetaBadges";
import { invalidateListCache, readListCache, writeListCache } from "../listCache";
import StepActionConfirm from "../StepActionConfirm";
import { listLinkState } from "../navigationReturn";
import AddApplicationForm, { type AddApplicationFormHandle } from "./AddApplicationForm";

const TABS = ["all", "todo", "applied", "interviewing", "accepted", "declined"] as const;

const EMPTY_COUNTS: Record<(typeof TABS)[number], number> = {
  all: 0,
  todo: 0,
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

function tabLabel(tab: (typeof TABS)[number]): string {
  return tab === "todo" ? "to-do" : tab;
}

export default function Applications() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawStatus = searchParams.get("status") ?? "all";
  const status = rawStatus === "starred" ? "todo" : rawStatus;
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
  const [removeConfirm, setRemoveConfirm] = useState<ApplicationRow | null>(null);
  const [dueDrafts, setDueDrafts] = useState<
    Record<string, { date: string; time: string }>
  >({});
  const [dueFlash, setDueFlash] = useState<Record<string, boolean>>({});
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

  function dueDraftFor(row: ApplicationRow) {
    const draft = dueDrafts[row.id];
    if (draft) return draft;
    return {
      date: toDateInputValue(row.dueAt),
      time: applyByTimeInputValue(row.dueAt),
    };
  }

  function setDueDraft(rowId: string, patch: Partial<{ date: string; time: string }>) {
    setDueDrafts((current) => {
      const row = rows.find((item) => item.id === rowId);
      const base = current[rowId] ?? {
        date: toDateInputValue(row?.dueAt),
        time: applyByTimeInputValue(row?.dueAt),
      };
      return { ...current, [rowId]: { ...base, ...patch } };
    });
  }

  async function confirmRemoveTodo() {
    if (!removeConfirm) return;
    const row = removeConfirm;
    setRemoveConfirm(null);
    await removeTodo(row);
  }

  async function removeTodo(row: ApplicationRow) {
    if (row.status !== "todo" || pendingId) return;
    setPendingId(row.id);
    setRows((current) => current.filter((item) => item.id !== row.id));
    setCounts((current) => ({
      ...current,
      all: Math.max(0, current.all - 1),
      todo: Math.max(0, current.todo - 1),
    }));
    try {
      await deleteApplication(row.id);
      invalidateListCache("applications:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove from to-do");
      await load().catch(() => undefined);
    } finally {
      setPendingId(null);
    }
  }

  async function saveDueAt(event: FormEvent, row: ApplicationRow) {
    event.preventDefault();
    if (pendingId) return;
    const draft = dueDraftFor(row);
    const dueAt = draft.date ? combineApplyByDateTime(draft.date, draft.time) : null;
    setPendingId(row.id);
    try {
      await patchApplication(row.id, { dueAt });
      setRows((current) =>
        current.map((item) => (item.id === row.id ? { ...item, dueAt } : item)),
      );
      invalidateListCache("applications:");
      setDueFlash((current) => ({ ...current, [row.id]: true }));
      window.setTimeout(() => {
        setDueFlash((current) => {
          const next = { ...current };
          delete next[row.id];
          return next;
        });
      }, 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save apply-by date");
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
              aria-label={`${tabLabel(tab)}, ${counts[tab]} application${counts[tab] === 1 ? "" : "s"}`}
              onClick={() => setSearchParams(tab === "all" ? {} : { status: tab })}
            >
              <span className="tab-label">{tabLabel(tab)}</span>
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
        const dueDraft = dueDraftFor(row);
        return (
          <article key={row.id} className="card application-card">
            {row.status === "todo" && (
              <button
                type="button"
                className="todo-remove-btn"
                aria-label="Remove from to-dos"
                disabled={pendingId === row.id}
                onClick={() => setRemoveConfirm(row)}
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M6.3 6.3 17.7 17.7M17.7 6.3 6.3 17.7" />
                </svg>
              </button>
            )}
            <div
              className={
                row.status === "todo"
                  ? "application-card-layout application-card-layout-todo"
                  : "application-card-layout"
              }
            >
              <div className="application-card-top">
                <Link
                  className="application-card-title-link"
                  to={`/applications/${row.id}`}
                  state={listLinkState(location)}
                >
                  <h2 className="application-card-title">{row.title ?? "Untitled"}</h2>
                </Link>
                {row.status === "todo" && row.dueAt && (
                  <div className="application-card-aside-countdown">
                    <InterviewCountdown target={row.dueAt} />
                  </div>
                )}
              </div>
              <Link
                className="card-hit application-card-meta-link"
                to={`/applications/${row.id}`}
                state={listLinkState(location)}
              >
                <div className="meta application-card-meta">
                  <span className="employer">{row.company}</span>
                  <span className="location">{row.location ?? ""}</span>
                  <ApplicationMetaBadges
                    status={row.status}
                    postingId={row.postingId}
                    source={row.source}
                  />
                </div>
              </Link>
            </div>
            {(row.status === "todo" ||
              (appliedLabel && row.status !== "todo") ||
              (row.url && row.status !== "todo")) && (
              <div
                className={
                  row.status === "todo"
                    ? "row-actions application-card-footer application-card-footer-todo"
                    : "row-actions application-card-footer"
                }
              >
                {row.status === "todo" && (
                  <form
                    className="application-card-apply-by"
                    onSubmit={(event) => void saveDueAt(event, row)}
                  >
                    <label className="application-apply-by-field">
                      <span className="application-apply-by-field-label">Apply by</span>
                      <input
                        type="date"
                        value={dueDraft.date}
                        disabled={pendingId === row.id}
                        onChange={(event) => setDueDraft(row.id, { date: event.target.value })}
                      />
                    </label>
                    <label className="application-apply-by-field">
                      <span className="application-apply-by-field-label">Time</span>
                      <input
                        type="time"
                        value={dueDraft.time}
                        disabled={pendingId === row.id}
                        onChange={(event) => setDueDraft(row.id, { time: event.target.value })}
                      />
                    </label>
                    <button
                      type="submit"
                      className="secondary"
                      disabled={pendingId === row.id || !dueDraft.date}
                    >
                      Save
                    </button>
                    {dueFlash[row.id] && (
                      <span className="save-flash-inline" role="status" aria-live="polite">
                        Saved!
                      </span>
                    )}
                  </form>
                )}
                {row.status === "todo" && row.url && (
                  <a
                    className="external application-card-apply-link"
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Apply on site
                    <span className="ext-icon" aria-hidden="true">↗</span>
                  </a>
                )}
                {appliedLabel && row.status !== "todo" && (
                  <span className="applied-date">Date applied: {appliedLabel}</span>
                )}
                {row.url && row.status !== "todo" && (
                  <a
                    className="external"
                    href={row.url}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(event) => event.stopPropagation()}
                  >
                    Link to posting
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
      {removeConfirm && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setRemoveConfirm(null);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <StepActionConfirm
              title="Remove from to-dos?"
              description="This deletes the to-do entry. You can add it again from Jobs, but it may be hard to find the same posting."
              confirmLabel="Remove"
              onConfirm={() => void confirmRemoveTodo()}
              onCancel={() => setRemoveConfirm(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
