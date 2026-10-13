/**
 * Hub for M5 celebration + weekly goals + Home target rows.
 */
import { Link } from "react-router-dom";
import "../m4/prototype-m4.css";

const SURFACES = [
  {
    to: "/prototype/m5/weekly-goals?variant=A",
    title: "Progress · Weekly goals",
    blurb:
      "Keep bars + pace + LC stepper. Apps = plain list (no checkbox / untag). Optional label on LC for Home subtitle. A field under title · B subtitle · C card note.",
  },
  {
    to: "/prototype/m5/home-targets?variant=A",
    title: "Home · Targets (Sunday)",
    blurb:
      "Weekly LC + apps goal rows under Targets only (never Deadlines), interview-adjacent styling, hide when met. A full interview mirror · B badge + pace · C compact link to Progress.",
  },
  {
    to: "/prototype/m5/celebration?variant=A",
    title: "Completion flourish",
    blurb:
      "Dynamic feedback at click (not toast-only): A confetti + EarnFlash · B row vanish + weekly +100 hero · C pulse + sparkles + stacked earn lines.",
  },
] as const;

export default function M5PrototypeHub() {
  return (
    <section className="prototype-hub">
      <p className="prototype-banner">
        M5 throwaway prototypes · celebration, Progress weekly UX, Home Sunday targets. ← / →
        flips variants.{" "}
        <Link to="/prototype/m4">M4 hub</Link>
        {" · "}
        <Link to="/prototype/m2">M2 hub</Link>
        {" · "}
        <Link to="/prototype/rewards">Rewards hub</Link>
      </p>
      <h2>M5 · Celebration & weekly goal surfaces</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Design questions: where optional weekly labels live; how plain the apps list feels
        without accidental untag; Sunday target rows vs real tasks; flourish intensity vs
        EarnFlash (including +100 weekly hits from M4 events).
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
