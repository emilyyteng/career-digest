/**
 * Hub for M1 detail-page UI prototypes (pass 2).
 */
import { Link } from "react-router-dom";
import "./prototype-m1.css";

const SURFACES = [
  {
    to: "/prototype/m1/misc-task?variant=A",
    title: "Misc task detail",
    blurb:
      "A preferred (pies→countdown) · B countdown→pies · C target/no subtasks. Full width; details|reflections.",
  },
  {
    to: "/prototype/m1/app-task?variant=A",
    title: "Application task detail",
    blurb:
      "Same header rules + weekly ★ · JD on top · details|reflections. C = target (no circles).",
  },
  {
    to: "/prototype/m1/application?variant=A",
    title: "Application pipeline page",
    blurb: "A/C status rail (pad variants) · B tabs. Prefer rail.",
  },
] as const;

export default function M1PrototypeHub() {
  return (
    <section className="prototype-hub">
      <p className="prototype-banner">
        Pass 2 · throwaway prototypes. Live pie-circles tick every second. ← / → flips variants.{" "}
        <Link to="/prototype/m2">M2 hub</Link>
      </p>
      <h2>M1 · Detail page prototypes</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Converging on: compact header CTA, inline deadline pies + countdown, stacked sections, JD
        or subtasks then details|reflections, status-rail application page.
      </p>
      {SURFACES.map((surface) => (
        <Link key={surface.to} className="prototype-hub-card" to={surface.to}>
          <strong>{surface.title}</strong>
          <span className="muted">{surface.blurb}</span>
        </Link>
      ))}
    </section>
  );
}
