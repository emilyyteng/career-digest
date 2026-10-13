/**
 * Progress weekly goals block — M5 variants (apps plain list, optional label).
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import { weeklyGoalsFixture, type ProtoWeeklyGoal, type ProtoPace } from "./fixtures";
import "../m4/prototype-m4.css";
import "./prototype-m5.css";

const VARIANTS = [
  { key: "A", name: "Label field under LC title" },
  { key: "B", name: "Label as LC subtitle · app chips" },
  { key: "C", name: "Card note · muted app text list" },
] as const;

function paceClass(label: ProtoPace["label"]): string {
  if (label === "behind") return "weekly-pace behind";
  return "weekly-pace on-track";
}

function paceText(pace: ProtoPace): string {
  if (pace.label === "ahead") return `${pace.amount} ahead`;
  if (pace.label === "behind") return `${pace.amount} behind`;
  return "on track";
}

function GoalBar({ done, total }: { done: number; total: number }) {
  const pct = total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0;
  return (
    <div
      className="weekly-goal-bar"
      role="progressbar"
      aria-valuenow={done}
      aria-valuemin={0}
      aria-valuemax={total}
    >
      <span style={{ width: `${pct}%` }} />
    </div>
  );
}

function AppsPlainList({ goal }: { goal: ProtoWeeklyGoal }) {
  if (goal.members.length === 0) {
    return (
      <p className="muted weekly-goal-empty">
        Tag application tasks as “Target this week” on Tasks.
      </p>
    );
  }
  return (
    <>
      <ul className="proto-m5-apps-plain">
        {goal.members.map((m) => (
          <li key={m.taskId} className={m.status === "completed" ? "is-done" : ""}>
            <span className="muted" aria-hidden>
              {m.status === "completed" ? "✓" : "○"}
            </span>
            <a href={`#/tasks/${m.taskId}`} onClick={(e) => e.preventDefault()}>
              {m.organization ? `${m.organization} · ${m.title}` : m.title}
            </a>
          </li>
        ))}
      </ul>
      <p className="muted proto-m5-apps-hint">Complete or untag on Tasks — not here.</p>
    </>
  );
}

function AppsChips({ goal }: { goal: ProtoWeeklyGoal }) {
  if (goal.members.length === 0) {
    return <p className="muted weekly-goal-empty">No apps tagged this week.</p>;
  }
  return (
    <div className="proto-m5-apps-chips">
      {goal.members.map((m) => (
        <a
          key={m.taskId}
          className={`proto-m5-app-chip${m.status === "completed" ? " is-done" : ""}`}
          href={`#/tasks/${m.taskId}`}
          onClick={(e) => e.preventDefault()}
        >
          {m.organization ?? m.title}
        </a>
      ))}
    </div>
  );
}

function AppsMutedList({ goal }: { goal: ProtoWeeklyGoal }) {
  if (goal.members.length === 0) {
    return <p className="muted weekly-goal-empty">No apps tagged.</p>;
  }
  return (
    <p className="muted" style={{ margin: "0.35rem 0 0", lineHeight: 1.45 }}>
      {goal.members.map((m, i) => (
        <span key={m.taskId}>
          {i > 0 && " · "}
          <span className={m.status === "completed" ? "is-done" : ""}>
            {m.organization ? `${m.organization}` : m.title}
          </span>
        </span>
      ))}
    </p>
  );
}

function LcStepperMock({ goal }: { goal: ProtoWeeklyGoal }) {
  const [n, setN] = useState(goal.progressCount);
  return (
    <div className="weekly-goal-lc-controls">
      <div className="progress-lc-stepper">
        <button type="button" className="secondary" onClick={() => setN((v) => Math.max(0, v - 1))}>
          −
        </button>
        <span>{n}</span>
        <button
          type="button"
          className="secondary"
          onClick={() => setN((v) => Math.min(goal.targetCount, v + 1))}
        >
          +
        </button>
      </div>
      <label className="weekly-goal-target-field">
        <span className="muted">Target</span>
        <input type="number" min={1} defaultValue={goal.targetCount} readOnly />
      </label>
    </div>
  );
}

function GoalBlock({
  goal,
  variant,
  labelDraft,
  onLabelDraft,
}: {
  goal: ProtoWeeklyGoal;
  variant: string;
  labelDraft: string;
  onLabelDraft: (v: string) => void;
}) {
  const appsGoal = goal.slot === "apps" ? goal : null;
  const lcGoal = goal.slot === "lc" ? goal : null;

  return (
    <div className="weekly-goal-row">
      <div className="weekly-goal-row-head">
        {variant === "B" && lcGoal?.label ? (
          <strong className="weekly-goal-title">
            {goal.title}
            <span className="proto-m5-lc-subtitle"> · {lcGoal.label}</span>
          </strong>
        ) : (
          <strong className="weekly-goal-title">{goal.title}</strong>
        )}
        <span className="weekly-goal-fraction muted">
          {goal.done}/{goal.total}
        </span>
        <span className={paceClass(goal.pace.label)}>{paceText(goal.pace)}</span>
      </div>
      <GoalBar done={goal.done} total={goal.total} />
      {variant === "A" && lcGoal && (
        <label className="proto-m5-label-field">
          <span className="muted">Label (optional, shows on Home)</span>
          <input
            type="text"
            value={labelDraft}
            placeholder="e.g. Grind 75 Week 4"
            onChange={(e) => onLabelDraft(e.target.value)}
          />
        </label>
      )}
      {lcGoal && <LcStepperMock goal={lcGoal} />}
      {appsGoal && variant === "A" && <AppsPlainList goal={appsGoal} />}
      {appsGoal && variant === "B" && <AppsChips goal={appsGoal} />}
      {appsGoal && variant === "C" && <AppsMutedList goal={appsGoal} />}
    </div>
  );
}

export default function WeeklyGoalsPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const [labelDraft, setLabelDraft] = useState(weeklyGoalsFixture[0]?.label ?? "");

  return (
    <section className="prototype-page">
      <p className="prototype-banner">
        <Link to="/prototype/m5">← M5 hub</Link>
        {" · "}
        Mirrors production <code>WeeklyGoalsBlock</code> (full, not compact).
      </p>
      <h2>Progress · Weekly goals</h2>
      <p className="muted proto-m5-notes">
        Locked: bars, counts, ahead/behind, LC stepper + target. Apps membership is read-only
        here — links only, no checkbox complete, no Untag.
      </p>
      <section className="card weekly-goals-card proto-m5-weekly-card">
        {variant === "C" && labelDraft.trim() && (
          <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.9rem" }}>
            <strong>Note:</strong> {labelDraft.trim()}
          </p>
        )}
        <h3 className="weekly-goals-heading">Weekly goals</h3>
        <div className="weekly-goals-list">
          {weeklyGoalsFixture.map((goal) => (
            <GoalBlock
              key={goal.id}
              goal={goal}
              variant={variant}
              labelDraft={labelDraft}
              onLabelDraft={setLabelDraft}
            />
          ))}
        </div>
      </section>
      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Weekly goals" />
    </section>
  );
}
