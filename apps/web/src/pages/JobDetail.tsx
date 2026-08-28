import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  clearJobFeedback,
  createApplication,
  deleteApplication,
  getJob,
  getRerankQueue,
  queueJobRerank,
  sendJobFeedback,
  type JobDetail,
  type RerankQueueSnapshot,
} from "../api";
import { isBlankJobDescription, isMismatch, RankBadges, RankNote } from "../RankMark";
import StarButton from "../StarButton";
import FeedbackDialog from "./FeedbackDialog";
import RerankDialog from "./RerankDialog";

export default function JobDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<"like" | "dismiss" | "unlike" | null>(null);
  const [rerankOpen, setRerankOpen] = useState(false);
  const [rerankQueue, setRerankQueue] = useState<RerankQueueSnapshot["items"]>([]);
  const wasReranking = useRef(false);

  async function load() {
    if (!id) return;
    setJob(await getJob(id));
  }

  useEffect(() => {
    load().catch((err: Error) => setError(err.message));
  }, [id]);

  useEffect(() => {
    getRerankQueue()
      .then((snapshot) => setRerankQueue(snapshot.items))
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const active = rerankQueue.some(
      (item) => item.status === "queued" || item.status === "running",
    );
    if (!active) return;
    wasReranking.current = true;
    const timer = window.setInterval(() => {
      getRerankQueue()
        .then((snapshot) => setRerankQueue(snapshot.items))
        .catch(() => undefined);
    }, 2000);
    return () => window.clearInterval(timer);
  }, [rerankQueue]);

  useEffect(() => {
    if (rerankQueue.some((item) => item.status === "queued" || item.status === "running")) {
      return;
    }
    if (!wasReranking.current) return;
    wasReranking.current = false;
    void load().catch(() => undefined);
  }, [rerankQueue]);

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
        await load();
      }
      setDialog(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback");
    } finally {
      setPending(false);
    }
  }

  async function confirmRerank(note: string) {
    if (!job) return;
    setPending(true);
    try {
      await queueJobRerank(job.id, note);
      setRerankOpen(false);
      const snapshot = await getRerankQueue();
      setRerankQueue(snapshot.items);
      wasReranking.current = true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not queue rerank");
    } finally {
      setPending(false);
    }
  }

  if (error) return <p className="error">{error}</p>;
  if (!job) return <p className="muted">Loading…</p>;

  const mismatch = isMismatch(job);
  const needsDescription = isBlankJobDescription(job.descriptionHtml);
  const rerank = rerankQueue.find((item) => item.postingId === job.id);
  const rerankBusy =
    rerank?.status === "queued" || rerank?.status === "running" || pending;

  return (
    <article className="detail">
      <StarButton
        starred={job.applicationStatus === "starred"}
        disabled={pending}
        onClick={() => toggleStar()}
      />
      <p>
        <Link to="/jobs">← Jobs</Link>
      </p>
      <h2>{job.title}</h2>
      <div className="meta">
        <span className="employer">{job.company}</span>
        <span className="location">{job.location ?? ""}</span>
        <RankBadges
          job={job}
          view={needsDescription ? "needs-description" : undefined}
        />
      </div>
      <p>
        <a className="external" href={job.url} target="_blank" rel="noreferrer">
          Apply on site <span className="ext-icon" aria-hidden="true">↗</span>
        </a>
      </p>
      <div className="row-actions">
        <button type="button" className="secondary" onClick={() => markApplied()}>
          Applied<span className="btn-icon" aria-hidden="true">✓</span>
        </button>
        {!needsDescription &&
          (mismatch ? (
            <button
              type="button"
              className="secondary"
              disabled={rerankBusy}
              onClick={() => setRerankOpen(true)}
            >
              {rerank?.status === "queued" || rerank?.status === "running" ? (
                <>
                  <span className="spinner" aria-hidden="true" />
                  Reranking…
                </>
              ) : rerank?.status === "error" ? (
                "Rerank failed"
              ) : (
                "Rerank"
              )}
            </button>
          ) : (
            <>
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
                Mismatch
              </button>
            </>
          ))}
      </div>
      {rerank?.status === "error" && rerank.error && (
        <p className="error">{rerank.error}</p>
      )}
      <RankNote
        job={job}
        view={needsDescription ? "needs-description" : undefined}
      />
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
      {rerankOpen && (
        <RerankDialog
          title={`${job.company} — ${job.title}`}
          pending={pending}
          onCancel={() => setRerankOpen(false)}
          onConfirm={(note) => void confirmRerank(note)}
        />
      )}
    </article>
  );
}
