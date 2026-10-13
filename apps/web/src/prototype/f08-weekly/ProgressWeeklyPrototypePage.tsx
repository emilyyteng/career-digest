/**
 * F08 M5-06 · design question 2: the Progress weekly goals block.
 * Editing the LC label, showing 12/10, and pace text.
 * Must satisfy R5.3 (bars, counts, pace), R5.4 (apps as a plain list: no
 * checkmarks, no untag), R5.5 (LC-only label, 50 characters), R5.14 (past
 * target) and R5.28 (weekly streak, display only).
 * Verdict so far: variant A; these variants compare where the target field sits.
 */
import { useState } from "react";
import F08Shell, { btn, ParamToggle, useParam, useVariant } from "./F08Shell";
import {
  APP_MEMBERS,
  LC_LABEL_MAX,
  LC_LABEL_SAMPLE,
  LC_SCENARIOS,
  LC_STREAK_WEEKS,
  LC_TARGET,
  type AppMember,
} from "./fixtures";
import { GoalBar, PaceText } from "./parts";

const VARIANTS = [
  { key: "A", name: "Chosen A · target below the bar, left" },
  { key: "A2", name: "A · target right, on the label line above the bar" },
  { key: "A3", name: "A · target right, below the bar" },
] as const;

type TargetPlacement = "below-left" | "label-row" | "below-right";

const PLACEMENT: Record<string, TargetPlacement> = {
  A: "below-left",
  A2: "label-row",
  A3: "below-right",
};

const LONG_LABEL = "Grind 75 Week 4 · graphs + DP, finish before Friday".slice(0, LC_LABEL_MAX);

function LabelCounter({ value }: { value: string }) {
  return (
    <span className={value.length >= LC_LABEL_MAX ? "f08-counter is-max" : "f08-counter"}>
      {value.length}/{LC_LABEL_MAX}
    </span>
  );
}

function LabelEditor({
  value,
  onSave,
  onCancel,
}: {
  value: string;
  onSave: (v: string) => void;
  onCancel: () => void;
}) {
  const [draft, setDraft] = useState(value);
  return (
    <div className="f08-label-edit">
      <input
        type="text"
        autoFocus
        maxLength={LC_LABEL_MAX}
        value={draft}
        placeholder="e.g. Grind 75 Week 4"
        aria-label="LC goal label"
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSave(draft.trim());
          if (e.key === "Escape") onCancel();
        }}
      />
      <LabelCounter value={draft} />
      <button type="button" className={btn("ghost", "sm")} onClick={onCancel}>
        Cancel
      </button>
      <button type="button" className={btn("primary", "sm")} onClick={() => onSave(draft.trim())}>
        Save
      </button>
    </div>
  );
}

function TargetField({ target, onChange }: { target: number; onChange: (n: number) => void }) {
  return (
    <label className="weekly-goal-target-field f08-target-field">
      <span className="muted">Target</span>
      <input
        type="number"
        min={1}
        defaultValue={target}
        onBlur={(e) => {
          const n = Number(e.target.value);
          if (Number.isInteger(n) && n >= 1) onChange(n);
        }}
      />
    </label>
  );
}

function AppsGoal({ members }: { members: AppMember[] }) {
  const done = members.filter((m) => m.status === "completed").length;
  const total = members.length;
  return (
    <div className="weekly-goal-row">
      <div className="weekly-goal-row-head">
        <strong className="weekly-goal-title">Weekly apps</strong>
        <span className="weekly-goal-fraction muted">
          {done}/{total}
        </span>
        {total > 0 && <PaceText done={done} total={total} />}
      </div>
      {total > 0 && <GoalBar done={done} total={total} />}
      {total === 0 ? (
        <p className="muted weekly-goal-empty">
          No tagged applications. Tag application tasks as “Target this week” on Tasks.
        </p>
      ) : (
        <>
          <ul className="f08-apps-plain">
            {members.map((m) => (
              <li key={m.taskId} className={m.status === "completed" ? "is-done" : ""}>
                <span>
                  {m.organization} · {m.title}
                </span>
                {m.status === "completed" && <span className="f08-applied-tag">applied</span>}
              </li>
            ))}
          </ul>
          <p className="muted f08-hint">Tag or untag on Tasks.</p>
        </>
      )}
    </div>
  );
}

type LcProps = {
  done: number;
  target: number;
  label: string;
  setLabel: (v: string) => void;
  setTarget: (n: number) => void;
  placement: TargetPlacement;
};

function LcGoal({ done, target, label, setLabel, setTarget, placement }: LcProps) {
  const [editing, setEditing] = useState(false);
  const targetField = <TargetField target={target} onChange={setTarget} />;
  const labelNode = editing ? (
    <LabelEditor
      value={label}
      onCancel={() => setEditing(false)}
      onSave={(v) => {
        setLabel(v);
        setEditing(false);
      }}
    />
  ) : (
    <div className="f08-label-line">
      {label ? <span className="f08-label-text">{label}</span> : null}
      <button type="button" className={btn("ghost", "sm")} onClick={() => setEditing(true)}>
        {label ? "Edit label" : "+ Add label"}
      </button>
    </div>
  );

  return (
    <div className="weekly-goal-row">
      <div className="weekly-goal-row-head">
        <strong className="weekly-goal-title">Weekly LC</strong>
        <span className="weekly-goal-fraction muted">
          {done}/{target}
        </span>
        <PaceText done={done} total={target} />
        <span className="f08-streak">LC: {LC_STREAK_WEEKS} weeks in a row</span>
      </div>
      {placement === "label-row" ? (
        <div className="f08-label-target-row">
          {labelNode}
          {targetField}
        </div>
      ) : (
        labelNode
      )}
      <GoalBar done={done} total={target} showOverflow />
      {placement !== "label-row" && (
        <div
          className={
            placement === "below-right"
              ? "weekly-goal-lc-controls f08-controls-end"
              : "weekly-goal-lc-controls"
          }
        >
          {targetField}
        </div>
      )}
    </div>
  );
}

export default function ProgressWeeklyPrototypePage() {
  const variant = useVariant(VARIANTS);
  const lcKey = useParam("lc", LC_SCENARIOS.map((s) => s.key));
  const labelKey = useParam("label", ["sample", "empty", "long"] as const);
  const appsKey = useParam("apps", ["tagged", "none"] as const);
  const done = LC_SCENARIOS.find((s) => s.key === lcKey)!.progress;
  const initialLabel = labelKey === "empty" ? "" : labelKey === "long" ? LONG_LABEL : LC_LABEL_SAMPLE;

  return (
    <F08Shell
      title="Progress · Weekly goals block"
      question="Q2: editing the LC label, showing 12/10, and pace text. Variant A is chosen; these compare where the target field sits."
      variants={VARIANTS}
      surfaceLabel="Q2 Weekly block"
      controls={
        <>
          <ParamToggle
            name="lc"
            label="LC progress"
            options={LC_SCENARIOS.map((s) => ({ key: s.key, label: s.label }))}
          />
          <ParamToggle
            name="label"
            label="Label"
            options={[
              { key: "sample", label: "Sample" },
              { key: "empty", label: "Empty" },
              { key: "long", label: "50 chars" },
            ]}
          />
          <ParamToggle
            name="apps"
            label="Apps"
            options={[
              { key: "tagged", label: "5 tagged" },
              { key: "none", label: "0 tagged" },
            ]}
          />
        </>
      }
      notes={
        <p>
          The target field is narrower here in all three, so the comparison is only about placement; its
          final size is an F09 form-field question. Try “Edit label” and the 50-character label in A2, where
          the label and target share a line. The streak text is a placeholder: its design is M5-07 Q5.
        </p>
      }
    >
      <WeeklyBlock
        key={`${variant}-${lcKey}-${labelKey}`}
        placement={PLACEMENT[variant] ?? "below-left"}
        initialDone={done}
        initialLabel={initialLabel}
        members={appsKey === "none" ? [] : APP_MEMBERS}
      />
    </F08Shell>
  );
}

function WeeklyBlock({
  placement,
  initialDone,
  initialLabel,
  members,
}: {
  placement: TargetPlacement;
  initialDone: number;
  initialLabel: string;
  members: AppMember[];
}) {
  const [label, setLabel] = useState(initialLabel);
  const [target, setTarget] = useState(LC_TARGET);
  return (
    <section className="card weekly-goals-card f08-card f08-narrow">
      <h3 className="weekly-goals-heading">Weekly goals</h3>
      <div className="weekly-goals-list">
        <LcGoal
          done={initialDone}
          target={target}
          label={label}
          setLabel={setLabel}
          setTarget={setTarget}
          placement={placement}
        />
        <AppsGoal members={members} />
      </div>
    </section>
  );
}
