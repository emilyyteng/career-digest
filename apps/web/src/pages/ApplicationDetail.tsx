import { useEffect, useState, type FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import {
  getApplication,
  getJobs,
  patchApplication,
  uploadDocument,
  type ApplicationRow,
  type JobCard,
} from "../api";

const STATUSES = ["starred", "applied", "interviewing", "hired", "declined"];

export default function ApplicationDetail() {
  const { id } = useParams();
  const [row, setRow] = useState<ApplicationRow | null>(null);
  const [notes, setNotes] = useState("");
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<JobCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!id) return;
    const data = await getApplication(id);
    setRow(data);
    setNotes(data.notes ?? "");
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [id]);

  async function saveNotes(event: FormEvent) {
    event.preventDefault();
    if (!id) return;
    await patchApplication(id, { notes });
    await load();
  }

  async function saveStatus(status: string) {
    if (!id) return;
    await patchApplication(id, { status });
    await load();
  }

  async function searchJobs() {
    const data = await getJobs(query);
    setMatches(data.jobs);
  }

  async function linkPosting(postingId: string) {
    if (!id) return;
    await patchApplication(id, { postingId });
    setMatches([]);
    await load();
  }

  async function onFile(file: File | null) {
    if (!id || !file) return;
    await uploadDocument(id, file);
    await load();
  }

  if (error) return <p className="error">{error}</p>;
  if (!row) return <p className="muted">Loading…</p>;

  return (
    <article className="detail">
      <p>
        <Link to="/applications">← Applications</Link>
      </p>
      <h2>{row.title}</h2>
      <div className="meta">
        <span>{row.company}</span>
        {row.location && <span>{row.location}</span>}
        <span className="badge">{row.status}</span>
        {row.postingId ? <span className="badge">linked to digest</span> : <span className="badge">manual</span>}
      </div>
      {row.url && (
        <p>
          <a href={row.url} target="_blank" rel="noreferrer">
            Open posting
          </a>
        </p>
      )}
      <div className="row-actions">
        {STATUSES.map((status) => (
          <button
            key={status}
            type="button"
            className={status === row.status ? undefined : "secondary"}
            onClick={() => saveStatus(status)}
          >
            {status}
          </button>
        ))}
      </div>
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
                <span>{job.company}</span>
                <span>{job.location}</span>
              </div>
              <button type="button" onClick={() => linkPosting(job.id)}>
                Associate
              </button>
            </div>
          ))}
        </div>
      )}
      {row.postingId && row.descriptionHtml && (
        <div className="description" dangerouslySetInnerHTML={{ __html: row.descriptionHtml }} />
      )}
    </article>
  );
}
