import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { createApplication, getJobs, type JobCard } from "../api";

export default function Jobs() {
  const [q, setQ] = useState("");
  const [jobs, setJobs] = useState<JobCard[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function load(search = q) {
    const data = await getJobs(search);
    setJobs(data.jobs);
  }

  useEffect(() => {
    load("").catch((err: Error) => setError(err.message));
  }, []);

  async function setStatus(job: JobCard, status: "starred" | "applied") {
    await createApplication({ postingId: job.id, status });
    await load();
  }

  return (
    <section>
      <div className="toolbar">
        <input
          placeholder="Search title, company, location"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") load().catch((err: Error) => setError(err.message));
          }}
        />
        <button type="button" onClick={() => load().catch((err: Error) => setError(err.message))}>
          Search
        </button>
        <span className="muted">{jobs.length} open</span>
      </div>
      {error && <p className="error">{error}</p>}
      {jobs.map((job) => (
        <article key={job.id} className="card">
          <h2>
            <Link to={`/jobs/${job.id}`}>{job.title}</Link>
          </h2>
          <div className="meta">
            <span>{job.company}</span>
            {job.location && <span>{job.location}</span>}
            <span className={`badge ${job.cycleStatus === "target" ? "target" : ""}`}>
              {job.cycleStatus ?? "unspecified"}
            </span>
            <span className="badge">{job.source}</span>
            {job.applicationStatus === "starred" && <span className="badge">starred</span>}
          </div>
          <div className="row-actions">
            {job.applicationStatus !== "starred" && (
              <button type="button" className="secondary" onClick={() => setStatus(job, "starred")}>
                Star
              </button>
            )}
            <button type="button" onClick={() => setStatus(job, "applied")}>
              Applied
            </button>
            <a href={job.url} target="_blank" rel="noreferrer">
              Open posting
            </a>
          </div>
        </article>
      ))}
    </section>
  );
}
