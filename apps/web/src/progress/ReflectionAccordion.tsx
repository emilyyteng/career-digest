import { useState } from "react";
import type { ProgressLane, ProgressReflection } from "../api";

function truncate(body: string, max = 72): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

export default function ReflectionAccordion({
  reflections,
  canEdit,
  onSave,
}: {
  reflections: ProgressReflection[];
  canEdit: boolean;
  onSave: (id: string, body: string) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  if (reflections.length === 0) {
    return <p className="muted">No reflections this day.</p>;
  }

  return (
    <ul className="progress-note-list">
      {reflections.map((row) => {
        const open = openId === row.id;
        const editing = editingId === row.id;
        return (
          <li key={row.id} className="progress-note-card">
            <div className="progress-note-head">
              <button
                type="button"
                className="secondary progress-note-toggle"
                onClick={() => {
                  setOpenId(open ? null : row.id);
                  if (editing) {
                    setEditingId(null);
                  }
                }}
              >
                <span className="progress-lane-tag">{row.lane}</span>
                <span>{truncate(row.body)}</span>
              </button>
              {canEdit && !editing && (
                <button
                  type="button"
                  className="secondary progress-note-edit"
                  aria-label="Edit reflection"
                  onClick={() => {
                    setOpenId(row.id);
                    setEditingId(row.id);
                    setDraft(row.body);
                  }}
                >
                  ✎
                </button>
              )}
            </div>
            {open && (
              <div className="progress-note-body">
                {editing ? (
                  <>
                    <textarea
                      rows={5}
                      value={draft}
                      disabled={busy}
                      onChange={(event) => setDraft(event.target.value)}
                    />
                    <div className="progress-note-actions">
                      <button
                        type="button"
                        className="secondary"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={busy || !draft.trim()}
                        onClick={() => {
                          void (async () => {
                            setBusy(true);
                            try {
                              await onSave(row.id, draft);
                              setEditingId(null);
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <p className="progress-note-text">{row.body}</p>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function ReflectionCompose({
  onSubmit,
}: {
  onSubmit: (lane: ProgressLane, body: string) => Promise<void>;
}) {
  const [lane, setLane] = useState<ProgressLane>("application");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <form
      className="progress-compose"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim() || busy) return;
        void (async () => {
          setBusy(true);
          try {
            await onSubmit(lane, body);
            setBody("");
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <div className="progress-compose-row">
        <div className="tabs progress-compose-lanes">
          <button
            type="button"
            className={`tab ${lane === "application" ? "on" : ""}`}
            disabled={busy}
            onClick={() => setLane("application")}
          >
            Application
          </button>
          <button
            type="button"
            className={`tab ${lane === "technical" ? "on" : ""}`}
            disabled={busy}
            onClick={() => setLane("technical")}
          >
            Technical
          </button>
        </div>
        <textarea
          rows={4}
          placeholder="What did you work through?"
          value={body}
          disabled={busy}
          onChange={(event) => setBody(event.target.value)}
        />
      </div>
      <button type="submit" disabled={busy || !body.trim()}>
        Add reflection
      </button>
    </form>
  );
}
