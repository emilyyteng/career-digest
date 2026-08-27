import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getApplications, type ApplicationRow } from "../api";

const TABS = ["all", "starred", "applied", "interviewing", "hired", "declined"];

export default function Applications() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") ?? "all";
  const [rows, setRows] = useState<ApplicationRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getApplications(status)
      .then((data) => setRows(data.applications))
      .catch((err: Error) => setError(err.message));
  }, [status]);

  return (
    <section>
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab}
            type="button"
            className={tab === status ? "tab on" : "tab"}
            onClick={() => setParams(tab === "all" ? {} : { status: tab })}
          >
            {tab}
          </button>
        ))}
      </div>
      {error && <p className="error">{error}</p>}
      {rows.length === 0 && <p className="muted">Nothing in this tab yet.</p>}
      {rows.map((row) => (
        <article key={row.id} className="card">
          <h2>
            <Link to={`/applications/${row.id}`}>{row.title ?? "Untitled"}</Link>
          </h2>
          <div className="meta">
            <span>{row.company}</span>
            {row.location && <span>{row.location}</span>}
            <span className="badge">{row.status}</span>
            {row.postingId ? (
              <span className="badge">{row.source ?? "linked"}</span>
            ) : (
              <span className="badge">manual</span>
            )}
          </div>
        </article>
      ))}
    </section>
  );
}
