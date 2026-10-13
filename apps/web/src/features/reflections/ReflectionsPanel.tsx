/**
 * Detail-page Reflections: accordion + ✎, bottom Link existing / Create,
 * inline draft with lane chips + deep-work toggle (Progress compose parity).
 * Application host: optional interview-step association after app link.
 */
import { useCallback, useEffect, useState } from "react";
import {
  createProgressReflection,
  getApplicationInterviewSteps,
  getUnlinkedReflections,
  patchProgressReflection,
  type ApplicationInterviewStepOption,
  type ProgressLane,
  type ProgressReflection,
} from "../../api";
import {
  DeepWorkToggle,
  LaneChips,
} from "../progress/ReflectionAccordion";

function truncate(body: string, max = 72): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

type Host =
  | { kind: "task"; taskId: string; defaultLane?: ProgressLane }
  | { kind: "application"; applicationId: string; defaultLane?: ProgressLane };

type Props = {
  host: Host;
  reflections: ProgressReflection[];
  onChanged: () => void;
  onError: (message: string) => void;
  /** Match twin column fill height */
  fillHeight?: boolean;
};

export default function ReflectionsPanel({
  host,
  reflections,
  onChanged,
  onError,
  fillHeight = true,
}: Props) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftLane, setDraftLane] = useState<ProgressLane>("application");
  const [draftDeepWork, setDraftDeepWork] = useState(true);
  const [draftStepId, setDraftStepId] = useState("");
  const [creating, setCreating] = useState(false);
  const [createBody, setCreateBody] = useState("");
  const [createLane, setCreateLane] = useState<ProgressLane>(
    host.defaultLane ?? (host.kind === "task" ? "other" : "application"),
  );
  const [createDeepWork, setCreateDeepWork] = useState(true);
  const [createStepId, setCreateStepId] = useState("");
  const [linking, setLinking] = useState(false);
  const [unlinked, setUnlinked] = useState<ProgressReflection[]>([]);
  const [steps, setSteps] = useState<ApplicationInterviewStepOption[]>([]);
  const [busy, setBusy] = useState(false);

  const defaultLane = host.defaultLane ?? (host.kind === "task" ? "other" : "application");
  const applicationId = host.kind === "application" ? host.applicationId : null;

  const reloadUnlinked = useCallback(async () => {
    const data = await getUnlinkedReflections(40);
    setUnlinked(data.reflections);
  }, []);

  useEffect(() => {
    if (!linking) return;
    void reloadUnlinked().catch((err: Error) => onError(err.message));
  }, [linking, reloadUnlinked, onError]);

  useEffect(() => {
    if (!applicationId) {
      setSteps([]);
      return;
    }
    let cancelled = false;
    void getApplicationInterviewSteps(applicationId)
      .then((data) => {
        if (!cancelled) setSteps(data.steps);
      })
      .catch(() => {
        if (!cancelled) setSteps([]);
      });
    return () => {
      cancelled = true;
    };
  }, [applicationId]);

  function openCreate() {
    setCreating(true);
    setLinking(false);
    setCreateBody("");
    setCreateLane(defaultLane);
    setCreateDeepWork(true);
    setCreateStepId("");
  }

  function openLink() {
    setLinking(true);
    setCreating(false);
  }

  async function saveCreate() {
    if (!createBody.trim() || busy) return;
    setBusy(true);
    try {
      await createProgressReflection({
        lane: createLane,
        body: createBody,
        deepWork: createDeepWork,
        taskId: host.kind === "task" ? host.taskId : null,
        applicationId,
        interviewStepId:
          applicationId && createStepId ? createStepId : null,
      });
      setCreating(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not create reflection");
    } finally {
      setBusy(false);
    }
  }

  async function linkExisting(id: string) {
    if (busy) return;
    setBusy(true);
    try {
      await patchProgressReflection(id, {
        taskId: host.kind === "task" ? host.taskId : null,
        applicationId,
        interviewStepId: null,
      });
      setLinking(false);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not link reflection");
    } finally {
      setBusy(false);
    }
  }

  async function saveEdit(id: string) {
    if (!draftBody.trim() || busy) return;
    setBusy(true);
    try {
      await patchProgressReflection(id, {
        body: draftBody,
        lane: draftLane,
        deepWork: draftDeepWork,
        ...(applicationId
          ? { interviewStepId: draftStepId || null }
          : {}),
      });
      setEditingId(null);
      onChanged();
    } catch (err) {
      onError(err instanceof Error ? err.message : "Could not save reflection");
    } finally {
      setBusy(false);
    }
  }

  const showEmptyCopy =
    reflections.length === 0 && !creating && !linking;

  return (
    <section
      className={`task-detail-section task-detail-section-fill reflections-panel${
        fillHeight ? "" : " is-relaxed"
      }`}
    >
      <div className="task-detail-stickies-head">
        <h3>Reflections ({reflections.length})</h3>
        {creating && <span className="task-detail-pill">drafting…</span>}
      </div>

      <div className="reflections-panel-scroll">
        {showEmptyCopy ? (
          <p className="muted reflections-empty-copy">
            No reflections linked yet. Link an existing Progress log or create one
            below.
          </p>
        ) : (
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
                        if (editing) setEditingId(null);
                      }}
                    >
                      <span className="progress-lane-tag">{row.lane}</span>
                      {row.deepWork && <span className="progress-dw-tag">dw</span>}
                      <span>{truncate(row.body)}</span>
                    </button>
                    {!editing && (
                      <button
                        type="button"
                        className="secondary progress-note-edit"
                        aria-label="Edit reflection"
                        onClick={() => {
                          setOpenId(row.id);
                          setEditingId(row.id);
                          setDraftBody(row.body);
                          setDraftLane(row.lane);
                          setDraftDeepWork(row.deepWork);
                          setDraftStepId(row.interviewStepId ?? "");
                        }}
                      >
                        <span className="progress-note-edit-icon" aria-hidden="true">
                          ✎
                        </span>
                      </button>
                    )}
                  </div>
                  {open && (
                    <div className="progress-note-body">
                      {editing ? (
                        <>
                          {applicationId && (
                            <label className="progress-compose-link">
                              Interview step
                              <select
                                value={draftStepId}
                                disabled={busy || steps.length === 0}
                                onChange={(e) => setDraftStepId(e.target.value)}
                              >
                                <option value="">
                                  {steps.length === 0
                                    ? "No interview steps"
                                    : "Whole application"}
                                </option>
                                {steps.map((step) => (
                                  <option key={step.id} value={step.id}>
                                    {step.title}
                                    {step.threadStatus === "resolved"
                                      ? " · resolved"
                                      : ""}
                                  </option>
                                ))}
                              </select>
                            </label>
                          )}
                          <textarea
                            className="reflections-draft-textarea"
                            rows={4}
                            value={draftBody}
                            disabled={busy}
                            onChange={(e) => setDraftBody(e.target.value)}
                          />
                          <div className="progress-compose-meta">
                            <LaneChips
                              value={draftLane}
                              disabled={busy}
                              onChange={setDraftLane}
                            />
                            <DeepWorkToggle
                              value={draftDeepWork}
                              disabled={busy}
                              onChange={setDraftDeepWork}
                            />
                          </div>
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
                              className="secondary"
                              disabled={busy || !draftBody.trim()}
                              onClick={() => void saveEdit(row.id)}
                            >
                              Save
                            </button>
                          </div>
                        </>
                      ) : (
                        <>
                          <p className="progress-note-text">{row.body}</p>
                          {row.interviewStepTitle && (
                            <p className="muted progress-note-link">
                              Step · {row.interviewStepTitle}
                            </p>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {linking && (
          <div className="reflections-link-picker">
            <strong>Link existing</strong>
            <ul className="reflections-link-list">
              {unlinked.length === 0 ? (
                <li className="muted">No unlinked reflections.</li>
              ) : (
                unlinked.map((row) => (
                  <li key={row.id}>
                    <div>
                      <span className="progress-lane-tag">{row.lane}</span>
                      {row.deepWork && <span className="progress-dw-tag">dw</span>}{" "}
                      {truncate(row.body, 56)}
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      disabled={busy}
                      onClick={() => void linkExisting(row.id)}
                    >
                      Link
                    </button>
                  </li>
                ))
              )}
            </ul>
            <button
              type="button"
              className="secondary"
              onClick={() => setLinking(false)}
            >
              Cancel
            </button>
          </div>
        )}

        {creating && (
          <div className="reflections-inline-create">
            <strong>New reflection</strong>
            {applicationId && (
              <label className="progress-compose-link">
                Interview step
                <select
                  value={createStepId}
                  disabled={busy || steps.length === 0}
                  onChange={(e) => setCreateStepId(e.target.value)}
                >
                  <option value="">
                    {steps.length === 0
                      ? "No interview steps"
                      : "Whole application"}
                  </option>
                  {steps.map((step) => (
                    <option key={step.id} value={step.id}>
                      {step.title}
                      {step.threadStatus === "resolved" ? " · resolved" : ""}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <textarea
              className="reflections-draft-textarea"
              rows={4}
              value={createBody}
              disabled={busy}
              placeholder="What did you work through?"
              onChange={(e) => setCreateBody(e.target.value)}
            />
            <div className="progress-compose-meta">
              <LaneChips
                value={createLane}
                disabled={busy}
                onChange={setCreateLane}
              />
              <DeepWorkToggle
                value={createDeepWork}
                disabled={busy}
                onChange={setCreateDeepWork}
              />
            </div>
            <div className="progress-note-actions">
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setCreating(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy || !createBody.trim()}
                onClick={() => void saveCreate()}
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="task-detail-form-actions">
        <button
          type="button"
          className="secondary"
          disabled={busy || linking}
          onClick={openLink}
        >
          Link existing
        </button>
        <button
          type="button"
          className="secondary"
          disabled={busy || creating}
          onClick={openCreate}
        >
          Create reflection
        </button>
      </div>
    </section>
  );
}
