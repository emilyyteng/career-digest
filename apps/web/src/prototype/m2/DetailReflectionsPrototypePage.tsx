/**
 * Detail Reflections — preferred lock.
 * - Grouped by step; ungrouped stickies first
 * - Create = inline draft (never instant-append)
 * - Draft fields mirror Progress compose: lane chips + deep-work toggle (+ optional section on application)
 * - Bottom Link existing / Create; accordion + flipped ✎; fixed twin scroll
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import {
  appTaskStickies,
  applicationStickies,
  miscTaskStickies,
  unlinkedPool,
  type ProtoLane,
  type ProtoReflection,
} from "./fixtures";
import "./prototype-m2.css";

const VARIANTS = [
  { key: "A", name: "Preferred · grouped + inline draft" },
  { key: "B", name: "Same · denser draft chrome" },
] as const;

type Host = "misc" | "app-task" | "application";

type CreateDraft = {
  body: string;
  lane: ProtoLane;
  deepWork: boolean;
  /** Empty string = ungrouped (top). */
  stepLabel: string;
};

const APP_SECTIONS = ["Application", "Phone screen", "Tech screen"] as const;

function truncate(body: string, max = 72): string {
  const oneLine = body.replace(/\s+/g, " ").trim();
  if (oneLine.length <= max) return oneLine;
  return `${oneLine.slice(0, max - 1)}…`;
}

function PencilIcon() {
  return (
    <span className="proto-m2-note-edit-icon" aria-hidden="true">
      ✎
    </span>
  );
}

function defaultLane(host: Host): ProtoLane {
  if (host === "misc") return "other";
  return "application";
}

function AccordionList({
  items,
  onSave,
}: {
  items: ProtoReflection[];
  onSave: (id: string, patch: Partial<ProtoReflection>) => void;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftBody, setDraftBody] = useState("");
  const [draftLane, setDraftLane] = useState<ProtoLane>("application");
  const [draftDeepWork, setDraftDeepWork] = useState(true);

  if (items.length === 0) {
    return <p className="proto-m2-muted">No reflections in this section.</p>;
  }

  return (
    <ul className="proto-m2-note-list">
      {items.map((row) => {
        const open = openId === row.id;
        const editing = editingId === row.id;
        return (
          <li key={row.id} className="proto-m2-note-card">
            <div className="proto-m2-note-head">
              <button
                type="button"
                className="secondary proto-m2-note-toggle"
                onClick={() => {
                  setOpenId(open ? null : row.id);
                  if (editing) setEditingId(null);
                }}
              >
                <span className="proto-m2-pill proto-m2-pill-lane">{row.lane}</span>
                {row.deepWork && <span className="proto-m2-pill proto-m2-pill-dw">dw</span>}
                <span>{truncate(row.body)}</span>
              </button>
              {!editing && (
                <button
                  type="button"
                  className="secondary proto-m2-note-edit"
                  aria-label="Edit reflection"
                  onClick={() => {
                    setOpenId(row.id);
                    setEditingId(row.id);
                    setDraftBody(row.body);
                    setDraftLane(row.lane);
                    setDraftDeepWork(row.deepWork);
                  }}
                >
                  <PencilIcon />
                </button>
              )}
            </div>
            {open && (
              <div className="proto-m2-note-body">
                {editing ? (
                  <>
                    <textarea
                      className="proto-m2-draft-textarea"
                      rows={4}
                      value={draftBody}
                      onChange={(e) => setDraftBody(e.target.value)}
                    />
                    <div className="proto-m2-compose-meta">
                      <div className="proto-m2-chips">
                        {(["application", "technical", "other"] as const).map((lane) => (
                          <button
                            key={lane}
                            type="button"
                            className={draftLane === lane ? "proto-m2-chip is-on" : "proto-m2-chip"}
                            onClick={() => setDraftLane(lane)}
                          >
                            {lane}
                          </button>
                        ))}
                      </div>
                      <div className="proto-m2-compose-dw">
                        <span>Deep work</span>
                        <button
                          type="button"
                          className={draftDeepWork ? "proto-m2-toggle is-on" : "proto-m2-toggle"}
                          aria-pressed={draftDeepWork}
                          onClick={() => setDraftDeepWork(!draftDeepWork)}
                        >
                          <span className="proto-m2-toggle-knob" />
                        </button>
                      </div>
                    </div>
                    <div className="proto-m2-note-actions">
                      <button
                        type="button"
                        className="secondary"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        className="secondary"
                        disabled={!draftBody.trim()}
                        onClick={() => {
                          onSave(row.id, {
                            body: draftBody,
                            lane: draftLane,
                            deepWork: draftDeepWork,
                          });
                          setEditingId(null);
                        }}
                      >
                        Save
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="proto-m2-note-text">{row.body}</p>
                    {row.link && (
                      <p className="proto-m2-muted" style={{ margin: "0.35rem 0 0" }}>
                        Linked → {row.link.label}
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
  );
}

/** Ungrouped first, then named sections in stable order. */
function groupReflections(items: ProtoReflection[]) {
  const ungrouped = items.filter((item) => !item.stepLabel?.trim());
  const named = new Map<string, ProtoReflection[]>();
  for (const item of items) {
    const key = item.stepLabel?.trim();
    if (!key) continue;
    const list = named.get(key) ?? [];
    list.push(item);
    named.set(key, list);
  }
  const groups: { key: string; label: string | null; items: ProtoReflection[] }[] = [];
  if (ungrouped.length > 0) {
    groups.push({ key: "ungrouped", label: null, items: ungrouped });
  }
  for (const section of APP_SECTIONS) {
    const list = named.get(section);
    if (list?.length) groups.push({ key: section, label: section, items: list });
  }
  for (const [label, list] of named) {
    if ((APP_SECTIONS as readonly string[]).includes(label)) continue;
    groups.push({ key: label, label, items: list });
  }
  return groups;
}

function InlineCreateDraft({
  host,
  dense,
  draft,
  setDraft,
  onCancel,
  onSave,
}: {
  host: Host;
  dense?: boolean;
  draft: CreateDraft;
  setDraft: (next: CreateDraft) => void;
  onCancel: () => void;
  onSave: () => void;
}) {
  return (
    <div className={`proto-m2-inline-create${dense ? " is-dense" : ""}`}>
      <strong className="proto-m2-inline-create-title">New reflection</strong>
      <textarea
        className="proto-m2-draft-textarea"
        rows={dense ? 3 : 4}
        value={draft.body}
        placeholder="What did you work through?"
        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
      />
      <div className="proto-m2-compose-meta">
        <div className="proto-m2-chips">
          {(["application", "technical", "other"] as const).map((lane) => (
            <button
              key={lane}
              type="button"
              className={draft.lane === lane ? "proto-m2-chip is-on" : "proto-m2-chip"}
              onClick={() => setDraft({ ...draft, lane })}
            >
              {lane}
            </button>
          ))}
        </div>
        <div className="proto-m2-compose-dw">
          <span>Deep work</span>
          <button
            type="button"
            className={draft.deepWork ? "proto-m2-toggle is-on" : "proto-m2-toggle"}
            aria-pressed={draft.deepWork}
            onClick={() => setDraft({ ...draft, deepWork: !draft.deepWork })}
          >
            <span className="proto-m2-toggle-knob" />
          </button>
        </div>
      </div>
      {host === "application" && (
        <label className="proto-m2-section-select">
          Section
          <select
            value={draft.stepLabel}
            onChange={(e) => setDraft({ ...draft, stepLabel: e.target.value })}
          >
            <option value="">Ungrouped (top)</option>
            {APP_SECTIONS.map((section) => (
              <option key={section} value={section}>
                {section}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="proto-m2-note-actions">
        <button type="button" className="secondary" onClick={onCancel}>
          Cancel
        </button>
        <button
          type="button"
          className="secondary"
          disabled={!draft.body.trim()}
          onClick={onSave}
        >
          Save
        </button>
      </div>
    </div>
  );
}

export default function DetailReflectionsPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const dense = variant === "B";
  const [host, setHost] = useState<Host>("application");
  const [flash, setFlash] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [createDraft, setCreateDraft] = useState<CreateDraft>({
    body: "",
    lane: "application",
    deepWork: true,
    stepLabel: "",
  });
  const [itemsByHost, setItemsByHost] = useState<Record<Host, ProtoReflection[]>>({
    misc: [
      ...miscTaskStickies,
      {
        id: "m-ungrouped",
        title: "Quick note",
        body: "Ungrouped sticky sits above any sections.",
        when: "Today",
        lane: "other",
        deepWork: false,
        link: { kind: "misc-task", id: "t-misc", label: "Write weekly reflection essay" },
        stepLabel: null,
      },
    ],
    "app-task": [...appTaskStickies],
    application: [
      {
        id: "p-ungrouped",
        title: "Loose note",
        body: "Not tied to a step yet — shows at the top of Reflections.",
        when: "Today",
        lane: "technical",
        deepWork: false,
        link: { kind: "application", id: "app-1", label: "Stripe · SWE Intern" },
        stepLabel: null,
      },
      ...applicationStickies,
    ],
  });

  const items = itemsByHost[host];
  const groups = useMemo(() => groupReflections(items), [items]);

  function flashMsg(message: string) {
    setFlash(message);
    window.setTimeout(() => setFlash(null), 2400);
  }

  function hostLink(): ProtoReflection["link"] {
    if (host === "misc") {
      return { kind: "misc-task", id: "t-misc", label: "Write weekly reflection essay" };
    }
    if (host === "app-task") {
      return { kind: "app-task", id: "t-app", label: "Apply · Stripe SWE Intern" };
    }
    return { kind: "application", id: "app-1", label: "Stripe · SWE Intern" };
  }

  function openCreate() {
    setCreating(true);
    setCreateDraft({
      body: "",
      lane: defaultLane(host),
      deepWork: true,
      stepLabel: "",
    });
  }

  function onLink() {
    const next = unlinkedPool.find((r) => !items.some((i) => i.id === r.id));
    if (!next) {
      flashMsg("No more unlinked reflections in the pool");
      return;
    }
    setItemsByHost((cur) => ({
      ...cur,
      [host]: [
        ...cur[host],
        {
          ...next,
          link: hostLink(),
          // Linked-in logs stay ungrouped until edited — top of list.
          stepLabel: null,
        },
      ],
    }));
    flashMsg(`Linked “${next.title}” (ungrouped)`);
  }

  function onSubmitCreate() {
    if (!createDraft.body.trim()) return;
    const created: ProtoReflection = {
      id: `new-${Date.now()}`,
      title: "New reflection",
      body: createDraft.body,
      when: "Just now",
      lane: createDraft.lane,
      deepWork: createDraft.deepWork,
      link: hostLink(),
      stepLabel: host === "application" ? createDraft.stepLabel || null : null,
    };
    setItemsByHost((cur) => ({ ...cur, [host]: [...cur[host], created] }));
    setCreating(false);
    flashMsg(
      `Saved · lane ${createDraft.lane}` +
        (createDraft.stepLabel ? ` · section ${createDraft.stepLabel}` : " · ungrouped"),
    );
  }

  function onSave(id: string, patch: Partial<ProtoReflection>) {
    setItemsByHost((cur) => ({
      ...cur,
      [host]: cur[host].map((item) => (item.id === id ? { ...item, ...patch } : item)),
    }));
    flashMsg("Saved reflection");
  }

  function markAppliedTransfer() {
    const fromTask = itemsByHost["app-task"];
    if (fromTask.length === 0) {
      flashMsg("App task has no stickies — switch host to app-task and add some first");
      return;
    }
    const transferred = fromTask.map((item) => ({
      ...item,
      when: `${item.when} · transferred`,
      link: { kind: "application" as const, id: "app-1", label: "Stripe · SWE Intern" },
      // Transfer into Application section by default (still editable).
      stepLabel: item.stepLabel ?? "Application",
    }));
    setItemsByHost((cur) => ({
      ...cur,
      "app-task": [],
      application: [...transferred, ...cur.application],
    }));
    setHost("application");
    flashMsg(`Transferred ${transferred.length} from app task → application`);
  }

  return (
    <article className="proto-m2-page">
      <p className="prototype-banner">
        Detail Reflections · grouped (ungrouped first) · inline create with lane + deep work ·
        bottom actions. <Link to="/prototype/m2">← M2 hub</Link>
      </p>

      <header className="proto-m2-card">
        <div className="proto-m2-stickies-head">
          <div>
            <h3 style={{ margin: 0 }}>
              {host === "misc"
                ? "Write weekly reflection essay"
                : host === "app-task"
                  ? "Apply · Stripe SWE Intern"
                  : "Stripe · SWE Intern"}
            </h3>
            <p className="proto-m2-muted" style={{ margin: "0.25rem 0 0" }}>
              Create opens an inline draft — pick lane (and section on application). Nothing is
              auto-filed as application without your choice.
            </p>
          </div>
          <div className="proto-m2-stickies-actions">
            <select
              value={host}
              onChange={(e) => {
                setHost(e.target.value as Host);
                setCreating(false);
              }}
              aria-label="Host surface"
            >
              <option value="misc">Misc task</option>
              <option value="app-task">App task</option>
              <option value="application">Application</option>
            </select>
            {host === "application" && (
              <button type="button" className="secondary" onClick={markAppliedTransfer}>
                Mark applied (transfer)
              </button>
            )}
            <button
              type="button"
              className="secondary"
              onClick={() => {
                setItemsByHost({
                  misc: [
                    ...miscTaskStickies,
                    {
                      id: "m-ungrouped",
                      title: "Quick note",
                      body: "Ungrouped sticky sits above any sections.",
                      when: "Today",
                      lane: "other",
                      deepWork: false,
                      link: {
                        kind: "misc-task",
                        id: "t-misc",
                        label: "Write weekly reflection essay",
                      },
                      stepLabel: null,
                    },
                  ],
                  "app-task": [...appTaskStickies],
                  application: [
                    {
                      id: "p-ungrouped",
                      title: "Loose note",
                      body: "Not tied to a step yet — shows at the top of Reflections.",
                      when: "Today",
                      lane: "technical",
                      deepWork: false,
                      link: {
                        kind: "application",
                        id: "app-1",
                        label: "Stripe · SWE Intern",
                      },
                      stepLabel: null,
                    },
                    ...applicationStickies,
                  ],
                });
                setCreating(false);
                flashMsg("Reset");
              }}
            >
              Reset
            </button>
          </div>
        </div>
        {flash && (
          <p className="proto-m2-muted" role="status">
            {flash}
          </p>
        )}
      </header>

      <div className="proto-m2-grid-2 proto-m2-twin-fixed">
        <section className="proto-m2-card proto-m2-twin-col">
          <h3>Edit details</h3>
          <div className="proto-m2-twin-col-body">
            <p className="proto-m2-muted">
              Fixed-height twin — Reflections scrolls inside its column.
            </p>
            <label className="proto-m2-fake-field">
              Title
              <input readOnly value="Prototype title" />
            </label>
            <label className="proto-m2-fake-field">
              Notes
              <textarea
                readOnly
                rows={6}
                value="Placeholder notes stay put while stickies scroll."
              />
            </label>
          </div>
          <div className="proto-m2-footer-actions">
            <button type="button" className="secondary" disabled>
              Save details
            </button>
          </div>
        </section>

        <section className="proto-m2-card proto-m2-stickies is-fixed">
          <div className="proto-m2-stickies-head">
            <h3>Reflections ({items.length})</h3>
            {creating && (
              <span className="proto-m2-pill proto-m2-pill-dw">drafting…</span>
            )}
          </div>
          <div className="proto-m2-stickies-scroll">
            {items.length === 0 && !creating ? (
              <div className="proto-m2-empty-pair">
                <div className="proto-m2-empty-card">
                  <strong>Link existing</strong>
                  <span className="proto-m2-muted">Attach an unlinked Progress log.</span>
                  <button type="button" className="secondary" onClick={onLink}>
                    Choose…
                  </button>
                </div>
                <div className="proto-m2-empty-card">
                  <strong>Create reflection</strong>
                  <span className="proto-m2-muted">Opens inline draft with lane + deep work.</span>
                  <button type="button" className="secondary" onClick={openCreate}>
                    Write…
                  </button>
                </div>
              </div>
            ) : (
              <>
                {groups.map((group) => (
                  <div key={group.key} className="proto-m2-step-block">
                    {group.label ? (
                      <h4 className="proto-m2-group-label">{group.label}</h4>
                    ) : (
                      groups.some((g) => g.label) && (
                        <h4 className="proto-m2-group-label">Ungrouped</h4>
                      )
                    )}
                    <AccordionList items={group.items} onSave={onSave} />
                  </div>
                ))}
                {creating && (
                  <InlineCreateDraft
                    host={host}
                    dense={dense}
                    draft={createDraft}
                    setDraft={setCreateDraft}
                    onCancel={() => setCreating(false)}
                    onSave={onSubmitCreate}
                  />
                )}
              </>
            )}
          </div>
          {!(items.length === 0 && !creating) && (
            <div className="proto-m2-footer-actions">
              <button type="button" className="secondary" onClick={onLink}>
                Link existing
              </button>
              <button
                type="button"
                className="secondary"
                onClick={openCreate}
                disabled={creating}
              >
                Create reflection
              </button>
            </div>
          )}
        </section>
      </div>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Detail reflections" />
    </article>
  );
}
