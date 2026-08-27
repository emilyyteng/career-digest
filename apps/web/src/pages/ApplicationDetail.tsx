import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deleteApplication,
  getApplication,
  getJobs,
  patchApplication,
  uploadDocument,
  type ApplicationRow,
  type JobCard,
} from "../api";
import { formatShortDate, toDateInputValue } from "../formatDate";
import PostingDates from "../PostingDates";
import RichTextField, { isEmptyRichHtml } from "../RichTextField";
import StarButton from "../StarButton";

const STATUSES = [
  { id: "starred", label: "Starred", hint: "Saved, not applied yet. Stays on Jobs." },
  { id: "applied", label: "Applied", hint: "Leaves the Jobs list." },
  { id: "interviewing", label: "Interviewing", hint: "Leaves the Jobs list." },
  { id: "hired", label: "Hired", hint: "Leaves the Jobs list." },
  { id: "declined", label: "Declined", hint: "Leaves the Jobs list." },
] as const;

const FLASH_MS = 2500;

export default function ApplicationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [row, setRow] = useState<ApplicationRow | null>(null);
  const [notes, setNotes] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const [appliedAt, setAppliedAt] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<JobCard[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const flashTimer = useRef<number | null>(null);

  function showFlash(message: string) {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    setFlash(message);
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
      showFlash("Saved!");
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
      showFlash("Saved!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save description");
    }
  }

  async function saveAppliedAt(event: FormEvent) {
    event.preventDefault();
    if (!id || !row || row.status === "starred") return;
    setError(null);
    try {
      await patchApplication(id, { appliedAt: appliedAt || null });
      await load();
      showFlash("Saved!");
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
      await load();
      showFlash("Saved!");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update status");
    } finally {
      setStatusPending(false);
    }
  }

  async function unstar() {
    if (!row || row.status !== "starred") return;
    await deleteApplication(row.id);
    navigate("/applications?status=starred");
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
      setMatches([]);
      await load();
      showFlash("Saved!");
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
      showFlash("Uploaded!");
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
      {row.status === "starred" && (
        <StarButton starred onClick={() => void unstar()} />
      )}
      <p>
        <Link to="/applications">← Applications</Link>
      </p>
      <h2>{row.title}</h2>
      <div className="meta">
        <span className="employer">{row.company}</span>
        <span className="location">{row.location ?? ""}</span>
        <span className="meta-badges">
          {row.status !== "starred" && (
            <span className={`badge status-${row.status}`}>{row.status}</span>
          )}
          {row.postingId ? (
            <span className="badge">linked to digest</span>
          ) : (
            <span className="badge">manual</span>
          )}
          <PostingDates
            firstPublishedAt={row.firstPublishedAt}
            sourceUpdatedAt={row.sourceUpdatedAt}
          />
        </span>
      </div>
      <div className="detail-footer-meta">
        {appliedLabel && (
          <span className="applied-date">Date applied: {appliedLabel}</span>
        )}
        {row.url && (
          <a className="external" href={row.url} target="_blank" rel="noreferrer">
            Apply on site <span className="ext-icon" aria-hidden="true">↗</span>
          </a>
        )}
      </div>
      {flash && (
        <p className="save-flash" role="status" aria-live="polite">
          {flash}
        </p>
      )}
      {error && <p className="error">{error}</p>}
      <div className="status-block">
        <h3>Tracker stage</h3>
        <p className="muted">
          Current: <strong>{current?.label ?? row.status}</strong>. These buttons move this role
          between Applications tabs. They do not apply for you.
        </p>
        <div className="status-pills" role="radiogroup" aria-label="Tracker stage">
          {STATUSES.map((item) => (
            <button
              key={item.id}
              type="button"
              role="radio"
              aria-checked={item.id === row.status}
              aria-pressed={item.id === row.status}
              className={item.id === row.status ? undefined : "secondary"}
              disabled={statusPending}
              title={item.hint}
              onClick={() => saveStatus(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {row.status !== "starred" && (
          <form className="inline-date-form" onSubmit={saveAppliedAt}>
            <label>
              Date applied
              <input
                type="date"
                value={appliedAt}
                onChange={(event) => setAppliedAt(event.target.value)}
              />
            </label>
            <button type="submit" className="secondary">
              Save date
            </button>
          </form>
        )}
      </div>
      {row.postingId ? (
        <div className="description">
          <h3>Job description</h3>
          <div
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
          <p>
            <button type="submit">Save description</button>
          </p>
        </form>
      )}
      <form onSubmit={saveNotes}>
        <h3>Notes</h3>
        <textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
        <p>
          <button type="submit">Save notes</button>
        </p>
      </form>
      <h3>Documents</h3>
      <ul>
        {(row.documents ?? []).map((doc) => (
          <li key={doc.id}>
            <a href={`/api/applications/${row.id}/documents/${doc.id}`}>{doc.originalName}</a>
          </li>
        ))}
      </ul>
      <input type="file" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
      {!row.postingId && (
        <div>
          <h3>Link a digest posting</h3>
          <p className="muted">
            If this is the same role the ingest later found (or a posting you already starred), search
            and associate it. Duplicate tracker rows for that posting are merged. Applied+ postings
            then leave the Jobs list; starred ones stay there until you mark applied.
          </p>
          <div className="toolbar">
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
              <button type="button" onClick={() => linkPosting(job.id)}>
                Associate
              </button>
            </div>
          ))}
        </div>
      )}
    </article>
  );
}
