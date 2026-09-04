import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import {
  addPostingToTasks,
  clearJobFeedback,
  createApplication,
  getBoardSiblings,
  getJob,
  getRerankQueue,
  hideJobsFromBoard,
  patchJob,
  queueJobRerank,
  removePostingFromTasks,
  sendJobFeedback,
  type BoardSibling,
  type JobDetail,
  type RerankQueueSnapshot,
} from "../../api";
import { invalidateListCache } from "../../listCache";
import { isBlankJobDescription, isMismatch, RankBadges, RankNote } from "./RankMark";
import JobFeedbackButtons from "./JobFeedbackButtons";
import FeedbackDialog from "./FeedbackDialog";
import HideFromBoardDialog from "./HideFromBoardDialog";
import { demoGatedTitle, useDemoMode } from "../../demoMode";
import { listReturnTo } from "../../navigationReturn";
import MarkAppliedDialog from "./MarkAppliedDialog";
import RerankDialog from "./RerankDialog";

export default function JobDetail() {
  const { id } = useParams();
  const location = useLocation();
  const demo = useDemoMode();
  const demoGateTitle = demoGatedTitle(demo);
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
  const [siblingCount, setSiblingCount] = useState(0);
  const [hideDialog, setHideDialog] = useState<{
    employer: string;
    jobs: BoardSibling[];
  } | null>(null);
  const wasReranking = useRef(false);
  const urlFlashTimer = useRef<number | null>(null);

  async function load() {
    if (!id) return;
    const data = await getJob(id);
    setJob(data);
    setUrlDraft(data.url);
    if (!isMismatch(data) && !isBlankJobDescription(data.descriptionHtml)) {
      try {
        const siblings = await getBoardSiblings(data.id);
        setSiblingCount(siblings.jobs.length);
      } catch {
        setSiblingCount(0);
      }
    } else {
      setSiblingCount(0);
    }
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

  async function toggleTasks() {
    if (!job || pending) return;
    setPending(true);
    const onTasks = job.onTasks || job.applicationStatus === "todo";
    try {
      if (onTasks) {
        await removePostingFromTasks(job.id);
      } else {
        await addPostingToTasks(job.id);
      }
      invalidateListCache("applications:");
      invalidateListCache("tasks:");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not update tasks");
    } finally {
      setPending(false);
    }
  }

  async function confirmApplied(notes: string) {
    if (!job) return;
    setAppliedConfirm(false);
    try {
      const result = await createApplication({
        postingId: job.id,
        status: "applied",
        ...(notes ? { notes } : {}),
      });
      invalidateListCache("applications:");
      invalidateListCache("tasks:");
      navigate(`/applications/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not mark applied");
    }
  }

  async function markApplied() {
    setAppliedConfirm(true);
  }

  async function confirmFeedback(result: { note: string; teach: boolean }) {
    if (!job || !dialog) return;
    setPending(true);
    try {
      if (dialog === "unlike") {
        await clearJobFeedback(job.id);
        await load();
      } else {
        await sendJobFeedback(job.id, dialog, result.note, result.teach);
        await load();
      }
      setDialog(null);
      invalidateListCache("jobs:");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save feedback");
    } finally {
      setPending(false);
    }
  }

  async function openHideFromBoard() {
    if (!job || pending) return;
    setPending(true);
    try {
      const siblings = await getBoardSiblings(job.id);
      setHideDialog(siblings);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load employer roles");
    } finally {
      setPending(false);
    }
  }

  async function confirmHideFromBoard(postingIds: string[]) {
    if (!job) return;
    setPending(true);
    try {
      await hideJobsFromBoard(postingIds);
      setHideDialog(null);
      invalidateListCache("jobs:");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not hide from board");
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
  const showCompanyHide = !mismatch && !needsDescription && siblingCount >= 2;
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
            job.onTasks || job.applicationStatus === "todo"
              ? "secondary todo-toggle on"
              : "secondary todo-toggle"
          }
          disabled={pending}
          onClick={() => void toggleTasks()}
        >
          {job.onTasks || job.applicationStatus === "todo"
            ? "Remove from tasks"
            : "Add to tasks"}
        </button>
        <button type="button" className="secondary" disabled={pending} onClick={() => markApplied()}>
          Applied<span className="btn-icon" aria-hidden="true">✓</span>
        </button>
        {showCompanyHide && (
          <button
            type="button"
            className="secondary"
            disabled={pending}
            onClick={() => void openHideFromBoard()}
          >
            Hide {job.company} from board
          </button>
        )}
        {!needsDescription &&
          mismatch && (
            <button
              type="button"
              className="secondary"
              disabled={rerankBusy || demo.enabled}
              title={demoGateTitle}
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
          onConfirm={(result) => void confirmFeedback(result)}
        />
      )}
      {hideDialog && (
        <HideFromBoardDialog
          employer={hideDialog.employer}
          jobs={hideDialog.jobs}
          pending={pending}
          onCancel={() => setHideDialog(null)}
          onConfirm={(postingIds) => void confirmHideFromBoard(postingIds)}
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
        <MarkAppliedDialog
          title={`${job.company} — ${job.title}`}
          pending={pending}
          onCancel={() => setAppliedConfirm(false)}
          onConfirm={(notes) => void confirmApplied(notes)}
        />
      )}
    </article>
  );
}
