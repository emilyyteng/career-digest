import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  clearJobFeedback,
  createApplication,
  deleteApplication,
  getJob,
  getRerankQueue,
  patchJob,
  queueJobRerank,
  sendJobFeedback,
  type JobDetail,
  type RerankQueueSnapshot,
} from "../api";
import { invalidateListCache } from "../listCache";
import { isBlankJobDescription, isMismatch, RankBadges, RankNote } from "../RankMark";
import JobFeedbackButtons from "../JobFeedbackButtons";
import FeedbackDialog from "./FeedbackDialog";
import { listReturnTo } from "../navigationReturn";
import RerankDialog from "./RerankDialog";
import StepActionConfirm from "../StepActionConfirm";

export default function JobDetail() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetail | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [dialog, setDialog] = useState<"like" | "dismiss" | "unlike" | null>(null);
  const [appliedConfirm, setAppliedConfirm] = useState(false);
  const [rerankOpen, setRerankOpen] = useState(false);
  const [rerankQueue, setRerankQueue] = useState<RerankQueueSnapshot["items"]>([]);
  const [urlDraft, setUrlDraft] = useState("");
  const [urlFlash, setUrlFlash] = useState<string | null>(null);
  const wasReranking = useRef(false);
  const urlFlashTimer = useRef<number | null>(null);

  async function load() {
    if (!id) return;
    const data = await getJob(id);
    setJob(data);
    setUrlDraft(data.url);
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

  useEffect(() => {
    return () => {
      if (urlFlashTimer.current) window.clearTimeout(urlFlashTimer.current);
    };
  }, []);

  async function saveUrl(event: FormEvent) {
    event.preventDefault();
    if (!job) return;
    setPending(true);
    setUrlFlash(null);
    try {
      await patchJob(job.id, { url: urlDraft.trim() });
      invalidateListCache("jobs:");
      await load();
      setUrlFlash("Saved!");
      if (urlFlashTimer.current) window.clearTimeout(urlFlashTimer.current);
      urlFlashTimer.current = window.setTimeout(() => {
        setUrlFlash(null);
        urlFlashTimer.current = null;
      }, 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save URL");
    } finally {
      setPending(false);
    }
  }

  async function toggleTodo() {
    if (!job || pending) return;
    setPending(true);
    try {
      if (job.applicationStatus === "todo" && job.applicationId) {
        await deleteApplication(job.applicationId);
      } else {
        await createApplication({ postingId: job.id, status: "todo" });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update to-do");
    } finally {
      setPending(false);
    }
  }

  async function confirmApplied() {
    if (!job) return;
    setAppliedConfirm(false);
    try {
      const result = await createApplication({ postingId: job.id, status: "applied" });
      navigate(`/applications/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark applied");
    }
  }

  async function markApplied() {
    setAppliedConfirm(true);
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

  if (error && !job) return <p className="error">{error}</p>;
  if (!job) return <p className="muted">Loading…</p>;

  const mismatch = isMismatch(job);
  const needsDescription = isBlankJobDescription(job.descriptionHtml);
  const rerank = rerankQueue.find((item) => item.postingId === job.id);
  const rerankBusy =
    rerank?.status === "queued" || rerank?.status === "running" || pending;

  return (
    <article className="detail">
      <p>
        <Link to={listReturnTo(location, "/jobs")}>← Jobs</Link>
      </p>
      <div className="card-title-row detail-title-row">
        <h2>{job.title}</h2>
        <JobFeedbackButtons
          liked={job.feedbackKind === "like"}
          dismissed={job.feedbackKind === "dismiss"}
          disabled={pending}
          onLike={() => setDialog(job.feedbackKind === "like" ? "unlike" : "like")}
          onDismiss={() => setDialog("dismiss")}
        />
      </div>
      <div className="meta">
        <span className="employer">{job.company}</span>
        <span className="location">{job.location ?? ""}</span>
        <RankBadges
          job={job}
          view={needsDescription ? "needs-description" : undefined}
        />
      </div>
      {error && <p className="error">{error}</p>}
      <form className="inline-date-form url-edit-form" onSubmit={(event) => void saveUrl(event)}>
        <label>
          Apply URL
          <input
            type="url"
            value={urlDraft}
            placeholder="https://…"
            disabled={pending}
            onChange={(event) => setUrlDraft(event.target.value)}
          />
          <span className="field-hint muted">
            Updates the digest posting link (used for scrape and apply buttons).
          </span>
        </label>
        <div className="save-inline-row">
          <button type="submit" className="secondary" disabled={pending || !urlDraft.trim()}>
            Save URL
          </button>
          {urlDraft.trim() && (
            <a className="external" href={urlDraft} target="_blank" rel="noreferrer">
              Open link
              <span className="ext-icon" aria-hidden="true">↗</span>
            </a>
          )}
          {urlFlash && (
            <span className="save-flash-inline" role="status" aria-live="polite">
              {urlFlash}
            </span>
          )}
        </div>
      </form>
      <div className="row-actions">
        <button
          type="button"
          className={
            job.applicationStatus === "todo"
              ? "secondary todo-toggle on"
              : "secondary todo-toggle"
          }
          disabled={pending}
          onClick={() => void toggleTodo()}
        >
          To-do<span className="btn-icon" aria-hidden="true">★</span>
        </button>
        <button type="button" className="secondary" disabled={pending} onClick={() => markApplied()}>
          Applied<span className="btn-icon" aria-hidden="true">✓</span>
        </button>
        {!needsDescription &&
          mismatch && (
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
          )}
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
      {appliedConfirm && (
        <div
          className="modal-backdrop"
          onClick={(event) => {
            if (event.target === event.currentTarget) setAppliedConfirm(false);
          }}
        >
          <div className="modal" role="dialog" aria-modal="true">
            <StepActionConfirm
              title="Mark as applied?"
              description="This removes the role from your Jobs list and moves it to Applications."
              confirmLabel="Mark applied"
              onConfirm={() => void confirmApplied()}
              onCancel={() => setAppliedConfirm(false)}
            />
          </div>
        </div>
      )}
    </article>
  );
}
