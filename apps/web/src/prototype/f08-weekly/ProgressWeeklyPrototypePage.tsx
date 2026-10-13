/**
 * F08 M5-06 · design question 2: the Progress weekly goals block.
 * Editing the LC label, showing 12/10, and pace text.
 * Must satisfy R5.3 (bars, counts, pace), R5.4 (apps as a plain list: no
 * checkmarks, no untag), R5.5 (LC-only label, 50 characters), R5.14 (past
 * target) and R5.28 (weekly streak, display only).
 */
import { useState } from "react";
import F08Shell, { btn, ParamToggle, useParam, useVariant } from "./F08Shell";
import {
  APP_MEMBERS,
  computePace,
  FRACTION_ELAPSED,
  LC_LABEL_MAX,
  LC_LABEL_SAMPLE,
  LC_SCENARIOS,
  LC_STREAK_WEEKS,
  LC_TARGET,
  type AppMember,
} from "./fixtures";
import { GoalBar, PaceText } from "./parts";

const VARIANTS = [
  { key: "A", name: "Label line under title · +N tail" },
  { key: "B", name: "Inline label field · met tick" },
  { key: "C", name: "Title carries label · pace sentence" },
] as const;

const LONG_LABEL = "Grind 75 Week 4 · graphs + DP, finish before Friday".slice(0, LC_LABEL_MAX);

function paceSentence(done: number, total: number): string {
  if (done > total) return `${done - total} past target`;
  if (done === total) return "target met";
  const daysLeft = Math.max(1, 7 - Math.floor(FRACTION_ELAPSED * 7));
  const left = total - done;
  const perDay = Math.ceil(left / daysLeft);
  const pace = computePace(done, total);
  const tail = pace.label === "behind" ? ` · ${pace.amount} behind` : "";
  return `${left} left · about ${perDay} a day${tail}`;
}

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
    <label className="weekly-goal-target-field">
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

function LcGoalA({ done, target, label, setLabel, setTarget }: LcProps) {
  const [editing, setEditing] = useState(false);
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
      {editing ? (
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
      )}
      <GoalBar done={done} total={target} showOverflow />
      <div className="weekly-goal-lc-controls">
        <TargetField target={target} onChange={setTarget} />
      </div>
    </div>
  );
}

function LcGoalB({ done, target, label, setLabel, setTarget }: LcProps) {
  const [focused, setFocused] = useState(false);
  const met = done >= target;
  return (
    <div className="weekly-goal-row">
      <div className="weekly-goal-row-head">
        <strong className="weekly-goal-title">Weekly LC</strong>
        <span className="weekly-goal-fraction muted">
          {done}/{target}
        </span>
        {met ? (
          <span className="weekly-pace on-track f08-met-tick">✓ target met{done > target ? ` · +${done - target}` : ""}</span>
        ) : (
          <PaceText done={done} total={target} />
        )}
      </div>
      <div className="f08-label-inline">
        <input
          type="text"
          maxLength={LC_LABEL_MAX}
          value={label}
          placeholder="Label (optional), e.g. Grind 75 Week 4"
          aria-label="LC goal label"
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onChange={(e) => setLabel(e.target.value)}
        />
        {focused && <LabelCounter value={label} />}
      </div>
      <GoalBar done={done} total={target} />
      <div className="weekly-goal-lc-controls">
        <TargetField target={target} onChange={setTarget} />
        <span className="f08-streak-chip">{LC_STREAK_WEEKS}-week streak</span>
      </div>
    </div>
  );
}

function LcGoalC({ done, target, label, setLabel, setTarget }: LcProps) {
  const [editing, setEditing] = useState(false);
  const pace = computePace(done, target);
  return (
    <div className="weekly-goal-row">
      {editing ? (
        <LabelEditor
          value={label}
          onCancel={() => setEditing(false)}
          onSave={(v) => {
            setLabel(v);
            setEditing(false);
          }}
        />
      ) : (
        <div className="weekly-goal-row-head">
          <strong className="weekly-goal-title">
            Weekly LC goal{label ? ` · ${label}` : ""}
          </strong>
          <button
            type="button"
            className={btn("ghost", "sm")}
            aria-label={label ? "Edit label" : "Add label"}
            onClick={() => setEditing(true)}
          >
            ✎{label ? "" : " label"}
          </button>
        </div>
      )}
      <div className="f08-big-fraction">
        <strong>{done}</strong>
        <span className="muted"> / {target}</span>
        <span className={pace.label === "behind" ? "weekly-pace behind" : "weekly-pace on-track"}>
          {" "}
          {paceSentence(done, target)}
        </span>
      </div>
      <GoalBar done={done} total={target} showOverflow />
      <div className="weekly-goal-lc-controls">
        <TargetField target={target} onChange={setTarget} />
        <span className="muted f08-streak">LC: {LC_STREAK_WEEKS} weeks in a row</span>
      </div>
    </div>
  );
}

type LcProps = {
  done: number;
  target: number;
  label: string;
  setLabel: (v: string) => void;
  setTarget: (n: number) => void;
};

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
      question="Q2: editing the LC label, showing 12/10, and pace text. The apps list is plain (R5.4)."
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
          The label is LC-only and clears each week (R5.5, R5.13); the target carries forward. The apps
          list has no checkbox or untag; membership is managed on Tasks (R5.4). Today&apos;s production
          pace says “on track” once a goal is met; each variant proposes something clearer for met and
          past-target weeks (Proposed).
        </p>
      }
    >
      <WeeklyBlock
        key={`${variant}-${lcKey}-${labelKey}`}
        variant={variant}
        initialDone={done}
        initialLabel={initialLabel}
        members={appsKey === "none" ? [] : APP_MEMBERS}
      />
    </F08Shell>
  );
}

function WeeklyBlock({
  variant,
  initialDone,
  initialLabel,
  members,
}: {
  variant: string;
  initialDone: number;
  initialLabel: string;
  members: AppMember[];
}) {
  const [label, setLabel] = useState(initialLabel);
  const [target, setTarget] = useState(LC_TARGET);
  const props: LcProps = { done: initialDone, target, label, setLabel, setTarget };
  return (
    <section className="card weekly-goals-card f08-card f08-narrow">
      <h3 className="weekly-goals-heading">Weekly goals</h3>
      <div className="weekly-goals-list">
        {variant === "A" && <LcGoalA {...props} />}
        {variant === "B" && <LcGoalB {...props} />}
        {variant === "C" && <LcGoalC {...props} />}
        <AppsGoal members={members} />
      </div>
    </section>
  );
}
