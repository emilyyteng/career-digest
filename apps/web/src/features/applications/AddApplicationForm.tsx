import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useState,
  type FormEvent,
} from "react";
import { createApplication, getApplication, type ApplicationRow } from "../../api";
import { toDateInputValue } from "../../formatDate";
import LocationSuggest from "../../LocationSuggest";
import RichTextField, { isEmptyRichHtml } from "../../RichTextField";

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
    const [status, setStatus] = useState("applied");
    const [appliedAt, setAppliedAt] = useState(todayInput);
    const [location, setLocation] = useState("");
    const [descriptionHtml, setDescriptionHtml] = useState("");
    const [company, setCompany] = useState("");
    const [title, setTitle] = useState("");
    const [url, setUrl] = useState("");
    const [notes, setNotes] = useState("");
    const [confirmDiscard, setConfirmDiscard] = useState(false);

    const dirty =
      company.trim() !== "" ||
      title.trim() !== "" ||
      location.trim() !== "" ||
      url.trim() !== "" ||
      notes.trim() !== "" ||
      !isEmptyRichHtml(descriptionHtml) ||
      status !== "applied" ||
      appliedAt !== todayInput();

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
        const created = await createApplication({
          status,
          company,
          title,
          location,
          url,
          notes,
          descriptionHtml: isEmptyRichHtml(descriptionHtml) ? null : descriptionHtml,
          appliedAt: appliedAt ? appliedAt : null,
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
              if (!appliedAt) setAppliedAt(todayInput());
            }}
          >
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
          Link to posting
          <input
            name="url"
            placeholder="https://…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
          />
        </label>
        <label>
          Date applied
          <input
            type="date"
            name="appliedAt"
            value={appliedAt}
            onChange={(event) => setAppliedAt(event.target.value)}
          />
        </label>
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
