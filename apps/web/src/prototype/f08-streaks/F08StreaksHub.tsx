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
      "B2 chosen direction: flame compact — right on Progress, inline gap on congrats. A/C kept for compare.",
  },
  {
    path: "today-strip",
    title: "Q1 · Today strip with streaks",
    blurb:
      "Round 2: D streak pills (✓/pending) · E “Apps streak N” text · F today units + day streak. Pick clarity.",
  },
  {
    path: "achievements",
    title: "Q2+Q3 · Achievements surface & unlock",
    blurb:
      "Surface on Progress (provisional → M8). Unlock: modal ✓ (“Great work!”, Balance: N). A/B/C surfaces.",
  },
  {
    path: "flourish",
    title: "Q4 · Completion flourish (Q7)",
    blurb: "Verdict: drop. EarnFlash only. Confetti/vanish rejected as distracting.",
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
        Partial verdicts (2026-10-13): Q5 flame compact · Q3 modal · Q4 drop flourish. Q1/Q2 still open — review
        the round-2 strip (D/E/F) and confirm Progress surface A/B/C.
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
