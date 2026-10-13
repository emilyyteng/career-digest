/**
 * Pass 3 — Today strip only.
 * Locked: Today: 2/3 apps O · 3/3 LC ✓ · deep work [badges with ✓ when on]
 * Link/transfer lives on detail-reflections variant C (in context of the host page).
 */
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import { stripToday } from "./fixtures";
import "./prototype-m2.css";

const VARIANTS = [
  { key: "A", name: "Preferred · ✓ inside on badges" },
  { key: "B", name: "Tint only (no ✓ in badge)" },
  { key: "C", name: "Initials A / T / O" },
] as const;

function capMark(earned: number, cap: number) {
  const met = earned >= cap;
  return (
    <span className={met ? "proto-m2-strip-check" : "proto-m2-strip-miss"}>
      {met ? "✓" : "O"}
    </span>
  );
}

export default function StripLinkPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") ?? "A";
  const t = stripToday;

  const lanes = [
    { key: "app", on: t.effortApplication, word: "app", initial: "A" },
    { key: "tech", on: t.effortTechnical, word: "tech", initial: "T" },
    { key: "other", on: t.effortOther, word: "other", initial: "O" },
  ] as const;

  return (
    <article className="proto-m2-page">
      <p className="prototype-banner">
        Strip only · preferred shape locked. Link existing + Mark applied transfer are on{" "}
        <Link to="/prototype/m2/detail-reflections?variant=C">detail-reflections · C</Link> (inside
        a real host page). <Link to="/prototype/m2">← M2 hub</Link>
      </p>

      <section className="proto-m2-card">
        <h3 style={{ marginTop: 0 }}>Today strip</h3>
        <p className="proto-m2-strip-line">
          Today: {t.applications.earned}/{t.applications.cap} apps{" "}
          {capMark(t.applications.earned, t.applications.cap)}
          {" · "}
          {t.leetcode.earned}/{t.leetcode.cap} LC{" "}
          {capMark(t.leetcode.earned, t.leetcode.cap)}
          {" · "}
          deep work{" "}
          <span className="proto-m2-strip-badges">
            {lanes.map((lane) => {
              let label: string = lane.word;
              if (variant === "C") label = lane.initial;
              if (variant === "A" && lane.on) label = `${lane.word} ✓`;
              return (
                <span
                  key={lane.key}
                  className={lane.on ? "proto-m2-strip-badge is-on" : "proto-m2-strip-badge"}
                >
                  {label}
                </span>
              );
            })}
          </span>
        </p>
        <p className="proto-m2-muted" style={{ marginBottom: 0 }}>
          Apps/LC: ✓ only when cap is hit, otherwise O. Deep work is a label + three badges
          (filled tint when that lane has a deep-work reflection today). Heatmaps stay application
          vs technical only.
        </p>
      </section>

      <section className="proto-m2-card">
        <h3>Where did the interaction demos go?</h3>
        <p className="proto-m2-muted" style={{ marginBottom: "0.55rem" }}>
          Free-floating pickers weren’t useful without the task/application chrome. Use the detail
          prototype instead:
        </p>
        <ul className="proto-m2-muted" style={{ margin: 0, paddingLeft: "1.2rem" }}>
          <li>
            <Link to="/prototype/m2/detail-reflections?variant=A">
              detail-reflections · A/B
            </Link>{" "}
            — Link existing / Create on misc, app-task, or application hosts
          </li>
          <li>
            <Link to="/prototype/m2/detail-reflections?variant=C">
              detail-reflections · C
            </Link>{" "}
            — sectioned application stickies + <strong>Mark applied (transfer from app task)</strong>
          </li>
        </ul>
      </section>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Strip" />
    </article>
  );
}
