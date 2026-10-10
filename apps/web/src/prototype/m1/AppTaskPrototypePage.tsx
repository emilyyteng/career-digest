/**
 * Pass 2 — application task detail.
 * A: preferred (JD → details|reflections, pies then countdown)
 * B: countdown before pies
 * C: no deadline (target) — circles hidden
 */
import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PriorityBadge from "../../PriorityBadge";
import PrototypeSwitcher from "../PrototypeSwitcher";
import ProtoStickies from "./ProtoStickies";
import { DeadlineCirclesInline } from "./UrgencyViz";
import { dueInHours, makeAppTaskFixture } from "./fixtures";
import "./prototype-m1.css";

const VARIANTS = [
  { key: "A", name: "Preferred · pies then countdown" },
  { key: "B", name: "Countdown before pies" },
  { key: "C", name: "Target · no circles" },
] as const;

function DetailsEditor({ notes }: { notes: string }) {
  return (
    <section className="proto-section proto-section-fill">
      <h3 className="proto-section-title">Edit details</h3>
      <div className="proto-details-scroll">
        <div className="proto-details-grid">
          <label>
            Due date
            <input type="date" defaultValue="2026-10-11" readOnly />
          </label>
          <label>
            Due time
            <input type="time" defaultValue="04:00" readOnly />
          </label>
          <label>
            Date kind
            <select defaultValue="deadline" disabled>
              <option value="deadline">Deadline</option>
              <option value="target">Target</option>
            </select>
          </label>
          <label>
            Location
            <input defaultValue="San Francisco, CA" readOnly />
          </label>
          <label className="proto-span-2">
            Apply URL
            <input
              type="url"
              defaultValue="https://boards.greenhouse.io/northstar/jobs/123"
              readOnly
            />
          </label>
          <label className="proto-span-2">
            Notes
            <textarea defaultValue={notes} readOnly rows={5} />
          </label>
        </div>
        <p className="muted" style={{ fontSize: "0.85rem", marginBottom: 0 }}>
          Pipeline: <Link to="/prototype/m1/application">view application →</Link>
        </p>
      </div>
      <div className="proto-details-actions">
        <button type="button" className="secondary" disabled>
          Save details
        </button>
      </div>
    </section>
  );
}

function TaskShell({
  countdownFirst,
  dueKind,
}: {
  countdownFirst: boolean;
  dueKind: "deadline" | "target";
}) {
  const task = useMemo(() => {
    const base = makeAppTaskFixture();
    if (dueKind === "target") {
      return { ...base, dueKind, dueAt: dueInHours(36) };
    }
    return base;
  }, [dueKind]);

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
          <div className="proto-header-actions">
            <span className={task.weeklyTarget ? "proto-star" : "proto-star is-off"}>
              {task.weeklyTarget ? "★ This week" : "☆ This week"}
            </span>
            <button type="button" className="secondary proto-cta-compact" disabled>
              Mark applied
            </button>
          </div>
        </div>
        <div className="proto-meta">
          <span>{task.organization}</span>
          <span className="proto-meta-dot">·</span>
          <span>{task.location}</span>
          <span className="proto-meta-dot">·</span>
          <span>Applications</span>
          <span className="proto-meta-dot">·</span>
          <span>{kindLabel}</span>
          {dueKind === "deadline" && (
            <>
              <span className="proto-meta-dot">·</span>
              <DeadlineCirclesInline
                dueAt={task.dueAt}
                dueKind={dueKind}
                countdownFirst={countdownFirst}
              />
            </>
          )}
          <span className="proto-meta-dot">·</span>
          <Link to="/jobs/demo">Linked posting</Link>
        </div>
      </header>

      <section className="proto-section">
        <div className="proto-section-head-row">
          <h3 className="proto-section-title">Job description</h3>
          <button type="button" className="secondary proto-cta-compact" disabled>
            Open posting ↗
          </button>
        </div>
        <div className="proto-scroll-box">{task.descriptionPreview}</div>
      </section>

      <div className="proto-twin proto-twin-equal">
        <DetailsEditor notes={task.notes} />
        <section className="proto-section proto-section-fill">
          <ProtoStickies items={task.stickies} fillHeight />
        </section>
      </div>
    </article>
  );
}

export default function AppTaskPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";

  return (
    <>
      <p className="prototype-banner">
        Pass 2 · application task · same header rules as misc · JD on top · details|reflections ·
        Deadline label always in meta when dated.
      </p>
      {variant === "B" ? (
        <TaskShell countdownFirst dueKind="deadline" />
      ) : variant === "C" ? (
        <TaskShell countdownFirst={false} dueKind="target" />
      ) : (
        <TaskShell countdownFirst={false} dueKind="deadline" />
      )}
      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="App task" />
    </>
  );
}
