/**
 * Hub for M4 points ledger + reflection-minutes UI prototypes.
 */
import { Link } from "react-router-dom";
import "./prototype-m4.css";

const SURFACES = [
  {
    to: "/prototype/m4/ledger-completions?variant=A",
    title: "Ledger · Completions diary",
    blurb:
      "Week/month counts · type tabs with all-time · day feed with nested reflections + est/actual. A preferred · B chips · C denser list.",
  },
  {
    to: "/prototype/m4/ledger-points?variant=A",
    title: "Ledger · Points",
    blurb:
      "Balance · category breakdown · event log with balance badge. A bars · B pie · C log-first compact.",
  },
  {
    to: "/prototype/m4/reflection-minutes?variant=A",
    title: "Reflection + minutes",
    blurb:
      "Shared block: Progress compose (standalone minutes) · misc complete (always actual) · app/interview (minutes only with reflection).",
  },
] as const;

export default function M4PrototypeHub() {
  return (
    <section className="prototype-hub">
      <p className="prototype-banner">
        M4 throwaway prototypes · Progress Ledger (Completions + Points) and shared
        reflection+minutes. ← / → flips variants.{" "}
        <Link to="/prototype/f08/weekly">F08 weekly hub</Link>
        {" · "}
        <Link to="/prototype/m2">M2 hub</Link>
        {" · "}
        <Link to="/prototype/m1">M1 hub</Link>
      </p>
      <h2>M4 · Points ledger & reflection minutes</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Design questions: Completions vs Points split under temporary Progress{" "}
        <code>ledger</code> tab; how dense diary rows feel; event-log copy vs balance badge;
        one reflection+minutes component reused on Progress compose and complete modals.
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
