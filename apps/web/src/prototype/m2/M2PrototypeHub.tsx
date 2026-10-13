/**
 * Hub for M2 reflection-linking / Other / deep-work UI prototypes.
 */
import { Link } from "react-router-dom";
import "./prototype-m2.css";

const SURFACES = [
  {
    to: "/prototype/m2/detail-reflections?variant=A",
    title: "Detail · Reflections panel",
    blurb:
      "Grouped (ungrouped first) · inline create with lane chips + deep work · section picker on application. B denser draft.",
  },
  {
    to: "/prototype/m2/progress-compose?variant=A",
    title: "Progress · Create / edit log",
    blurb:
      "A preferred: link above body → chips + deep-work toggle. B lane select · C link below.",
  },
  {
    to: "/prototype/m2/strip-link?variant=A",
    title: "Strip · badges only",
    blurb:
      "Today: 2/3 apps O · 3/3 LC ✓ · deep work [app ✓][tech][other ✓]. Link/transfer → detail-reflections C.",
  },
] as const;

export default function M2PrototypeHub() {
  return (
    <section className="prototype-hub">
      <p className="prototype-banner">
        M2 throwaway prototypes · reflections link/create, Other lane, deep-work field, strip
        checks. ← / → flips variants.{" "}
        <Link to="/prototype/m1">M1 hub</Link>
      </p>
      <h2>M2 · Reflections & Other</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        Design questions: how Link existing + Create sit on detail pages; how create/edit exposes
        deep work + link + Other; how Home/Progress strips show three deep-work checks (heatmap
        unchanged); how app-task reflections transfer on Mark applied.
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
