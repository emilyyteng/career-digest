/**
 * F08 M8-01 hub: Progress redesign prototypes.
 * Past work A and This week layout locked; Lifetime + metrics still exploring.
 */
import { Link } from "react-router-dom";
import { HUB_PATH } from "./ProgressShell";
import "../m4/prototype-m4.css";
import "./prototype-f08-progress.css";

const SURFACES = [
  {
    path: "this-week",
    title: "This week (locked layout)",
    blurb:
      "Day streaks · week+month pulse (LC · apps · tasks · interviews · reflections / minutes) · next achievement per family · weekly goals with weekly streaks · LC ⊥ compose. No heatmap peek.",
  },
  {
    path: "past-work",
    title: "Past work (locked A)",
    blurb:
      "Calendar + always-editable day panel (interviews above apps) | 7-day completions. Toggle calendar intensity metrics (seeds / no weekly lump / minutes / events).",
  },
  {
    path: "lifetime",
    title: "Lifetime (exploring)",
    blurb:
      "Richer accumulation header · activity chart (range + metric) · heatmaps · full achievements. Chart above or below heatmaps via ← / →.",
  },
] as const;

export default function F08ProgressHub() {
  return (
    <section className="prototype-hub f08-proto f08p-page">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F08 M8-01 Progress hub · mock data only. ← /
        → flips variants where present.
      </p>
      <h2>F08 M8 · Progress hub</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Nested Progress surfaces. Open: activity metric for chart/calendar (Q67–Q68), Lifetime
        header contents (Q69).
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
