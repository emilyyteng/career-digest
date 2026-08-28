import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type FormEvent,
} from "react";
import { createApplication, getApplication, type ApplicationRow } from "../api";
import { combineApplyByDateTime, toDateInputValue, applyByTimeInputValue, DEFAULT_APPLY_BY_TIME } from "../formatDate";
import LocationSuggest from "../LocationSuggest";
import RichTextField, { isEmptyRichHtml } from "../RichTextField";

type Props = {
  onCreated: (row: ApplicationRow) => void;
  onCancel?: () => void;
};

export type AddApplicationFormHandle = {
  requestClose: () => void;
};

function todayInput(): string {
  return toDateInputValue(new Date().toISOString());
}

const AddApplicationForm = forwardRef<AddApplicationFormHandle, Props>(
  function AddApplicationForm({ onCreated, onCancel }, ref) {
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [status, setStatus] = useState("todo");
    const [appliedAt, setAppliedAt] = useState(todayInput);
    const [applyByDate, setApplyByDate] = useState("");
    const [applyByTime, setApplyByTime] = useState(DEFAULT_APPLY_BY_TIME);
    const [location, setLocation] = useState("");
    const [descriptionHtml, setDescriptionHtml] = useState("");
    const [company, setCompany] = useState("");
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [confirmDiscard, setConfirmDiscard] = useState(false);
    const showAppliedAt = status !== "todo";
    const showApplyBy = status === "todo";

    const dirty =
      company.trim() !== "" ||
      title.trim() !== "" ||
      location.trim() !== "" ||
      url.trim() !== "" ||
      notes.trim() !== "" ||
      !isEmptyRichHtml(descriptionHtml) ||
      status !== "todo" ||
      (showAppliedAt && appliedAt !== todayInput()) ||
      (showApplyBy && (applyByDate !== "" || applyByTime !== DEFAULT_APPLY_BY_TIME));

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

    async function onSubmit(event: FormEvent<HTMLFormElement>) {
      event.preventDefault();
      setSaving(true);
      setError(null);
      try {
        const dueAt =
          showApplyBy && applyByDate
            ? combineApplyByDateTime(applyByDate, applyByTime)
            : null;
        const created = await createApplication({
          status,
          company,
          title,
          location,
          url,
          notes,
          descriptionHtml: isEmptyRichHtml(descriptionHtml) ? null : descriptionHtml,
          appliedAt: showAppliedAt && appliedAt ? appliedAt : null,
          dueAt,
        });
        const row = await getApplication(created.id);
        onCreated(row);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save");
      } finally {
        setSaving(false);
      }
    }

    if (confirmDiscard) {
      return (
        <div className="discard-confirm" role="alertdialog" aria-labelledby="add-app-title" aria-describedby="discard-desc">
          <h2 id="add-app-title">Discard this application?</h2>
          <p id="discard-desc" className="muted lede">
            You have unsaved changes. Closing will throw them away.
          </p>
          <div className="form-actions">
            <button type="button" className="secondary" onClick={() => setConfirmDiscard(false)}>
              Keep editing
            </button>
            <button type="button" className="modal-confirm-btn" onClick={() => onCancel?.()}>
              Discard
            </button>
          </div>
        </div>
      );
    }

    return (
      <form className="form" onSubmit={onSubmit}>
        <h2 id="add-app-title">Add application</h2>
        <p className="muted lede">
          For roles from Handshake, LinkedIn, or anywhere else. You can link a digest posting later.
        </p>
        {error && <p className="error">{error}</p>}
        <label>
          Status
          <select
            name="status"
            value={status}
            onChange={(event) => {
              const next = event.target.value;
              setStatus(next);
              if (next !== "todo" && !appliedAt) setAppliedAt(todayInput());
            }}
          >
            <option value="todo">to-do</option>
            <option value="applied">applied</option>
            <option value="interviewing">interviewing</option>
            <option value="accepted">accepted</option>
            <option value="declined">declined</option>
          </select>
        </label>
        <label>
          Company
          <input
            name="company"
            placeholder="Company"
            required
            value={company}
            onChange={(event) => setCompany(event.target.value)}
          />
        </label>
        <label>
          Role title
          <input
            name="title"
            placeholder="Role title"
            required
            value={title}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <label>
          Location
          <LocationSuggest value={location} onChange={setLocation} placeholder="Location" />
        </label>
        <label>
          {showAppliedAt ? "Link to posting" : "Posting URL"}
          <input
            name="url"
            placeholder="https://…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        {showAppliedAt && (
          <label>
            Date applied
            <input
              type="date"
              name="appliedAt"
              value={appliedAt}
              onChange={(event) => setAppliedAt(event.target.value)}
            />
            <span className="field-hint muted">
              Recorded when you applied. Cleared if you move back to to-do.
            </span>
          </label>
        )}
        {showApplyBy && (
          <div className="interview-datetime-row">
            <label>
              Apply-by date
              <input
                type="date"
                value={applyByDate}
                onChange={(event) => setApplyByDate(event.target.value)}
              />
            </label>
            <label>
              Apply-by time
              <input
                type="time"
                value={applyByTime}
                onChange={(event) => setApplyByTime(event.target.value)}
              />
            </label>
            <span className="field-hint muted">
              Optional deadline for this to-do. Leave date blank if unknown.
            </span>
          </div>
        )}
        <label>
          Job description
          <RichTextField
            value={descriptionHtml}
            onChange={setDescriptionHtml}
            placeholder="Paste the job description — links and formatting are kept"
            minHeight="8rem"
          />
        </label>
        <label>
          Notes
          <textarea
            name="notes"
            placeholder="Notes"
            rows={3}
            value={notes}
            onChange={(event) => setNotes(event.target.value)}
          />
        </label>
        <div className="form-actions">
          {onCancel && (
            <button type="button" className="secondary" onClick={requestClose}>
              Cancel
            </button>
          )}
          <button type="submit" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </form>
    );
  },
);

export default AddApplicationForm;
