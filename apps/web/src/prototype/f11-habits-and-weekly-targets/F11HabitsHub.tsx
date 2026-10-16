/**
 * F11 M0 hub — Habits strip (M0-01 Done), weekly + incrementer (M0-02).
 */
import { Link } from "react-router-dom";
import { HUB_PATH } from "./F11Shell";
import "../m1/prototype-m1.css";
import "./prototype-f11.css";

const SURFACES = [
  {
    path: "strip",
    title: "M0-01 · Habits strip (Home + Progress) · Done",
    blurb:
      "Locked: Q11 mark hit-target · Q12 Log LC disclosure · Q14 ghost stamp. Keep as M2 reference.",
  },
  {
    path: "weekly",
    title: "M0-02 · Weekly goals + incrementer + Home Targets",
    blurb:
      "Q13 ± chrome (stepper / field± / field) · Q14 weekly archived look. Cap, pencil vs target stepper, no today-LC / no apps ±.",
  },
] as const;

export default function F11HabitsHub() {
  return (
    <section className="prototype-hub f11-proto">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F11 habits & weekly targets · mock data only. ← /
        → flips variants on each page.
      </p>
      <h2>F11 · Habits & weekly targets</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        M0-01 strip locked. Next: weekly column + incrementer (Q13 / weekly Q14). Spec:{" "}
        <code>docs/features/F11-habits-and-weekly-targets/spec.md</code>.
      </p>
      {SURFACES.map((s) => (
        <Link key={s.path} className="prototype-hub-card" to={`${HUB_PATH}/${s.path}`}>
          <strong>{s.title}</strong>
          <span className="muted">{s.blurb}</span>
        </Link>
      ))}
    </section>
  );
}
