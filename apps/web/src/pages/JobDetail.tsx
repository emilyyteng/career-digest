import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  clearJobFeedback,
  createApplication,
  deleteApplication,
  getJob,
  sendJobFeedback,
  type JobDetail,
} from "../api";
import { RankBadges, RankNote } from "../RankMark";
import StarButton from "../StarButton";
import FeedbackDialog from "./FeedbackDialog";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<"like" | "dismiss" | "unlike" | null>(null);

  async function load() {
    if (!id) return;
    setJob(await getJob(id));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [id]);

  async function toggleStar() {
    if (!job || pending) return;
    setPending(true);
    try {
      if (job.applicationStatus === "starred" && job.applicationId) {
        await deleteApplication(job.applicationId);
      } else {
        await createApplication({ postingId: job.id, status: "starred" });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update star");
    } finally {
      setPending(false);
    }
  }

  async function markApplied() {
    if (!job) return;
    const result = await createApplication({ postingId: job.id, status: "applied" });
    navigate(`/applications/${result.id}`);
  }

  async function confirmFeedback(note: string) {
    if (!job || !dialog) return;
    setPending(true);
    try {
      if (dialog === "unlike") {
        await clearJobFeedback(job.id);
        await load();
      } else {
        await sendJobFeedback(job.id, dialog, note);
        if (dialog === "dismiss") {
          navigate("/");
          return;
        }
        await load();
      }
      setDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback");
    } finally {
      setPending(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!job) return <p className="muted">Loading…</p>;

  return (
    <article className="detail">
      <StarButton
        starred={job.applicationStatus === "starred"}
        disabled={pending}
        onClick={() => toggleStar()}
      />
      <p>
        <Link to="/">← Jobs</Link>
      </p>
      <h2>{job.title}</h2>
      <div className="meta">
        <span className="employer">{job.company}</span>
        <span className="location">{job.location ?? ""}</span>
        <RankBadges job={job} />
      </div>
      <p>
        <a className="external" href={job.url} target="_blank" rel="noreferrer">
          Apply on site <span className="ext-icon" aria-hidden="true">↗</span>
        </a>
      </p>
      <div className="row-actions">
        <button type="button" onClick={() => markApplied()}>
          Mark applied
        </button>
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={() => setDialog(job.feedbackKind === "like" ? "unlike" : "like")}
        >
          {job.feedbackKind === "like" ? "Liked" : "Like"}
        </button>
        <button
          type="button"
          className="secondary"
          disabled={pending}
          onClick={() => setDialog("dismiss")}
        >
          Dismiss
        </button>
      </div>
      <RankNote job={job} />
      <div
        className="description"
        dangerouslySetInnerHTML={{
          __html: job.descriptionHtml || "<p class='muted'>No description stored (common for Simplify links).</p>",
        }}
      />
      {dialog && (
        <FeedbackDialog
          kind={dialog}
          title={`${job.company} — ${job.title}`}
          pending={pending}
          onCancel={() => setDialog(null)}
          onConfirm={(note) => void confirmFeedback(note)}
        />
      )}
    </article>
  );
}
