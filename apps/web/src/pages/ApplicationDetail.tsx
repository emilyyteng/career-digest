import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  getApplication,
  getJobs,
  patchApplication,
  uploadDocument,
  type ApplicationRow,
  type JobCard,
} from "../api";
import {
  combineApplyByDateTime,
  formatShortDate,
  toDateInputValue,
  applyByTimeInputValue,
  DEFAULT_APPLY_BY_TIME,
} from "../formatDate";
import InterviewCountdown from "../InterviewCountdown";
import ApplicationMetaBadges from "../ApplicationMetaBadges";
import RichTextField, { isEmptyRichHtml } from "../RichTextField";
import DocumentPreviewModal from "../DocumentPreviewModal";
import { invalidateListCache } from "../listCache";
import { listReturnTo } from "../navigationReturn";

const STATUSES = [
  { id: "todo", label: "To-do", hint: "Planned to apply. Stays on Jobs." },
  { id: "applied", label: "Applied", hint: "Leaves the Jobs list." },
  { id: "interviewing", label: "Interviewing", hint: "Leaves the Jobs list." },
  { id: "accepted", label: "Accepted", hint: "Leaves the Jobs list." },
  { id: "declined", label: "Declined", hint: "Leaves the Jobs list." },
] as const;

const FLASH_MS = 2500;

type FlashTarget =
  | "status"
  | "description"
  | "notes"
  | "appliedAt"
  | "dueAt"
  | "url"
  | "upload"
  | "link";

export default function ApplicationDetail() {
  const location = useLocation();
  const { id } = useParams();
  const [row, setRow] = useState<ApplicationRow | null>(null);
  const [notes, setNotes] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [applyByDate, setApplyByDate] = useState("");
  const [applyByTime, setApplyByTime] = useState(DEFAULT_APPLY_BY_TIME);
  const [url, setUrl] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<JobCard[]>([]);
  const [previewDoc, setPreviewDoc] = useState<{
    id: string;
    name: string;
    mimeType: string | null;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<{ target: FlashTarget; message: string } | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const flashTimer = useRef<number | null>(null);

  function showFlash(message: string, target: FlashTarget) {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    setFlash({ target, message });
    flashTimer.current = window.setTimeout(() => {
      setFlash(null);
      flashTimer.current = null;
    }, FLASH_MS);
  }

  useEffect(() => {
    return () => {
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, []);

  async function load() {
    if (!id) return;
    const data = await getApplication(id);
    setRow(data);
    setNotes(data.notes ?? "");
    setDescriptionHtml(data.descriptionHtml ?? "");
    setAppliedAt(toDateInputValue(data.appliedAt));
    setApplyByDate(toDateInputValue(data.dueAt));
    setApplyByTime(applyByTimeInputValue(data.dueAt));
    setUrl(data.url ?? "");
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [id]);

  async function saveNotes(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setError(null);
    try {
      await patchApplication(id, { notes });
      await load();
      showFlash("Saved!", "notes");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save notes");
    }
  }

  async function saveDescription(event: FormEvent) {
    event.preventDefault();
    if (!id || row?.postingId) return;
    setError(null);
    try {
      await patchApplication(id, {
        descriptionHtml: isEmptyRichHtml(descriptionHtml) ? null : descriptionHtml,
      });
      await load();
      showFlash("Saved!", "description");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save description");
    }
  }

  async function saveAppliedAt(event: FormEvent) {
    event.preventDefault();
    if (!id || !row || row.status === "todo") return;
    setError(null);
    try {
      await patchApplication(id, { appliedAt: appliedAt || null });
      await load();
      showFlash("Saved!", "appliedAt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save date");
    }
  }

  async function saveStatus(status: string) {
    if (!id || !row || status === row.status || statusPending) return;
    setStatusPending(true);
    setError(null);
    try {
      await patchApplication(id, { status });
      invalidateListCache("applications:");
      invalidateListCache("jobs:");
      await load();
      showFlash("Saved!", "status");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setStatusPending(false);
    }
  }

  async function saveApplyBy(event: FormEvent) {
    event.preventDefault();
    if (!id || !row || row.status !== "todo") return;
    setError(null);
    try {
      const dueAt = applyByDate ? combineApplyByDateTime(applyByDate, applyByTime) : null;
      await patchApplication(id, { dueAt });
      invalidateListCache("applications:");
      await load();
      showFlash("Saved!", "dueAt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save apply-by date");
    }
  }

  async function clearApplyBy() {
    if (!id || !row || row.status !== "todo" || !row.dueAt) return;
    setError(null);
    try {
      await patchApplication(id, { dueAt: null });
      invalidateListCache("applications:");
      setApplyByDate("");
      setApplyByTime("");
      await load();
      showFlash("Cleared!", "dueAt");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not clear apply-by date");
    }
  }

  async function searchJobs() {
    const data = await getJobs(query, 1, 40);
    setMatches(data.jobs);
  }

  async function linkPosting(postingId: string) {
    if (!id) return;
    setError(null);
    try {
      await patchApplication(id, { postingId });
      invalidateListCache("applications:");
      invalidateListCache("jobs:");
      setMatches([]);
      await load();
      showFlash("Saved!", "link");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link posting");
    }
  }

  async function saveUrl(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    setError(null);
    try {
      await patchApplication(id, { url: url.trim() || null });
      invalidateListCache("applications:");
      invalidateListCache("jobs:");
      await load();
      showFlash("Saved!", "url");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save URL");
    }
  }

  async function onFile(file: File | null) {
    if (!id || !file) return;
    setError(null);
    try {
      await uploadDocument(id, file);
      await load();
      showFlash("Uploaded!", "upload");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload document");
    }
  }

  if (!row && error) return <p className="error">{error}</p>;
  if (!row) return <p className="muted">Loading…</p>;

  const current = STATUSES.find((item) => item.id === row.status);
  const appliedLabel = formatShortDate(row.appliedAt);

  return (
    <article className="detail">
      <div className="application-detail-header">
        <p className="application-detail-back">
          <Link to={listReturnTo(location, "/applications")}>← Applications</Link>
        </p>
        {row.status === "todo" && row.dueAt && (
          <div className="application-detail-countdown-top">
            <InterviewCountdown target={row.dueAt} />
          </div>
        )}
        <h2>{row.title}</h2>
        <div className="meta application-detail-meta">
          <span className="employer">{row.company}</span>
          <span className="location">{row.location ?? ""}</span>
          <ApplicationMetaBadges
            status={row.status}
            postingId={row.postingId}
            source={row.source}
          />
        </div>
      </div>
      {appliedLabel && row.status !== "todo" && (
        <div className="detail-footer-meta">
          <span className="applied-date">Date applied: {appliedLabel}</span>
        </div>
      )}
      {error && <p className="error">{error}</p>}
      <form className="inline-date-form url-edit-form" onSubmit={saveUrl}>
        <label>
          Apply / posting URL
          <input
            type="url"
            value={url}
            placeholder="https://…"
            onChange={(event) => setUrl(event.target.value)}
          />
          <span className="field-hint muted">
            {row.postingId
              ? "Overrides the linked digest URL for this application when set."
              : "Used for Apply on site links."}
          </span>
        </label>
        <div className="save-inline-row save-end">
          <button type="submit" className="secondary">Save URL</button>
          {flash?.target === "url" && (
            <span className="save-flash-inline" role="status" aria-live="polite">
              {flash.message}
            </span>
          )}
        </div>
      </form>
      <div className="status-block">
        <div className="status-block-head">
          <h3>Tracker stage</h3>
          {row.url && (
            <a
              className="external application-detail-apply-link"
              href={row.url}
              target="_blank"
              rel="noreferrer"
            >
              {row.status === "todo" ? "Open apply link" : "Open posting"}
              <span className="ext-icon" aria-hidden="true">↗</span>
            </a>
          )}
        </div>
        <p className="muted">
          Current: <strong>{current?.label ?? row.status}</strong>. These buttons move this role
          between Applications tabs. They do not apply for you.
        </p>
        {flash?.target === "status" && (
          <p className="save-flash" role="status" aria-live="polite">
            {flash.message}
          </p>
        )}
        <div className="status-pills" role="radiogroup" aria-label="Tracker stage">
          {STATUSES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={item.id === row.status}
              aria-pressed={item.id === row.status}
              className={
                item.id === row.status
                  ? "secondary status-pill-on"
                  : "secondary"
              }
              disabled={statusPending}
              title={item.hint}
              onClick={() => saveStatus(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {row.status !== "todo" && (
          <form className="inline-date-form" onSubmit={saveAppliedAt}>
            <label>
              Date applied
              <input
                type="date"
                value={appliedAt}
                onChange={(event) => setAppliedAt(event.target.value)}
              />
            </label>
            <div className="save-inline-row save-end">
              <button type="submit" className="secondary">
                Save date
              </button>
              {flash?.target === "appliedAt" && (
                <span className="save-flash-inline" role="status" aria-live="polite">
                  {flash.message}
                </span>
              )}
            </div>
          </form>
        )}
        {row.status === "todo" && (
          <form className="inline-date-form application-apply-by-form" onSubmit={saveApplyBy}>
            <div className="application-detail-apply-by-row">
              <div className="application-detail-datetime">
                <label className="application-apply-by-field">
                  <span className="application-apply-by-field-label">Apply by</span>
                  <input
                    type="date"
                    value={applyByDate}
                    onChange={(event) => setApplyByDate(event.target.value)}
                  />
                </label>
                <label className="application-apply-by-field">
                  <span className="application-apply-by-field-label">Time</span>
                  <input
                    type="time"
                    value={applyByTime}
                    onChange={(event) => setApplyByTime(event.target.value)}
                  />
                </label>
              </div>
              <div className="save-inline-row application-detail-apply-actions">
                <button type="submit" className="secondary" disabled={!applyByDate}>
                  Save
                </button>
                {row.dueAt && (
                  <button type="button" className="secondary" onClick={() => void clearApplyBy()}>
                    Clear
                  </button>
                )}
                {flash?.target === "dueAt" && (
                  <span className="save-flash-inline" role="status" aria-live="polite">
                    {flash.message}
                  </span>
                )}
              </div>
            </div>
          </form>
        )}
      </div>
      {row.postingId ? (
        <div className="description description-scroll">
          <h3>Job description</h3>
          <div
            className="description-body"
            dangerouslySetInnerHTML={{
              __html:
                row.descriptionHtml ||
                "<p class='muted'>No description stored (common for Simplify links).</p>",
            }}
          />
        </div>
      ) : (
        <form className="form description-form" onSubmit={saveDescription}>
          <h3>Job description</h3>
          <RichTextField
            value={descriptionHtml}
            onChange={setDescriptionHtml}
            placeholder="Paste the job description — links and formatting are kept"
            minHeight="12rem"
          />
          <div className="save-inline-row save-end">
            <button type="submit" className="secondary">Save description</button>
            {flash?.target === "description" && (
              <span className="save-flash-inline" role="status" aria-live="polite">
                {flash.message}
              </span>
            )}
          </div>
        </form>
      )}
      <form onSubmit={saveNotes}>
        <h3>Notes</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        <div className="save-inline-row save-end">
          <button type="submit" className="secondary">Save notes</button>
          {flash?.target === "notes" && (
            <span className="save-flash-inline" role="status" aria-live="polite">
              {flash.message}
            </span>
          )}
        </div>
      </form>
      <h3>Documents</h3>
      <ul className="document-list">
        {(row.documents ?? []).map((doc) => (
          <li key={doc.id}>
            <button
              type="button"
              className="document-link"
              onClick={() =>
                setPreviewDoc({
                  id: doc.id,
                  name: doc.originalName,
                  mimeType: doc.mimeType,
                })
              }
            >
              {doc.originalName}
            </button>
          </li>
        ))}
      </ul>
      {previewDoc && row && (
        <DocumentPreviewModal
          url={`/api/applications/${row.id}/documents/${previewDoc.id}?view=1`}
          title={previewDoc.name}
          mimeType={previewDoc.mimeType}
          onClose={() => setPreviewDoc(null)}
        />
      )}
      <div className="save-inline-row upload-row">
        <input type="file" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        {flash?.target === "upload" && (
          <span className="save-flash-inline" role="status" aria-live="polite">
            {flash.message}
          </span>
        )}
      </div>
      {!row.postingId && (
        <div>
          <h3>Link a digest posting</h3>
          <p className="muted">
            If this is the same role the ingest later found (or a posting you already marked to-do), search
            and associate it. Duplicate tracker rows for that posting are merged. Applied+ postings
            then leave the Jobs list; to-do ones stay there until you mark applied.
          </p>
          <div className="toolbar toolbar-search-end">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search open jobs"
            />
            <button type="button" className="secondary" onClick={() => searchJobs()}>
              Search
            </button>
          </div>
          {matches.map((job) => (
            <div key={job.id} className="card">
              <strong>{job.title}</strong>
              <div className="meta">
                <span className="employer">{job.company}</span>
                <span className="location">{job.location ?? ""}</span>
              </div>
              <div className="save-inline-row">
                <button type="button" className="secondary" onClick={() => linkPosting(job.id)}>
                  Associate
                </button>
                {flash?.target === "link" && (
                  <span className="save-flash-inline" role="status" aria-live="polite">
                    {flash.message}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
