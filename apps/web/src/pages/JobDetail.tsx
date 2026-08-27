import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { createApplication, getJob, type JobDetail } from "../api";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    getJob(id)
      .then(setJob)
      .catch((err: Error) => setError(err.message));
  }, [id]);

  async function setStatus(status: "starred" | "applied") {
    if (!job) return;
    const result = await createApplication({ postingId: job.id, status });
    if (status === "applied") navigate(`/applications/${result.id}`);
    else setJob(await getJob(job.id));
  }

  if (error) return <p className="error">{error}</p>;
  if (!job) return <p className="muted">Loading…</p>;

  return (
    <article className="detail">
      <p>
        <Link to="/">← Jobs</Link>
      </p>
      <h2>{job.title}</h2>
      <div className="meta">
        <span>{job.company}</span>
        {job.location && <span>{job.location}</span>}
        <span className="badge">{job.cycleStatus}</span>
        <span className="badge">{job.source}</span>
      </div>
      <p>
        <a href={job.url} target="_blank" rel="noreferrer">
          Apply / posting
        </a>
      </p>
      <div className="row-actions">
        <button type="button" className="secondary" onClick={() => setStatus("starred")}>
          Star
        </button>
        <button type="button" onClick={() => setStatus("applied")}>
          Mark applied
        </button>
      </div>
      <p className="muted">LLM ranking will show here later. Unranked jobs stay at the top of the list once scoring exists.</p>
      <div
        className="description"
        dangerouslySetInnerHTML={{
          __html: job.descriptionHtml || "<p class='muted'>No description stored (common for Simplify links).</p>",
        }}
      />
    </article>
  );
}
