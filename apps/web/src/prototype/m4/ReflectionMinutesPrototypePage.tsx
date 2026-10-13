/**
 * Shared reflection + minutes block in three host modes.
 * A preferred layouts; B/C rearrange minutes placement.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import "./prototype-m4.css";

const VARIANTS = [
  { key: "A", name: "Preferred · minutes in meta / gated panel" },
  { key: "B", name: "Minutes field above lane chips" },
  { key: "C", name: "Minutes beside deep-work toggle" },
] as const;

type Lane = "application" | "technical" | "other";

type ReflectionDraft = {
  body: string;
  lane: Lane;
  deepWork: boolean;
  minutes: string;
};

const emptyDraft = (lane: Lane): ReflectionDraft => ({
  body: "",
  lane,
  deepWork: true,
  minutes: "",
});

function LaneChips({
  value,
  onChange,
}: {
  value: Lane;
  onChange: (lane: Lane) => void;
}) {
  return (
    <div className="proto-m4-lane-chips" role="group" aria-label="Lane">
      {(["application", "technical", "other"] as const).map((lane) => (
        <button
          key={lane}
          type="button"
          className={value === lane ? "proto-m4-lane-chip on" : "proto-m4-lane-chip"}
          onClick={() => onChange(lane)}
        >
          {lane === "application" ? "app" : lane === "technical" ? "tech" : "other"}
        </button>
      ))}
    </div>
  );
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
      className={value ? "proto-m4-toggle is-on" : "proto-m4-toggle"}
      aria-pressed={value}
      onClick={() => onChange(!value)}
    >
      <span className="proto-m4-toggle-knob" />
      deep work
    </button>
  );
}

function MinutesField({
  value,
  onChange,
  placeholder,
  hint,
  label = "Time (min)",
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  hint?: string;
  label?: string;
}) {
  return (
    <label className="proto-m4-minutes">
      <span>{label}</span>
      <input
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

/** Standalone Progress compose — minutes always available on create. */
function ProgressComposeHost({
  variant,
  draft,
  setDraft,
}: {
  variant: string;
  draft: ReflectionDraft;
  setDraft: (next: ReflectionDraft) => void;
}) {
  return (
    <div className="proto-m4-host">
      <span className="proto-m4-host-label">Progress · Today compose</span>
      <p className="proto-m4-note">
        Mode <code>standalone</code>: minutes always shown. Blank → +20 pts; set minutes →
        1 pt/min. Linking later does not re-earn.
      </p>
      <div className="proto-m4-compose">
        {variant === "B" && (
          <MinutesField
            value={draft.minutes}
            onChange={(minutes) => setDraft({ ...draft, minutes })}
            placeholder="optional"
            hint="blank → +20 pts"
          />
        )}
        <label className="proto-m4-compose-link" style={{ display: "grid", gap: "0.25rem" }}>
          <span style={{ fontSize: "0.85rem" }}>Link to work</span>
          <select defaultValue="">
            <option value="">Unlinked</option>
            <option value="t1">task: Write weekly reflection essay</option>
            <option value="a1">app: Stripe · SWE Intern</option>
          </select>
        </label>
        <textarea
          rows={3}
          placeholder="What did you work through?"
          value={draft.body}
          onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        />
        <div className="proto-m4-compose-meta">
          <LaneChips
            value={draft.lane}
            onChange={(lane) => setDraft({ ...draft, lane })}
          />
          <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
            {variant === "C" && (
              <MinutesField
                value={draft.minutes}
                onChange={(minutes) => setDraft({ ...draft, minutes })}
                placeholder="min"
                label=""
              />
            )}
            <DeepWorkToggle
              value={draft.deepWork}
              onChange={(deepWork) => setDraft({ ...draft, deepWork })}
            />
          </div>
        </div>
        {variant === "A" && (
          <MinutesField
            value={draft.minutes}
            onChange={(minutes) => setDraft({ ...draft, minutes })}
            placeholder="optional"
            hint="blank → +20 pts · set → 1 pt/min"
          />
        )}
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button type="button">Add reflection</button>
        </div>
      </div>
    </div>
  );
}

/** Misc task complete — actual always visible (task points); reflection = flat +20. */
function MiscCompleteHost({
  variant,
  estimate = 45,
}: {
  variant: string;
  estimate?: number;
}) {
  const [reflectionOn, setReflectionOn] = useState(false);
  const [notesOn, setNotesOn] = useState(false);
  const [draft, setDraft] = useState(emptyDraft("other"));
  const [actual, setActual] = useState(String(estimate));

  return (
    <div className="proto-m4-modal-shell">
      <h3>Complete task</h3>
      <p className="proto-m4-note">
        Mode <code>always</code>: actual stays below (current placement). Prefill from
        estimate. Reflection optional → flat +20 (minutes already on task).
      </p>
      <div className="proto-m4-optional">
        <button
          type="button"
          className="proto-m4-optional-bar"
          onClick={() => setReflectionOn((v) => !v)}
        >
          <span>Reflection</span>
          <span className="muted">{reflectionOn ? "on" : "off"}</span>
        </button>
        {reflectionOn && (
          <div className="proto-m4-optional-body">
            <textarea
              rows={3}
              placeholder="What did you work through?"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="proto-m4-compose-meta">
              <LaneChips
                value={draft.lane}
                onChange={(lane) => setDraft({ ...draft, lane })}
              />
              <DeepWorkToggle
                value={draft.deepWork}
                onChange={(deepWork) => setDraft({ ...draft, deepWork })}
              />
            </div>
          </div>
        )}
      </div>
      <div className="proto-m4-optional">
        <button
          type="button"
          className="proto-m4-optional-bar"
          onClick={() => setNotesOn((v) => !v)}
        >
          <span>Notes</span>
          <span className="muted">{notesOn ? "on" : "off"}</span>
        </button>
        {notesOn && (
          <div className="proto-m4-optional-body">
            <textarea rows={2} placeholder="Anything to remember…" />
          </div>
        )}
      </div>
      <MinutesField
        value={actual}
        onChange={setActual}
        label="Actual time (min)"
        placeholder="15"
        hint={`prefilled from estimate (${estimate}) · blank → 15`}
      />
      {variant === "B" && (
        <p className="proto-m4-note">Variant B keeps actual here for misc (unchanged).</p>
      )}
      <div className="form-actions" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" className="secondary">
          Cancel
        </button>
        <button type="button">Complete</button>
      </div>
    </div>
  );
}

/** App / interview — flat base; minutes only when reflection on. */
function GatedCompleteHost({
  variant,
  title,
  description,
  baseLabel,
}: {
  variant: string;
  title: string;
  description: string;
  baseLabel: string;
}) {
  const [reflectionOn, setReflectionOn] = useState(true);
  const [notesOn, setNotesOn] = useState(false);
  const [draft, setDraft] = useState({ ...emptyDraft("application"), minutes: "30" });

  const minutesBlock = (
    <MinutesField
      value={draft.minutes}
      onChange={(minutes) => setDraft({ ...draft, minutes })}
      label="Time (min)"
      placeholder="optional"
      hint="blank → +20 · set → 1 pt/min (reflection)"
    />
  );

  return (
    <div className="proto-m4-modal-shell">
      <h3>{title}</h3>
      <p className="proto-m4-note">
        Mode <code>with-reflection</code>: {baseLabel}. Minutes sit{" "}
        <strong>inside</strong> reflection (above notes), only when toggle is on.
      </p>
      <div className="proto-m4-optional">
        <button
          type="button"
          className="proto-m4-optional-bar"
          onClick={() => setReflectionOn((v) => !v)}
        >
          <span>Reflection</span>
          <span className="muted">{reflectionOn ? "on" : "off"}</span>
        </button>
        {reflectionOn && (
          <div className="proto-m4-optional-body">
            {variant === "B" && minutesBlock}
            <textarea
              rows={3}
              placeholder="What did you work through?"
              value={draft.body}
              onChange={(e) => setDraft({ ...draft, body: e.target.value })}
            />
            <div className="proto-m4-compose-meta">
              <LaneChips
                value={draft.lane}
                onChange={(lane) => setDraft({ ...draft, lane })}
              />
              <div style={{ display: "inline-flex", alignItems: "center", gap: "0.55rem" }}>
                {variant === "C" && (
                  <MinutesField
                    value={draft.minutes}
                    onChange={(minutes) => setDraft({ ...draft, minutes })}
                    placeholder="min"
                    label=""
                  />
                )}
                <DeepWorkToggle
                  value={draft.deepWork}
                  onChange={(deepWork) => setDraft({ ...draft, deepWork })}
                />
              </div>
            </div>
            {variant === "A" && minutesBlock}
          </div>
        )}
      </div>
      <div className="proto-m4-optional">
        <button
          type="button"
          className="proto-m4-optional-bar"
          onClick={() => setNotesOn((v) => !v)}
        >
          <span>Notes</span>
          <span className="muted">{notesOn ? "on" : "off"}</span>
        </button>
        {notesOn && (
          <div className="proto-m4-optional-body">
            <textarea rows={2} placeholder="Anything to remember…" />
          </div>
        )}
      </div>
      <p className="proto-m4-note">{description}</p>
      <div className="form-actions" style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
        <button type="button" className="secondary">
          Cancel
        </button>
        <button type="button">Confirm</button>
      </div>
    </div>
  );
}

export default function ReflectionMinutesPrototypePage() {
  const [params] = useSearchParams();
  const variant = (params.get("variant") ?? "A").toUpperCase();
  const [composeDraft, setComposeDraft] = useState(emptyDraft("technical"));

  return (
    <section className="proto-m4-page">
      <p className="prototype-banner">
        Shared reflection+minutes component — lock Progress compose first, then reuse in
        app/interview confirm modals. Misc keeps always-visible actual for task points.{" "}
        <Link to="/prototype/m4">← M4 hub</Link>
      </p>

      <ProgressComposeHost
        variant={variant}
        draft={composeDraft}
        setDraft={setComposeDraft}
      />

      <div className="proto-m4-hosts-grid">
        <MiscCompleteHost variant={variant} />
        <GatedCompleteHost
          variant={variant}
          title="Mark applied"
          baseLabel="flat +5 for application"
          description="Toggle reflection off → minutes disappear; cannot set actual without reflection."
        />
      </div>

      <div className="proto-m4-host">
        <span className="proto-m4-host-label">Interview finish · page 2</span>
        <GatedCompleteHost
          variant={variant}
          title="Finish step · optional reflection"
          baseLabel="flat by step kind (e.g. technical +80)"
          description="Same gated minutes pattern as mark applied."
        />
      </div>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Reflection+min" />
    </section>
  );
}
