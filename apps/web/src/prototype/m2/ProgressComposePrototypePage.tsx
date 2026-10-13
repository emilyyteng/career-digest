/**
 * Pass 3 — Progress reflection compose (reflections section only).
 * Locked preferred: link row above body → lane chips → right-aligned deep-work toggle.
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import { linkCandidates, type ProtoLane, type ProtoLinkTarget } from "./fixtures";
import "./prototype-m2.css";

const VARIANTS = [
  { key: "A", name: "Preferred · link above body" },
  { key: "B", name: "Lane select instead of chips" },
  { key: "C", name: "Link below meta" },
] as const;

type Draft = {
  body: string;
  lane: ProtoLane;
  deepWork: boolean;
  linkId: string | "";
};

const initial: Draft = {
  body: "",
  lane: "application",
  deepWork: true,
  linkId: "",
};

function linkFromId(id: string): ProtoLinkTarget {
  if (!id) return null;
  const hit = linkCandidates.find((c) => c.id === id);
  return hit ? { ...hit } : null;
}

function DeepWorkToggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      className={value ? "proto-m2-toggle is-on" : "proto-m2-toggle"}
      aria-pressed={value}
      aria-label="Deep work"
      onClick={() => onChange(!value)}
    >
      <span className="proto-m2-toggle-knob" />
    </button>
  );
}

function LinkSelect({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  return (
    <label>
      Link to work
      <select value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="">Unlinked</option>
        {linkCandidates.map((c) => (
          <option key={c.id} value={c.id}>
            {c.kind}: {c.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetaRow({
  draft,
  setDraft,
  laneAsSelect = false,
}: {
  draft: Draft;
  setDraft: (next: Draft) => void;
  laneAsSelect?: boolean;
}) {
  return (
    <div className="proto-m2-compose-meta">
      {laneAsSelect ? (
        <label className="proto-m2-compose-lane-select">
          Lane
          <select
            value={draft.lane}
            onChange={(e) => setDraft({ ...draft, lane: e.target.value as ProtoLane })}
          >
            <option value="application">application</option>
            <option value="technical">technical</option>
            <option value="other">other</option>
          </select>
        </label>
      ) : (
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
      )}
      <div className="proto-m2-compose-dw">
        <span>Deep work</span>
        <DeepWorkToggle
          value={draft.deepWork}
          onChange={(deepWork) => setDraft({ ...draft, deepWork })}
        />
      </div>
    </div>
  );
}

export default function ProgressComposePrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const [draft, setDraft] = useState<Draft>(initial);
  const [saved, setSaved] = useState<(Draft & { id: string; at: string })[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const stripPreview = useMemo(() => {
    const lanes = new Set(saved.filter((s) => s.deepWork).map((s) => s.lane));
    if (draft.deepWork && draft.body.trim()) lanes.add(draft.lane);
    return {
      application: lanes.has("application"),
      technical: lanes.has("technical"),
      other: lanes.has("other"),
    };
  }, [saved, draft]);

  const linkFirst = variant === "A";
  const laneAsSelect = variant === "B";
  const linkBelow = variant === "C";

  function onSave() {
    if (!draft.body.trim()) return;
    if (editingId) {
      setSaved((cur) =>
        cur.map((row) => (row.id === editingId ? { ...row, ...draft } : row)),
      );
      setEditingId(null);
    } else {
      setSaved((cur) => [
        {
          ...draft,
          id: `r-${Date.now()}`,
          at: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        },
        ...cur,
      ]);
    }
    setDraft(initial);
  }

  function loadEdit(id: string) {
    const row = saved.find((s) => s.id === id);
    if (!row) return;
    setEditingId(id);
    setDraft({
      body: row.body,
      lane: row.lane,
      deepWork: row.deepWork,
      linkId: row.linkId,
    });
  }

  return (
    <article className="proto-m2-page">
      <p className="prototype-banner">
        Progress compose · reflections only. <strong>A preferred</strong>: link → body → lane chips
        + deep-work toggle. <Link to="/prototype/m2">← M2 hub</Link>
      </p>

      <header className="proto-m2-card">
        <h3 style={{ marginTop: 0 }}>Strip reacts to deep-work saves</h3>
        <p className="proto-m2-strip-line">
          Today: 2/3 apps <span className="proto-m2-strip-miss">O</span>
          {" · "}
          3/3 LC <span className="proto-m2-strip-check">✓</span>
          {" · "}
          deep work{" "}
          <span className="proto-m2-strip-badges">
            <span
              className={
                stripPreview.application ? "proto-m2-strip-badge is-on" : "proto-m2-strip-badge"
              }
            >
              app{stripPreview.application ? " ✓" : ""}
            </span>
            <span
              className={
                stripPreview.technical ? "proto-m2-strip-badge is-on" : "proto-m2-strip-badge"
              }
            >
              tech{stripPreview.technical ? " ✓" : ""}
            </span>
            <span
              className={stripPreview.other ? "proto-m2-strip-badge is-on" : "proto-m2-strip-badge"}
            >
              other{stripPreview.other ? " ✓" : ""}
            </span>
          </span>
        </p>
      </header>

      <div className="proto-m2-grid-2">
        <section className="proto-m2-card proto-m2-compose">
          <h3>{editingId ? "Edit reflection" : "Add reflection"}</h3>
          {linkFirst && (
            <LinkSelect
              value={draft.linkId}
              onChange={(linkId) => setDraft({ ...draft, linkId })}
            />
          )}
          <label>
            Reflection
            <textarea
              value={draft.body}
              placeholder="What did you work through?"
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
          </label>
          <MetaRow draft={draft} setDraft={setDraft} laneAsSelect={laneAsSelect} />
          {linkBelow && (
            <LinkSelect
              value={draft.linkId}
              onChange={(linkId) => setDraft({ ...draft, linkId })}
            />
          )}
          {variant === "B" && (
            <LinkSelect
              value={draft.linkId}
              onChange={(linkId) => setDraft({ ...draft, linkId })}
            />
          )}
          <div className="proto-m2-footer-actions">
            {editingId && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setEditingId(null);
                  setDraft(initial);
                }}
              >
                Cancel
              </button>
            )}
            <button
              type="button"
              className="secondary"
              onClick={onSave}
              disabled={!draft.body.trim()}
            >
              Save log
            </button>
          </div>
        </section>

        <section className="proto-m2-card">
          <h3>History dig-in · saved logs</h3>
          <p className="proto-m2-muted">
            Edit to toggle deep work / change link — strip badges update after save.
          </p>
          {saved.length === 0 ? (
            <p className="proto-m2-muted">Nothing saved yet.</p>
          ) : (
            <ul className="proto-m2-picker-list">
              {saved.map((row) => {
                const link = linkFromId(row.linkId);
                return (
                  <li key={row.id} className="proto-m2-picker-item">
                    <div>
                      <strong>{row.lane}</strong>
                      {row.deepWork ? " · deep work" : " · note only"}
                      {link ? ` · → ${link.label}` : " · unlinked"}
                      <div className="proto-m2-muted">
                        {row.at}: {row.body.slice(0, 72)}
                        {row.body.length > 72 ? "…" : ""}
                      </div>
                    </div>
                    <button type="button" className="secondary" onClick={() => loadEdit(row.id)}>
                      Edit
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Progress compose" />
    </article>
  );
}
