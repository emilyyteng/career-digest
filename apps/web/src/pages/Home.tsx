import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getHomeDashboard, type HomeDashboard, type HomeJobPick } from "../api";
import InterviewCountdown from "../InterviewCountdown";
import { formatStepWhen } from "../formatDate";

const ATTENTION_LIMIT = 5;

function greetingPeriod(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function formatWhen(value: string | null | undefined): string | null {
  if (!value) return null;
  return formatStepWhen(value);
}

function PickList({ items, empty }: { items: HomeJobPick[]; empty: string }) {
  if (items.length === 0) return <p className="muted home-pick-empty">{empty}</p>;
  return (
    <ul className="home-list">
      {items.map((job) => (
        <li key={job.id} className="home-job-row">
          <Link to={`/jobs/${job.id}`} className="home-job-main">
            <span className="home-job-title">{job.company} · {job.title}</span>
            {job.location && <span className="muted home-job-meta">{job.location}</span>}
            {job.rankReason && job.pickKind !== "new_to_digest" && (
              <span className="muted home-job-meta home-rank-note">{job.rankReason}</span>
            )}
          </Link>
          {job.rankScore != null && (
            <span className="badge home-rank-badge">{job.rankScore}</span>
          )}
        </li>
      ))}
    </ul>
  );
}

function SeeMore({ to, label }: { to: string; label: string }) {
  return (
    <div className="home-see-more-row">
      <Link to={to} className="home-see-more">{label}</Link>
    </div>
  );
}

export default function Home() {
  const [data, setData] = useState<HomeDashboard | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getHomeDashboard().then(setData).catch((err: Error) => setError(err.message));
  }, []);

  if (error && !data) return <p className="error">{error}</p>;
  if (!data) return <p className="muted">Loading…</p>;

  const attention = data.needsAttention;
  const digestWhen = formatWhen(data.lastDigest.lastOkAt ?? data.lastDigest.finishedAt);
  const interviewTotal = attention.interviewActionCount;
  const starredTotal = data.starredTotal;

  return (
    <section className="home-page">
      <header className="home-hero card">
        <div className="home-hero-main">
          <h2 className="home-greeting">
            {greetingPeriod()}, {data.greetingName}
          </h2>
          <p className="muted home-hero-sub">
            Your internship digest at a glance.
          </p>
        </div>
        <div className="home-last-digest">
          <span className="home-last-digest-label">Last digest</span>
          <span className="home-last-digest-value">
            {digestWhen ?? "Not run yet"}
          </span>
          {data.lastDigest.status === "error" && data.lastDigest.error && (
            <span className="error home-digest-error">{data.lastDigest.error}</span>
          )}
          <Link to="/status" className="home-section-link">Pipeline status →</Link>
        </div>
      </header>

      <section className="card home-section home-attention-card">
        <h3 className="home-section-title">Needs attention</h3>

        <div className="home-attention-subsection">
          <h4 className="home-subheading">Interviews</h4>
          {attention.interviews.length === 0 ? (
            <p className="muted home-pick-empty">No interviews need action.</p>
          ) : (
            <>
              <ul className="home-list">
                {attention.interviews.map((row) => (
                  <li key={row.threadId} className="home-job-row home-interview-row">
                    <Link to={`/interviews/${row.threadId}`} className="home-job-main">
                      <span className="home-job-title">
                        {row.company ?? "Unknown"} · {row.primaryTitle ?? "Untitled"}
                      </span>
                      {row.nextStepTitle && (
                        <span className="muted home-job-meta">{row.nextStepTitle}</span>
                      )}
                    </Link>
                    {row.deadlineIso && (
                      <div className="home-interview-deadline">
                        {row.deadlineLabel && (
                          <div className="home-interview-deadline-date">{row.deadlineLabel}</div>
                        )}
                        <InterviewCountdown target={row.deadlineIso} />
                      </div>
                    )}
                  </li>
                ))}
              </ul>
              {interviewTotal > ATTENTION_LIMIT && (
                <SeeMore to="/interviews" label="See more →" />
              )}
            </>
          )}
        </div>

        <div className="home-attention-subsection">
          <h4 className="home-subheading">Starred roles</h4>
          {data.starred.length === 0 ? (
            <p className="muted home-pick-empty">No starred roles yet.</p>
          ) : (
            <>
              <ul className="home-list">
                {data.starred.map((row) => (
                  <li key={row.id} className="home-job-row">
                    <Link to={`/applications/${row.id}`} className="home-job-main">
                      <span className="home-job-title">
                        {row.company ?? "Unknown"} · {row.title ?? "Untitled"}
                      </span>
                      {row.location && (
                        <span className="muted home-job-meta">{row.location}</span>
                      )}
                    </Link>
                  </li>
                ))}
              </ul>
              {starredTotal > ATTENTION_LIMIT && (
                <SeeMore to="/applications?status=starred" label="See more →" />
              )}
            </>
          )}
        </div>
      </section>

      <section className="card home-section home-picks-card">
        <div className="home-section-head">
          <h3 className="home-section-title">New &amp; top picks</h3>
          <Link to="/jobs" className="home-section-link">Browse jobs →</Link>
        </div>
        <div className="home-picks-grid">
          <div className="home-picks-col">
            <h4 className="home-subheading">Top ranked</h4>
            <PickList items={data.newAndTopPicks.topRanked} empty="No ranked jobs yet." />
          </div>
          <div className="home-picks-col">
            <h4 className="home-subheading">Newly ranked</h4>
            <PickList items={data.newAndTopPicks.newlyRanked} empty="No new rankings this week." />
          </div>
          <div className="home-picks-col">
            <h4 className="home-subheading">New to digest</h4>
            <PickList items={data.newAndTopPicks.newToDigest} empty="No new listings recently." />
          </div>
        </div>
      </section>
    </section>
  );
}
