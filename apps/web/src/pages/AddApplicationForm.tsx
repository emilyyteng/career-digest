import { useState, type FormEvent } from "react";
import { createApplication, getApplication, type ApplicationRow } from "../api";
import { toDateInputValue } from "../formatDate";
import LocationSuggest from "../LocationSuggest";
import RichTextField, { isEmptyRichHtml } from "../RichTextField";

type Props = {
  onCreated: (row: ApplicationRow) => void;
  onCancel?: () => void;
};

function todayInput(): string {
  return toDateInputValue(new Date().toISOString());
}

export default function AddApplicationForm({ onCreated, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("applied");
  const [appliedAt, setAppliedAt] = useState(todayInput);
  const [location, setLocation] = useState("");
  const [descriptionHtml, setDescriptionHtml] = useState("");
  const showAppliedAt = status !== "starred";

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const created = await createApplication({
        status: String(form.get("status")),
        company: String(form.get("company")),
        title: String(form.get("title")),
        location,
        url: String(form.get("url") || ""),
        notes: String(form.get("notes") || ""),
        descriptionHtml: isEmptyRichHtml(descriptionHtml) ? null : descriptionHtml,
        appliedAt: showAppliedAt && appliedAt ? appliedAt : null,
      });
      const row = await getApplication(created.id);
      onCreated(row);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setSaving(false);
    }
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
            if (next !== "starred" && !appliedAt) setAppliedAt(todayInput());
          }}
        >
          <option value="starred">starred</option>
          <option value="applied">applied</option>
          <option value="interviewing">interviewing</option>
          <option value="hired">hired</option>
          <option value="declined">declined</option>
        </select>
      </label>
      <label>
        Company
        <input name="company" placeholder="Company" required />
      </label>
      <label>
        Role title
        <input name="title" placeholder="Role title" required />
      </label>
      <label>
        Location
        <LocationSuggest value={location} onChange={setLocation} placeholder="Location" />
      </label>
      <label>
        Posting URL
        <input name="url" placeholder="https://…" />
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
            Recorded when you applied. Cleared if you move back to starred.
          </span>
        </label>
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
        <textarea name="notes" placeholder="Notes" rows={3} />
      </label>
      <div className="form-actions">
        {onCancel && (
          <button type="button" className="secondary" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
