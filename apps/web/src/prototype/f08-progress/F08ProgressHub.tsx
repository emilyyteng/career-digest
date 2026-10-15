/**
 * F08 M8-01 hub: Progress redesign prototypes (This week, Past work, Lifetime).
 * Past work (calendar + week completions + edit/completions split) is the main
 * exploration this pass.
 */
import { Link } from "react-router-dom";
import { HUB_PATH } from "./ProgressShell";
import "../m4/prototype-m4.css";
import "./prototype-f08-progress.css";

const SURFACES = [
  {
    path: "past-work",
    title: "Q3 · Past work (start here)",
    blurb:
      "Calendar selects the day; completions = 7 days ending on that day; kind filters kept. A dual column (full day panel) · B completions-led slim actions · C unified week feed.",
  },
  {
    path: "this-week",
    title: "Q1–Q2 / Q5 · This week + heatmap peek + LC polish",
    blurb:
      "Hub landing. A goals hero + 7-day rhythm · B 14-day short grids · C collapsed peek + louder LC points.",
  },
  {
    path: "lifetime",
    title: "Q4 / Q57 · Lifetime",
    blurb:
      "All-time totals + achievements. A no heatmaps · B dual heatmaps · C next unlocks + combined rhythm.",
  },
] as const;

export default function F08ProgressHub() {
  return (
    <section className="prototype-hub f08-proto f08p-page">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F08 M8-01 Progress hub · mock data only. ← /
        → flips variants on each page.
      </p>
      <h2>F08 M8 · Progress hub</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Nested Progress surfaces (This week / Past work / Lifetime). No points ledger.
        Past work direction: calendar-driven week window — try that page first.
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
