/**
 * Pass 2 — misc task detail.
 * A: preferred (stacked sections, details|reflections, inline pies)
 * B: countdown before circles in meta
 * C: no subtasks + target (no circles) — edge case
 */
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PriorityBadge from "../../PriorityBadge";
import PrototypeSwitcher from "../PrototypeSwitcher";
import ProtoStickies from "./ProtoStickies";
import { DeadlineCirclesInline } from "./UrgencyViz";
import { makeMiscTaskFixture } from "./fixtures";
import "./prototype-m1.css";

const VARIANTS = [
  { key: "A", name: "Preferred · pies then countdown" },
  { key: "B", name: "Countdown before pies" },
  { key: "C", name: "Target only · no subtasks" },
] as const;

function DetailsEditor() {
  return (
    <section className="proto-section proto-section-fill">
      <h3 className="proto-section-title">Edit details</h3>
      <div className="proto-details-scroll">
        <div className="proto-details-grid">
          <label>
            Due date
            <input type="date" defaultValue="2026-10-10" readOnly />
          </label>
          <label>
            Due time
            <input type="time" defaultValue="10:00" readOnly />
          </label>
          <label>
            Date kind
            <select defaultValue="deadline" disabled>
              <option value="deadline">Deadline</option>
              <option value="target">Target</option>
            </select>
          </label>
          <label>
            Estimate (minutes)
            <input type="number" defaultValue={90} readOnly />
          </label>
          <label className="proto-span-2">
            Link
            <input type="url" defaultValue="https://example.com/essay-prompt" readOnly />
          </label>
          <label className="proto-span-2">
            Notes
            <textarea
              defaultValue="Focus on craft over volume. Keep under 800 words."
              readOnly
              rows={5}
            />
          </label>
        </div>
      </div>
      <div className="proto-details-actions">
        <button type="button" className="secondary" disabled>
          Save details
        </button>
      </div>
    </section>
  );
}

function SubtasksBlock({
  subtasks,
}: {
  subtasks: ReturnType<typeof makeMiscTaskFixture>["subtasks"];
}) {
  if (subtasks.length === 0) return null;
  const done = subtasks.filter((s) => s.done).length;
  return (
    <section className="proto-section">
      <h3 className="proto-section-title">
        Subtasks ({done}/{subtasks.length})
      </h3>
      <ul className="proto-subtasks">
        {subtasks.map((s) => (
          <li key={s.id} className={s.done ? "is-done" : undefined}>
            <span>
              {s.done ? "☑" : "☐"} {s.title}
            </span>
            <span className="proto-subtask-meta">
              {[s.dueLabel, s.estimateMinutes != null ? `${s.estimateMinutes}m` : null]
                .filter(Boolean)
                .join(" · ")}
            </span>
          </li>
        ))}
      </ul>
      <button type="button" className="secondary" disabled style={{ marginTop: "0.55rem" }}>
        Edit subtasks
      </button>
    </section>
  );
}

function TaskShell({
  countdownFirst,
  withSubtasks,
  dueKind,
}: {
  countdownFirst: boolean;
  withSubtasks: boolean;
  dueKind: "deadline" | "target";
}) {
  const task = useMemo(
    () => makeMiscTaskFixture({ withSubtasks, dueKind }),
    [withSubtasks, dueKind],
  );

  const kindLabel = dueKind === "deadline" ? "Deadline" : "Target";

  return (
    <article className="proto-page proto-page-wide">
      <header className="proto-header-card">
        <p className="proto-back muted">
          <Link to="/prototype/m1">← M1 prototypes</Link>
          {" · "}
          <Link to="/tasks">Tasks</Link>
        </p>
        <div className="proto-header-top">
          <h2 className="proto-title">
            <PriorityBadge priority={task.priority} /> {task.title}
          </h2>
          <button type="button" className="secondary proto-cta-compact" disabled>
            Complete
          </button>
        </div>
        <div className="proto-meta">
          <span>{task.categoryName}</span>
          <span className="proto-meta-dot">·</span>
          <span>{task.organization}</span>
          <span className="proto-meta-dot">·</span>
          <span>{kindLabel}</span>
          {dueKind === "deadline" && task.dueAt && (
            <>
              <span className="proto-meta-dot">·</span>
              <DeadlineCirclesInline
                dueAt={task.dueAt}
                dueKind={dueKind}
                countdownFirst={countdownFirst}
              />
            </>
          )}
        </div>
      </header>

      <SubtasksBlock subtasks={task.subtasks} />

      <div className="proto-twin proto-twin-equal">
        <DetailsEditor />
        <section className="proto-section proto-section-fill">
          <ProtoStickies items={task.stickies} fillHeight />
        </section>
      </div>
    </article>
  );
}

export default function MiscTaskPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";

  return (
    <>
      <p className="prototype-banner">
        Pass 2 · misc task · full width · compact Complete · live pie-circles (12h) in meta ·
        subtasks then details|reflections.
      </p>
      {variant === "B" ? (
        <TaskShell countdownFirst withSubtasks dueKind="deadline" />
      ) : variant === "C" ? (
        <TaskShell countdownFirst={false} withSubtasks={false} dueKind="target" />
      ) : (
        <TaskShell countdownFirst={false} withSubtasks dueKind="deadline" />
      )}
      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Misc task" />
    </>
  );
}
