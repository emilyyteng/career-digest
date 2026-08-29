import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type FormEvent,
} from "react";
import { patchTask, getJobs, type JobCard, type TaskRow } from "../api";
import { Link } from "react-router-dom";
import {
  combineApplyByDateTime,
  toDateInputValue,
  applyByTimeInputValue,
} from "../formatDate";
import LocationSuggest from "../LocationSuggest";
import RichTextField, { isEmptyRichHtml } from "../RichTextField";

type Props = {
  task: TaskRow;
  onSaved: (row: TaskRow) => void;
  onCancel?: () => void;
};

export type EditTaskFormHandle = {
  requestClose: () => void;
};

const EditTaskForm = forwardRef<EditTaskFormHandle, Props>(function EditTaskForm(
  { task, onSaved, onCancel },
  ref,
) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(task.title);
  const [organization, setOrganization] = useState(task.organization ?? "");
  const [location, setLocation] = useState(task.location ?? "");
  const [url, setUrl] = useState(task.url ?? "");
  const [notes, setNotes] = useState(task.notes ?? "");
  const [descriptionHtml, setDescriptionHtml] = useState(task.descriptionHtml ?? "");
  const [dueDate, setDueDate] = useState(toDateInputValue(task.dueAt));
  const [dueTime, setDueTime] = useState(applyByTimeInputValue(task.dueAt));
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<JobCard[]>([]);
  const [linkFlash, setLinkFlash] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  const isApplication = task.category === "application";
  const showDescription = isApplication && !task.postingId;

  const dirty =
    title.trim() !== task.title ||
    organization.trim() !== (task.organization ?? "") ||
    location.trim() !== (task.location ?? "") ||
    url.trim() !== (task.url ?? "") ||
    notes.trim() !== (task.notes ?? "") ||
    descriptionHtml !== (task.descriptionHtml ?? "") ||
    dueDate !== toDateInputValue(task.dueAt) ||
    dueTime !== applyByTimeInputValue(task.dueAt);

  function requestClose() {
    if (!onCancel) return;
    if (confirmDiscard) return;
    if (!dirty) {
      onCancel();
      return;
    }
    setConfirmDiscard(true);
  }

  useImperativeHandle(ref, () => ({ requestClose }), [confirmDiscard, dirty, onCancel]);

  useEffect(() => {
    if (!confirmDiscard) return;
    function onKey(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopImmediatePropagation();
      setConfirmDiscard(false);
    }
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [confirmDiscard]);

  async function searchJobs() {
    const data = await getJobs(query, 1, 40);
    setMatches(data.jobs);
  }

  async function linkPosting(postingId: string) {
    setSaving(true);
    setError(null);
    try {
      const row = await patchTask(task.id, { postingId });
      onSaved(row);
      setLinkFlash(true);
      window.setTimeout(() => setLinkFlash(false), 2200);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not link posting");
    } finally {
      setSaving(false);
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const dueAt = dueDate ? combineApplyByDateTime(dueDate, dueTime) : null;
      const body: Record<string, unknown> = {
        title: title.trim(),
        organization: organization.trim() || null,
        url: url.trim() || null,
        notes: notes.trim() || null,
        dueAt,
      };
      if (isApplication) {
        body.location = location.trim() || null;
        if (showDescription) {
          body.descriptionHtml = isEmptyRichHtml(descriptionHtml) ? null : descriptionHtml;
        }
      }
      const row = await patchTask(task.id, body);
      onSaved(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save task");
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <form className="form" onSubmit={(event) => void onSubmit(event)}>
        <h2 id="edit-task-title">Edit task</h2>
        <p className="muted task-category-lock">Category: {task.category}</p>
        {error && <p className="error">{error}</p>}
        <label>
          Title
          <input
            type="text"
            value={title}
            required
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          {isApplication ? "Company" : "Organization"}
          <input
            type="text"
            value={organization}
            onChange={(event) => setOrganization(event.target.value)}
          />
        </label>
        {isApplication && (
          <label>
            Location
            <LocationSuggest
              value={location}
              onChange={setLocation}
              placeholder="Location"
            />
          </label>
        )}
        <label>
          Link
          <input
            type="url"
            value={url}
            placeholder="https://"
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        {showDescription && (
          <label>
            Job description
            <RichTextField
              value={descriptionHtml}
              onChange={setDescriptionHtml}
              placeholder="Paste the job description — kept when you mark applied"
              minHeight="8rem"
            />
          </label>
        )}
        <label>
          Due date
          <input
            type="date"
            value={dueDate}
            onChange={(event) => setDueDate(event.target.value)}
          />
        </label>
        <label>
          Due time
          <input
            type="time"
            value={dueTime}
            disabled={!dueDate}
            onChange={(event) => setDueTime(event.target.value)}
          />
        </label>
        <label>
          Notes
          <textarea value={notes} onChange={(event) => setNotes(event.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" className="secondary" onClick={requestClose} disabled={saving}>
            Cancel
          </button>
          <button type="submit" disabled={saving || !title.trim()}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
      {task.category === "application" && task.postingId && (
        <div className="task-linked-posting">
          <p className="muted">
            Linked to:{" "}
            <Link to={`/jobs/${task.postingId}`}>
              {task.organization ? `${task.organization} · ${task.title}` : task.title}
            </Link>
          </p>
          <p className="muted field-hint">
            Job description comes from the linked digest posting.
          </p>
        </div>
      )}
      {task.category === "application" && !task.postingId && (
        <div className="task-edit-link-posting">
          <h3>Link a digest posting</h3>
          <p className="muted">
            Search open jobs and associate this application task with a posting from the digest.
          </p>
          <div className="toolbar toolbar-search-end">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search open jobs"
            />
            <button type="button" className="secondary" onClick={() => void searchJobs()} disabled={saving}>
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
              <div className="save-inline-row">
                <button
                  type="button"
                  className="secondary"
                  disabled={saving}
                  onClick={() => void linkPosting(job.id)}
                >
                  Associate
                </button>
                {linkFlash && (
                  <span className="save-flash-inline" role="status" aria-live="polite">
                    Linked!
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {confirmDiscard && (
        <div
          className="modal-backdrop modal-backdrop-nested"
          onClick={(event) => {
            if (event.target === event.currentTarget) setConfirmDiscard(false);
          }}
        >
          <div className="modal modal-compact" role="dialog" aria-modal="true">
            <div className="step-action-confirm" role="alertdialog">
              <h3>Discard edits?</h3>
              <p className="muted">Your changes will be lost.</p>
              <div className="form-actions">
                <button type="button" className="secondary" onClick={() => setConfirmDiscard(false)}>
                  Keep editing
                </button>
                <button
                  type="button"
                  className="modal-confirm-btn"
                  onClick={() => {
                    setConfirmDiscard(false);
                    onCancel?.();
                  }}
                >
                  Discard
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
});

export default EditTaskForm;
