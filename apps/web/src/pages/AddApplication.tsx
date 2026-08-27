import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { createApplication } from "../api";

export default function AddApplication() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    try {
      const result = await createApplication({
        status: String(form.get("status")),
        company: String(form.get("company")),
        title: String(form.get("title")),
        location: String(form.get("location") || ""),
        url: String(form.get("url") || ""),
        notes: String(form.get("notes") || ""),
      });
      navigate(`/applications/${result.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    }
  }

  return (
    <form className="form" onSubmit={onSubmit}>
      <h2>Add application</h2>
      <p className="muted">
        For roles from Handshake, LinkedIn, or anywhere else. You can link a digest posting later.
      </p>
      {error && <p className="error">{error}</p>}
      <label>
        Status
        <select name="status" defaultValue="applied">
          <option value="starred">starred</option>
          <option value="applied">applied</option>
          <option value="interviewing">interviewing</option>
          <option value="hired">hired</option>
          <option value="declined">declined</option>
        </select>
      </label>
      <input name="company" placeholder="Company" required />
      <input name="title" placeholder="Role title" required />
      <input name="location" placeholder="Location" />
      <input name="url" placeholder="Posting URL" />
      <textarea name="notes" placeholder="Notes" />
      <button type="submit">Save</button>
    </form>
  );
}
