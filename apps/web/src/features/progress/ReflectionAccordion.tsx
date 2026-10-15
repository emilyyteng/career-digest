import { useEffect, useId, useMemo, useRef, useState } from "react";
import {
  getApplicationInterviewSteps,
  type ApplicationInterviewStepOption,
  type ProgressLane,
  type ProgressReflection,
} from "../../api";
import { Button } from "../../ui";

function truncate(body: string, max = 72): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function linkLabel(row: ProgressReflection): string | null {
  if (row.taskTitle) return `task · ${row.taskTitle}`;
  if (row.applicationTitle) {
    const company = row.applicationCompany ? `${row.applicationCompany} · ` : "";
    const base = `app · ${company}${row.applicationTitle}`;
    if (row.interviewStepTitle) return `${base} · ${row.interviewStepTitle}`;
    return base;
  }
  return null;
}

function currentLinkKey(row: ProgressReflection): string {
  if (row.taskId) return `task:${row.taskId}`;
  if (row.applicationId) return `app:${row.applicationId}`;
  return "";
}

function optionFromReflection(row: ProgressReflection): ReflectionLinkOption | null {
  if (row.taskId) {
    const label = row.taskTitle?.trim() || "Task";
    return {
      key: `task:${row.taskId}`,
      kind: "task",
      taskId: row.taskId,
      label,
      searchText: `${label} task`.toLowerCase(),
    };
  }
  if (row.applicationId) {
    const company = row.applicationCompany?.trim();
    const title = row.applicationTitle?.trim() || "Application";
    const label = company ? `${company} · ${title}` : title;
    return {
      key: `app:${row.applicationId}`,
      kind: "application",
      applicationId: row.applicationId,
      label,
      searchText: `${label} app`.toLowerCase(),
    };
  }
  return null;
}

function resolveLinkFromKey(
  key: string,
  options: ReflectionLinkOption[],
): {
  taskId: string | null;
  applicationId: string | null;
} {
  const opt = options.find((o) => o.key === key);
  if (opt) {
    return {
      taskId: opt.taskId ?? null,
      applicationId: opt.applicationId ?? null,
    };
  }
  if (key.startsWith("task:")) {
    return { taskId: key.slice("task:".length), applicationId: null };
  }
  if (key.startsWith("app:")) {
    return { taskId: null, applicationId: key.slice("app:".length) };
  }
  return { taskId: null, applicationId: null };
}

export default function ReflectionAccordion({
  reflections,
  canEdit,
  linkOptions,
  onSave,
}: {
  reflections: ProgressReflection[];
  canEdit: boolean;
  linkOptions: ReflectionLinkOption[];
  onSave: (
    id: string,
    patch: {
      body: string;
      lane: ProgressLane;
      taskId: string | null;
      applicationId: string | null;
      interviewStepId: string | null;
    },
  ) => Promise<void>;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftLane, setDraftLane] = useState<ProgressLane>("application");
  const [draftLinkKey, setDraftLinkKey] = useState("");
  const [draftStepId, setDraftStepId] = useState("");
  const [busy, setBusy] = useState(false);

  if (reflections.length === 0) {
    return <p className="progress-day-empty">No reflections this day.</p>;
  }

  return (
    <ul className="progress-note-list">
      {reflections.map((row) => {
        const open = openId === row.id;
        const editing = editingId === row.id;
        const linked = linkLabel(row);
        const editLinkOptions = (() => {
          const current = optionFromReflection(row);
          if (!current) return linkOptions;
          if (linkOptions.some((o) => o.key === current.key)) return linkOptions;
          return [current, ...linkOptions];
        })();
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
                    setDraftBody(row.body);
                    setDraftLane(row.lane);
                    setDraftLinkKey(currentLinkKey(row));
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
                    <WorkLinkFields
                      linkKey={draftLinkKey}
                      onLinkKeyChange={(key) => {
                        setDraftLinkKey(key);
                        setDraftStepId("");
                      }}
                      linkOptions={editLinkOptions}
                      interviewStepId={draftStepId}
                      onInterviewStepIdChange={setDraftStepId}
                      disabled={busy}
                    />
                    <textarea
                      rows={5}
                      value={draftBody}
                      disabled={busy}
                      onChange={(event) => setDraftBody(event.target.value)}
                    />
                    <div className="progress-compose-meta">
                      <LaneChips
                        value={draftLane}
                        disabled={busy}
                        onChange={setDraftLane}
                      />
                    </div>
                    <div className="progress-note-actions">
                      <Button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        variant="primary"
                        disabled={busy || !draftBody.trim()}
                        onClick={() => {
                          void (async () => {
                            setBusy(true);
                            try {
                              const link = resolveLinkFromKey(
                                draftLinkKey,
                                editLinkOptions,
                              );
                              await onSave(row.id, {
                                body: draftBody,
                                lane: draftLane,
                                taskId: link.taskId,
                                applicationId: link.applicationId,
                                interviewStepId:
                                  link.applicationId && draftStepId
                                    ? draftStepId
                                    : null,
                              });
                              setEditingId(null);
                            } finally {
                              setBusy(false);
                            }
                          })();
                        }}
                      >
                        Save
                      </Button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="progress-note-text">{row.body}</p>
                    {linked && (
                      <p className="muted progress-note-link">Linked → {linked}</p>
                    )}
                  </>
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

export function LaneSelect({
  value,
  onChange,
  disabled,
}: {
  value: ProgressLane;
  onChange: (lane: ProgressLane) => void;
  disabled?: boolean;
}) {
  return (
    <label className="progress-lane-select">
      <span className="progress-lane-label">LOG</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as ProgressLane)}
      >
        <option value="application">application</option>
        <option value="technical">technical</option>
        <option value="other">other</option>
      </select>
    </label>
  );
}

export function LaneChips({
  value,
  onChange,
  disabled,
}: {
  value: ProgressLane;
  onChange: (lane: ProgressLane) => void;
  disabled?: boolean;
}) {
  return (
    <div className="progress-lane-chips" role="group" aria-label="Reflection lane">
      {(["application", "technical", "other"] as const).map((lane) => (
        <button
          key={lane}
          type="button"
          className={value === lane ? "progress-lane-chip is-on" : "progress-lane-chip"}
          disabled={disabled}
          onClick={() => onChange(lane)}
        >
          {lane}
        </button>
      ))}
    </div>
  );
}

export type ReflectionLinkOption = {
  key: string;
  kind: "task" | "application";
  taskId?: string;
  applicationId?: string;
  /** Short display label (company · title / task title). */
  label: string;
  /** Lowercased haystack for filtering. */
  searchText: string;
};

const LINK_RESULT_LIMIT = 12;

function filterLinkOptions(
  options: ReflectionLinkOption[],
  query: string,
): ReflectionLinkOption[] {
  const q = query.trim().toLowerCase();
  const matched = q
    ? options.filter((opt) => opt.searchText.includes(q))
    : options;
  return matched.slice(0, LINK_RESULT_LIMIT);
}

function WorkLinkSearch({
  linkKey,
  onLinkKeyChange,
  linkOptions,
  disabled,
}: {
  linkKey: string;
  onLinkKeyChange: (key: string) => void;
  linkOptions: ReflectionLinkOption[];
  disabled?: boolean;
}) {
  const listId = useId();
  const wrapRef = useRef<HTMLDivElement>(null);
  const selected = linkOptions.find((o) => o.key === linkKey) ?? null;
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const results = useMemo(
    () => filterLinkOptions(linkOptions, query),
    [linkOptions, query],
  );

  useEffect(() => {
    function onDoc(event: MouseEvent) {
      if (!wrapRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  useEffect(() => {
    setActive(-1);
  }, [query]);

  function pick(opt: ReflectionLinkOption) {
    onLinkKeyChange(opt.key);
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  function clear() {
    onLinkKeyChange("");
    setQuery("");
    setOpen(false);
    setActive(-1);
  }

  if (selected) {
    return (
      <div className="progress-compose-link">
        <span>Link to work</span>
        <div className="progress-link-selected">
          <span
            className={
              selected.kind === "task"
                ? "progress-link-kind is-task"
                : "progress-link-kind is-app"
            }
          >
            {selected.kind === "task" ? "task" : "app"}
          </span>
          <span className="progress-link-selected-label">{selected.label}</span>
          <button
            type="button"
            className="secondary progress-link-clear"
            disabled={disabled}
            onClick={clear}
          >
            Clear
          </button>
        </div>
      </div>
    );
  }

  return (
    <label className="progress-compose-link">
      Link to work
      <div className="suggest progress-link-suggest" ref={wrapRef}>
        <input
          type="search"
          value={query}
          disabled={disabled}
          placeholder="Search tasks or applications…"
          autoComplete="off"
          aria-autocomplete="list"
          aria-controls={listId}
          aria-expanded={open && results.length > 0}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              setOpen(false);
              return;
            }
            if (!open || results.length === 0) return;
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setActive((i) => (i + 1) % results.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setActive((i) => (i <= 0 ? results.length - 1 : i - 1));
            } else if (event.key === "Enter" && active >= 0) {
              event.preventDefault();
              pick(results[active]!);
            }
          }}
        />
        {open && results.length > 0 && (
          <ul id={listId} className="suggest-list progress-link-suggest-list" role="listbox">
            {results.map((opt, index) => (
              <li key={opt.key} role="option" aria-selected={index === active}>
                <button
                  type="button"
                  className={
                    index === active
                      ? "suggest-option progress-link-option on"
                      : "suggest-option progress-link-option"
                  }
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(opt)}
                >
                  <span
                    className={
                      opt.kind === "task"
                        ? "progress-link-kind is-task"
                        : "progress-link-kind is-app"
                    }
                  >
                    {opt.kind === "task" ? "task" : "app"}
                  </span>
                  <span className="progress-link-option-label">{opt.label}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {open && query.trim() && results.length === 0 && (
          <p className="muted progress-link-empty">No matching tasks or applications.</p>
        )}
      </div>
    </label>
  );
}

function WorkLinkFields({
  linkKey,
  onLinkKeyChange,
  linkOptions,
  interviewStepId,
  onInterviewStepIdChange,
  disabled,
  fixedApplicationId,
}: {
  linkKey: string;
  onLinkKeyChange: (key: string) => void;
  linkOptions: ReflectionLinkOption[];
  interviewStepId: string;
  onInterviewStepIdChange: (id: string) => void;
  disabled?: boolean;
  /** When set (application detail), hide work search and only show step. */
  fixedApplicationId?: string | null;
}) {
  const selected = linkOptions.find((o) => o.key === linkKey);
  const applicationId = fixedApplicationId ?? selected?.applicationId ?? null;
  const [steps, setSteps] = useState<ApplicationInterviewStepOption[]>([]);

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

  return (
    <div className="progress-compose-links">
      {!fixedApplicationId && (
        <WorkLinkSearch
          linkKey={linkKey}
          onLinkKeyChange={onLinkKeyChange}
          linkOptions={linkOptions}
          disabled={disabled}
        />
      )}
      {applicationId && (
        <label className="progress-compose-link">
          Interview step
          <select
            value={interviewStepId}
            disabled={disabled || steps.length === 0}
            onChange={(event) => onInterviewStepIdChange(event.target.value)}
          >
            <option value="">
              {steps.length === 0 ? "No interview steps" : "Whole application"}
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
    </div>
  );
}

export function ReflectionCompose({
  lane,
  onLaneChange,
  linkKey,
  onLinkKeyChange,
  interviewStepId,
  onInterviewStepIdChange,
  linkOptions,
  onSubmit,
  onDirtyChange,
}: {
  lane: ProgressLane;
  onLaneChange: (lane: ProgressLane) => void;
  linkKey: string;
  onLinkKeyChange: (key: string) => void;
  interviewStepId: string;
  onInterviewStepIdChange: (id: string) => void;
  linkOptions: ReflectionLinkOption[];
  onSubmit: (input: {
    lane: ProgressLane;
    body: string;
    taskId: string | null;
    applicationId: string | null;
    interviewStepId: string | null;
  }) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    onDirtyChange?.(body.trim().length > 0);
  }, [body, onDirtyChange]);

  useEffect(() => {
    return () => onDirtyChange?.(false);
  }, [onDirtyChange]);

  return (
    <form
      className="progress-compose"
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim() || busy) return;
        const opt = linkOptions.find((o) => o.key === linkKey);
        void (async () => {
          setBusy(true);
          try {
            await onSubmit({
              lane,
              body,
              taskId: opt?.taskId ?? null,
              applicationId: opt?.applicationId ?? null,
              interviewStepId:
                opt?.applicationId && interviewStepId ? interviewStepId : null,
            });
            setBody("");
          } finally {
            setBusy(false);
          }
        })();
      }}
    >
      <WorkLinkFields
        linkKey={linkKey}
        onLinkKeyChange={(key) => {
          onLinkKeyChange(key);
          onInterviewStepIdChange("");
        }}
        linkOptions={linkOptions}
        interviewStepId={interviewStepId}
        onInterviewStepIdChange={onInterviewStepIdChange}
        disabled={busy}
      />
      <textarea
        rows={4}
        placeholder="What did you work through?"
        value={body}
        disabled={busy}
        onChange={(event) => setBody(event.target.value)}
      />
      <div className="progress-compose-meta">
        <LaneChips value={lane} onChange={onLaneChange} disabled={busy} />
        <button
          type="submit"
          className="secondary"
          disabled={busy || !body.trim()}
        >
          Add reflection
        </button>
      </div>
    </form>
  );
}

export { WorkLinkFields };
