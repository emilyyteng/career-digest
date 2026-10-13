/**
 * F08 M5-06 hub: prototypes for every M5 weekly-goal surface (design
 * questions 1–5) plus the F09 Q1–Q5 visual-direction test case.
 */
import { Link } from "react-router-dom";
import { HUB_PATH } from "./F08Shell";
import "../m4/prototype-m4.css";
import "./prototype-f08-weekly.css";

const SURFACES = [
  {
    path: "lc-stepper",
    title: "Q1 · Progress LeetCode stepper",
    blurb:
      "Weekly/misc × easy/medium/hard. A one control with a type switch · B one control, add grid + remove picker · C two typed controls.",
  },
  {
    path: "progress-block",
    title: "Q2 · Progress weekly goals block",
    blurb:
      "LC label editing, 12/10, pace text; apps as a plain list. A label line + tail · B inline field + met tick · C title carries label + pace sentence.",
  },
  {
    path: "home-targets",
    title: "Q3 · Home Sunday targets",
    blurb:
      "Target row treatment and the hero's “This week” bars. A interview mirror, bars stay · B mini bar, bars removed · C compact row, text line.",
  },
  {
    path: "congrats",
    title: "Q4 · Weekly congrats banner",
    blurb: "One-time notice on Home. A top strip · B in hero with per-goal breakdown · C card above Upcoming.",
  },
  {
    path: "weekly-record",
    title: "Q5 · Weekly record in the completion log",
    blurb: "A ledger rows + weekly tab · B week-closed group on the close day · C divider at the week boundary.",
  },
  {
    path: "visual-direction",
    title: "F09 Q1–Q5 · Visual direction",
    blurb:
      "Primary button + accent, elevation, sizes, palette, conflicting-pattern audit. W working choice for M5 · A current · B tinted flat · C ink. Apply to any page above with ?dir=w|a|b|c.",
  },
] as const;

export default function F08WeeklyHub() {
  return (
    <section className="prototype-hub f08-proto" data-dir="w">
      <p className="prototype-banner">
        <strong>Experimental prototype</strong> · F08 M5-06 weekly surfaces · mock data only. ← / → flips
        variants on each page; the “Visual direction” toggle applies F09 options to any page.
      </p>
      <h2>F08 M5 · Weekly goal surfaces</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Verdict recorded in M5-06 (2026-10-13): Q1 A, Q2 A2, Q3 B, Q4 B, Q5 A, direction W. Kept as the
        reference for the M5 builds.
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
