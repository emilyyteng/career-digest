/**
 * Pass 2 — application pipeline.
 * A/C converge on status rail (preferred) with padded header.
 * B keeps tabbed materials as the only structural alternative.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import ProtoStickies from "./ProtoStickies";
import { applicationFixture } from "./fixtures";
import "./prototype-m1.css";

const VARIANTS = [
  { key: "A", name: "Status rail (preferred)" },
  { key: "B", name: "Tabbed materials" },
  { key: "C", name: "Rail · tighter header pad" },
] as const;

const app = applicationFixture;

function TitleBlock({ padClass }: { padClass: string }) {
  return (
    <header className={`proto-header-card ${padClass}`}>
      <p className="proto-back muted">
        <Link to="/prototype/m1">← M1 prototypes</Link>
        {" · "}
        <Link to="/applications">Applications</Link>
      </p>
      <div className="proto-header-top">
        <h2 className="proto-title">{app.title}</h2>
        <button type="button" className="secondary proto-cta-compact" disabled>
          Open posting ↗
        </button>
      </div>
      <div className="proto-meta">
        <span className="employer">{app.company}</span>
        <span className="proto-meta-dot">·</span>
        <span>{app.location}</span>
        <span className="proto-meta-dot">·</span>
        <span className="proto-pill">{app.status}</span>
        <span className="proto-pill">{app.source}</span>
        <span className="proto-meta-dot">·</span>
        <span>Applied {app.appliedAt}</span>
      </div>
    </header>
  );
}

function Documents() {
  return (
    <section className="proto-section">
      <h3 className="proto-section-title">Documents</h3>
      <ul className="proto-doc-list">
        {app.documents.map((name) => (
          <li key={name}>{name}</li>
        ))}
      </ul>
      <button type="button" className="secondary proto-cta-compact" disabled style={{ marginTop: "0.45rem" }}>
        Upload…
      </button>
    </section>
  );
}

function InterviewPeek() {
  return (
    <section className="proto-section">
      <h3 className="proto-section-title">Interview pipeline</h3>
      <ul className="proto-subtasks">
        {app.interviewPeek.map((step) => (
          <li key={step.title}>
            <span>{step.title}</span>
            <span className="proto-subtask-meta">{step.state}</span>
          </li>
        ))}
      </ul>
      <button type="button" className="secondary proto-cta-compact" disabled style={{ marginTop: "0.45rem" }}>
        Open workspace
      </button>
    </section>
  );
}

function JdBox({ tall = false }: { tall?: boolean }) {
  return (
    <div>
      <h3 className="proto-section-title">Job description</h3>
      <div
        className={`proto-scroll-box${tall ? " is-tall" : ""}`}
        dangerouslySetInnerHTML={{ __html: app.descriptionHtml }}
      />
    </div>
  );
}

function NotesBox() {
  return (
    <div>
      <h3 className="proto-section-title">Notes</h3>
      <div className="proto-scroll-box">{app.notes}</div>
      <div className="proto-details-actions">
        <button type="button" className="secondary proto-cta-compact" disabled>
          Save notes
        </button>
      </div>
    </div>
  );
}

function StatusRail({ padClass }: { padClass: string }) {
  return (
    <article className="proto-page proto-page-wide">
      <TitleBlock padClass={padClass} />
      <div className="proto-rail">
        <aside className="proto-rail-side">
          <section className="proto-section">
            <h3 className="proto-section-title">Stage</h3>
            <label style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem" }}>
              Status
              <select defaultValue={app.status} disabled>
                <option value="interviewing">Interviewing</option>
                <option value="applied">Applied</option>
                <option value="accepted">Accepted</option>
                <option value="declined">Declined</option>
              </select>
            </label>
            <label
              style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem", marginTop: "0.45rem" }}
            >
              Date applied
              <input type="date" defaultValue={app.appliedAt} readOnly />
            </label>
            <label
              style={{ display: "grid", gap: "0.25rem", fontSize: "0.85rem", marginTop: "0.45rem" }}
            >
              URL
              <input type="url" defaultValue={app.url} readOnly />
            </label>
            <button type="button" className="secondary proto-cta-compact" disabled style={{ marginTop: "0.55rem" }}>
              Save
            </button>
          </section>
          <Documents />
          <InterviewPeek />
        </aside>
        <div>
          <section className="proto-section">
            <JdBox tall />
          </section>
          <section className="proto-section">
            <NotesBox />
          </section>
          <section className="proto-section">
            <ProtoStickies items={app.stickies} sectionByStep />
          </section>
        </div>
      </div>
    </article>
  );
}

function Tabbed() {
  const [tab, setTab] = useState<"description" | "notes" | "docs" | "reflections">("reflections");
  return (
    <article className="proto-page proto-page-wide">
      <TitleBlock padClass="proto-header-pad" />
      <section className="proto-section">
        <h3 className="proto-section-title">Stage</h3>
        <div className="proto-stage-row">
          <label>
            Status
            <select defaultValue={app.status} disabled>
              <option value="interviewing">Interviewing</option>
            </select>
          </label>
          <label>
            Date applied
            <input type="date" defaultValue={app.appliedAt} readOnly />
          </label>
        </div>
        <div className="proto-details-actions">
          <button type="button" className="secondary proto-cta-compact" disabled>
            Save
          </button>
        </div>
      </section>
      <section className="proto-section">
        <div className="proto-tabs" role="tablist">
          {(
            [
              ["description", "Description"],
              ["notes", "Notes"],
              ["docs", "Docs"],
              ["reflections", "Reflections"],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={tab === id ? "is-on" : undefined}
              onClick={() => setTab(id)}
            >
              {label}
            </button>
          ))}
        </div>
        {tab === "description" && <JdBox tall />}
        {tab === "notes" && <NotesBox />}
        {tab === "docs" && (
          <ul className="proto-doc-list">
            {app.documents.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        )}
        {tab === "reflections" && <ProtoStickies items={app.stickies} sectionByStep />}
      </section>
      <InterviewPeek />
    </article>
  );
}

export default function ApplicationPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";

  return (
    <>
      <p className="prototype-banner">
        Pass 2 · application pipeline · status rail preferred · padded header for alignment with
        sections below.
      </p>
      {variant === "B" ? (
        <Tabbed />
      ) : variant === "C" ? (
        <StatusRail padClass="proto-header-pad-tight" />
      ) : (
        <StatusRail padClass="proto-header-pad" />
      )}
      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Application" />
    </>
  );
}
