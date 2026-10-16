/**
 * F11 M0 hub — Habits strip first (M0-01), then weekly + incrementer (M0-02).
 */
import { Link } from "react-router-dom";
import { HUB_PATH } from "./F11Shell";
import "../m1/prototype-m1.css";
import "./prototype-f11.css";

const SURFACES = [
  {
    path: "strip",
    title: "M0-01 · Habits strip (Home + Progress)",
    blurb:
      "Q11 checkoff vs edit · Q12 today-LC A expand / B Log LC · Q14 archived looks. Cap scenarios + reflection pencil modal.",
  },
  {
    path: null,
    title: "M0-02 · Weekly goals + incrementer (next)",
    blurb: "Blocked until M0-01 verdicts. Progress weekly column, multi-goal ±, Home Targets.",
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
        Sequence: lock the Habits strip, then weekly column + incrementer. Spec:{" "}
        <code>docs/features/F11-habits-and-weekly-targets/spec.md</code>.
      </p>
      {SURFACES.map((s) =>
        s.path ? (
          <Link key={s.title} className="prototype-hub-card" to={`${HUB_PATH}/${s.path}`}>
            <strong>{s.title}</strong>
            <span className="muted">{s.blurb}</span>
          </Link>
        ) : (
          <div key={s.title} className="prototype-hub-card f11-hub-disabled" aria-disabled="true">
            <strong>{s.title}</strong>
            <span className="muted">{s.blurb}</span>
          </div>
        ),
      )}
    </section>
  );
}
