/**
 * F08 M5-07 hub: streaks, achievements, today strip, weekly-goal streak, flourish.
 * Verdicts recorded 2026-10-13 — kept as build reference for M5-08/11/12.
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
    blurb: "Verdict B2: flame compact — right on Progress, inline gap on congrats. → M5-08 / M5-02.",
  },
  {
    path: "today-strip",
    title: "Q1 · Today strip with streaks",
    blurb: "Verdict D: streak pills; ✓ / −; +N or +0 today; no reflection badges. → M5-12.",
  },
  {
    path: "achievements",
    title: "Q2+Q3 · Achievements surface & unlock",
    blurb:
      "Verdict: Progress tab “achievements” next to ledger; unlock modal (“Great work!”, Balance: N). → M5-11.",
  },
  {
    path: "flourish",
    title: "Q4 · Completion flourish (Q7)",
    blurb: "Verdict: drop. EarnFlash only. M5-13 won't-do.",
  },
] as const;

export default function F08StreaksHub() {
  return (
    <section className="prototype-hub f08-proto" data-dir="w">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F08 M5-07 · verdicts locked 2026-10-13 · mock data only.{" "}
        <Link to="/prototype/f08/weekly">F08 weekly hub</Link>
      </p>
      <h2>F08 M5 · Streaks, achievements &amp; flourish</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Build tickets: M5-08 (weekly streak), M5-12 (today strip), M5-11 (achievements tab). Flourish dropped.
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
