import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import {
  deleteDocument,
  getApplication,
  getJobs,
  patchApplication,
  uploadDocument,
  type ApplicationRow,
  type JobCard,
} from "../../api";
import { formatDueDateMdY, toDateInputValue } from "../../formatDate";
import ApplicationMetaBadges from "./ApplicationMetaBadges";
import RichTextField, { isEmptyRichHtml } from "../../RichTextField";
import DocumentPreviewModal from "./DocumentPreviewModal";
import { invalidateListCache } from "../../listCache";
import { listReturnTo } from "../../navigationReturn";

const STATUSES = [
  { id: "applied", label: "Applied" },
  { id: "interviewing", label: "Interviewing" },
  { id: "accepted", label: "Accepted" },
  { id: "declined", label: "Declined" },
] as const;

const FLASH_MS = 2500;

type FlashTarget = "stage" | "notes" | "description" | "upload" | "link";

export default function ApplicationDetail() {
  const location = useLocation();
  const { id } = useParams();
  const [row, setRow] = useState<ApplicationRow | null>(null);
  const [notes, setNotes] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [status, setStatus] = useState("applied");
  const [appliedAt, setAppliedAt] = useState("");
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
  const [stageSaving, setStageSaving] = useState(false);
  const [linkOpen, setLinkOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
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
    setStatus(data.status === "todo" ? "applied" : data.status);
    setAppliedAt(toDateInputValue(data.appliedAt));
    setUrl(data.url ?? "");
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [id]);

  const stageDirty =
    row != null &&
    (status !== (row.status === "todo" ? "applied" : row.status) ||
      appliedAt !== toDateInputValue(row.appliedAt) ||
      url.trim() !== (row.url ?? ""));

  async function saveStage(event: FormEvent) {
    event.preventDefault();
    if (!id || !row || !stageDirty || stageSaving) return;
    setStageSaving(true);
    setError(null);
    try {
      await patchApplication(id, {
        status,
        appliedAt: appliedAt || null,
        url: url.trim() || null,
      });
      invalidateListCache("applications:");
      invalidateListCache("jobs:");
      await load();
      showFlash("Saved!", "stage");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save stage");
    } finally {
      setStageSaving(false);
    }
  }

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
      setLinkOpen(false);
      await load();
      showFlash("Saved!", "link");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link posting");
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

  async function onRemoveDocument(docId: string) {
    if (!id) return;
    setError(null);
    try {
      await deleteDocument(id, docId);
      if (previewDoc?.id === docId) setPreviewDoc(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not remove document");
    }
  }

  function clearLinkSearch() {
    setMatches([]);
    setQuery("");
    setLinkOpen(false);
  }

  if (!row && error) return <p className="error">{error}</p>;
  if (!row) return <p className="muted">Loading…</p>;

  const appliedLabel = formatDueDateMdY(row.appliedAt);

  return (
    <article className="application-detail-page">
      <header className="application-detail-header-card">
        <p className="application-detail-back">
          <Link to={listReturnTo(location, "/applications")}>← Applications</Link>
        </p>
        <div className="application-detail-header-top">
          <h2 className="application-detail-title">{row.title}</h2>
          {row.url && (
            <a
              className="external"
              href={row.url}
              target="_blank"
              rel="noreferrer"
            >
              Open posting
              <span className="ext-icon" aria-hidden="true">
                ↗
              </span>
            </a>
          )}
        </div>
        <div className="application-detail-meta">
          <span>{row.company}</span>
          {row.location && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <span>{row.location}</span>
            </>
          )}
          {appliedLabel && row.status !== "todo" && (
            <>
              <span className="task-detail-meta-dot">·</span>
              <span>Applied: {appliedLabel}</span>
            </>
          )}
          <ApplicationMetaBadges
            status={row.status}
            postingId={row.postingId}
            source={row.source}
          />
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="application-detail-rail">
        <aside className="application-detail-rail-side">
          <section className="application-detail-section">
            <h3>Stage</h3>
            {row.status === "todo" && (
              <p className="muted application-detail-hint">
                Still on <Link to="/tasks">Tasks</Link> until marked applied.
              </p>
            )}
            <form onSubmit={(e) => void saveStage(e)}>
              <label>
                Status
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  {STATUSES.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Date applied
                <input
                  type="date"
                  value={appliedAt}
                  onChange={(e) => setAppliedAt(e.target.value)}
                />
              </label>
              <label>
                Apply / posting URL
                <input
                  type="url"
                  value={url}
                  placeholder="https://…"
                  onChange={(e) => setUrl(e.target.value)}
                />
              </label>
              <div className="application-detail-actions">
                {flash?.target === "stage" && (
                  <span className="save-flash-inline" role="status">
                    {flash.message}
                  </span>
                )}
                <button
                  type="submit"
                  className="secondary"
                  disabled={!stageDirty || stageSaving}
                >
                  {stageSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </section>

          <section className="application-detail-section application-detail-rail-card">
            <h3>Documents</h3>
            <ul className="document-list">
              {(row.documents ?? []).map((doc) => (
                <li key={doc.id} className="document-list-item">
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
                  <button
                    type="button"
                    className="document-remove-btn"
                    aria-label={`Remove ${doc.originalName}`}
                    onClick={() => void onRemoveDocument(doc.id)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
            <div className="application-detail-rail-action">
              <input
                ref={fileInputRef}
                type="file"
                className="visually-hidden"
                onChange={(e) => {
                  void onFile(e.target.files?.[0] ?? null);
                  e.target.value = "";
                }}
              />
              <button
                type="button"
                className="secondary"
                onClick={() => fileInputRef.current?.click()}
              >
                Upload…
              </button>
              {flash?.target === "upload" && (
                <span className="save-flash-inline" role="status">
                  {flash.message}
                </span>
              )}
            </div>
          </section>

          {!row.postingId && (
            <section className="application-detail-section application-detail-rail-card">
              <h3>Link posting</h3>
              {!linkOpen ? (
                <div className="application-detail-rail-action">
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => setLinkOpen(true)}
                  >
                    Search digest…
                  </button>
                </div>
              ) : (
                <>
                  <div className="application-detail-link-search">
                    <input
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search open jobs"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void searchJobs();
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => void searchJobs()}
                    >
                      Search
                    </button>
                  </div>
                  <ul className="application-detail-link-results">
                    {matches.map((job) => (
                      <li key={job.id} className="application-detail-link-result">
                        <div className="application-detail-link-result-main">
                          <strong>{job.title}</strong>
                          <span className="muted">
                            {job.company}
                            {job.location ? ` · ${job.location}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="secondary"
                          onClick={() => void linkPosting(job.id)}
                        >
                          Associate
                        </button>
                      </li>
                    ))}
                  </ul>
                  <div className="application-detail-rail-action">
                    <button
                      type="button"
                      className="secondary"
                      onClick={clearLinkSearch}
                    >
                      Clear search
                    </button>
                    {flash?.target === "link" && (
                      <span className="save-flash-inline" role="status">
                        {flash.message}
                      </span>
                    )}
                  </div>
                </>
              )}
            </section>
          )}
        </aside>

        <div className="application-detail-rail-main">
          {row.postingId ? (
            <section className="application-detail-section">
              <h3>Job description</h3>
              <div
                className="application-detail-jd-scroll"
                dangerouslySetInnerHTML={{
                  __html:
                    row.descriptionHtml ||
                    "<p class='muted'>No description stored (common for Simplify links).</p>",
                }}
              />
            </section>
          ) : (
            <section className="application-detail-section">
              <form onSubmit={(e) => void saveDescription(e)}>
                <h3>Job description</h3>
                <div className="application-detail-jd-scroll is-editable">
                  <RichTextField
                    value={descriptionHtml}
                    onChange={setDescriptionHtml}
                    placeholder="Paste the job description — links and formatting are kept"
                    minHeight="8rem"
                  />
                </div>
                <div className="application-detail-actions">
                  {flash?.target === "description" && (
                    <span className="save-flash-inline" role="status">
                      {flash.message}
                    </span>
                  )}
                  <button type="submit" className="secondary">
                    Save description
                  </button>
                </div>
              </form>
            </section>
          )}

          <section className="application-detail-section">
            <form onSubmit={(e) => void saveNotes(e)}>
              <h3>Notes</h3>
              <div className="application-detail-scrollbox application-detail-notes">
                <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div className="application-detail-actions">
                {flash?.target === "notes" && (
                  <span className="save-flash-inline" role="status">
                    {flash.message}
                  </span>
                )}
                <button type="submit" className="secondary">
                  Save notes
                </button>
              </div>
            </form>
          </section>

          <section className="application-detail-section application-detail-stickies">
            <div className="application-detail-stickies-head">
              <h3>Reflections</h3>
              <span className="task-detail-pill muted">coming later</span>
            </div>
            <div className="application-detail-stickies-scroll">
              <p className="muted">
                Reflections for this application and its interview steps will appear here,
                sectioned by step.
              </p>
            </div>
            <div className="application-detail-actions">
              <button type="button" className="secondary" disabled>
                Add reflection…
              </button>
            </div>
          </section>
        </div>
      </div>

      {previewDoc && row && (
        <DocumentPreviewModal
          url={`/api/applications/${row.id}/documents/${previewDoc.id}?view=1`}
          title={previewDoc.name}
          mimeType={previewDoc.mimeType}
          onClose={() => setPreviewDoc(null)}
        />
      )}
    </article>
  );
}
