/**
 * Hub for the cat cake rewards (gacha) design prototypes.
 */
import { Link } from "react-router-dom";
import CatCake from "./CatCake";
import { FLAVORS } from "./flavors";
import "../m4/prototype-m4.css";
import "./prototype-rewards.css";

const SURFACES = [
  {
    to: "/prototype/rewards/lab?variant=D",
    title: "Cat Cake Lab · SVG feasibility",
    blurb:
      "All 24 variants as pure inline SVG at 200 / 96 / 48 / 32px, silhouettes, and a blind check. A Day · B Night Collector's Edition looks.",
  },
  {
    to: "/prototype/rewards/pull?variant=C",
    title: "Bakery Banner · pulls",
    blurb:
      "180 pts/pull, friendship dupes in results. A all boxes · tap opens all · B card flip · C one-by-one (Skip → all boxes, top-right). Pull buttons disabled when you can't afford. Rate ladder + simulation.",
  },
  {
    to: "/prototype/rewards/collection?variant=A",
    title: "Collection · dupes + refunds",
    blurb: "Album with silhouettes for undiscovered cats, dupe counts, per-cat and bulk refunds. A album grid · B bakery shelf.",
  },
] as const;

export default function RewardsPrototypeHub() {
  return (
    <section className="prototype-hub">
      <p className="prototype-banner">
        Rewards throwaway prototypes · cat cake gacha. Design only; nothing writes to the points ledger.{" "}
        <Link to="/prototype/f08/weekly">F08 weekly hub</Link>
        {" · "}
        <Link to="/prototype/f08/streaks">F08 streaks hub</Link>
      </p>
      <h2>Rewards · Cat Cake Collection</h2>
      <div className="rw-thumb-strip" aria-hidden>
        {FLAVORS.map((f) => (
          <CatCake key={f.id} flavor={f.id} size={56} animated />
        ))}
        <CatCake flavor="strawberry" edition="collector" size={56} animated />
      </div>
      <p className="muted" style={{ marginTop: 0 }}>
        Design questions: can hand-built SVG carry the art style; which Collector's Edition treatment reads as
        rare at a glance; does a pull feel rewarding in under 3 seconds; how should the album show progress and
        dupes. Notes live in <code>docs/specs/REWARDS_DESIGN_NOTES.md</code>.
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
