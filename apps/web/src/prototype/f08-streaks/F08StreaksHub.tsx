/**
 * F08 M5-07 hub: streaks, achievements, today strip, weekly-goal streak, flourish.
 */
import { Link } from "react-router-dom";
import { HUB_PATH } from "./F08StreaksShell";
import "../m4/prototype-m4.css";
import "../f08-weekly/prototype-f08-weekly.css";
import "./prototype-f08-streaks.css";

const SURFACES = [
  {
    path: "weekly-streak",
    title: "Q5 · Weekly-goal streak display",
    blurb:
      "Progress A2 + congrats B. A accent pill · B flame row · C count callout. Streak lengths and show-from toggles.",
  },
  {
    path: "today-strip",
    title: "Q1 · Today strip with streaks",
    blurb:
      "Apps and LC streaks instead of x/3. A text · B chips · C compact. Reflection badges on/off.",
  },
  {
    path: "achievements",
    title: "Q2+Q3 · Achievements surface & unlock",
    blurb:
      "A Progress card · B full list · C filtered catalog. Unlock via EarnFlash, modal, or notice.",
  },
  {
    path: "flourish",
    title: "Q4 · Completion flourish (Q7 keep/drop)",
    blurb: "A drop (EarnFlash only) · B confetti · C vanish. Event and EarnFlash keep/replace toggles.",
  },
] as const;

export default function F08StreaksHub() {
  return (
    <section className="prototype-hub f08-proto" data-dir="w">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F08 M5-07 streaks &amp; celebration · mock data only. ← /
        → flips variants on each page.{" "}
        <Link to="/prototype/f08/weekly">F08 weekly hub</Link>
      </p>
      <h2>F08 M5 · Streaks, achievements &amp; flourish</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Order for review: Q5 → Q1 → Q2/Q3 → Q4. Record a verdict per question (including flourish keep/drop)
        in M5-07 before the build tickets.
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
