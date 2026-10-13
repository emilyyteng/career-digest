/**
 * Feasibility lab: every variant at hero / card / thumbnail size, with the
 * Collector's Edition treatment selected by the prototype switcher.
 */
import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import CatCake from "./CatCake";
import CatCakeCard from "./CatCakeCard";
import { FLAVORS, FLAVOR_BY_ID, type CollectorStyle, type Edition, type FlavorId } from "./flavors";
import { seededRng } from "./gacha";
import "../m4/prototype-m4.css";
import "./prototype-rewards.css";

const VARIANTS = [
  { key: "A", name: "CE: Foil", style: "foil" },
  { key: "B", name: "CE: Night Bakery", style: "night" },
  { key: "C", name: "CE: Dressed Up", style: "dressed" },
  { key: "D", name: "CE: Mix (recommended)", style: "mix" },
] as const satisfies ReadonlyArray<{ key: string; name: string; style: CollectorStyle }>;

const STYLE_NOTES: Record<CollectorStyle, string> = {
  foil: "Same palette as classic. Gold rim on cake + icing, sweeping shine, gold card border. Elegant but subtle at 48px.",
  night: "Inverted jewel-tone palette, star sprinkles, colored glow, starry dark card. Unmistakable at any size; reads as a different cat.",
  dressed:
    "Classic palette plus crown, star eyes, a second mini garnish on the cake and a gold star badge. Most character, but busy.",
  mix: "Richer 'deluxe' palette, crown, gold rim + shine, glowing gold card. Aims for 'same cat, fancier' and still separable at 48px.",
};

type Tile = { flavor: FlavorId; edition: Edition };

const allTiles: Tile[] = FLAVORS.flatMap((f) => [
  { flavor: f.id, edition: "classic" as const },
  { flavor: f.id, edition: "collector" as const },
]);

export default function CatCakeLabPage() {
  const [params] = useSearchParams();
  const variant = VARIANTS.find((v) => v.key === params.get("variant")) ?? VARIANTS[0];
  const style = variant.style;
  const [hero, setHero] = useState<FlavorId>("strawberry");
  const [animated, setAnimated] = useState(true);
  const [blindSeed, setBlindSeed] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const blindTiles = useMemo(() => {
    if (blindSeed == null) return null;
    const rng = seededRng(blindSeed);
    const copy = [...allTiles];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [copy[i], copy[j]] = [copy[j]!, copy[i]!];
    }
    return copy;
  }, [blindSeed]);

  return (
    <section className="rw-page">
      <p className="prototype-banner">
        Rewards throwaway prototype · SVG feasibility lab. ← / → flips Collector's Edition treatment.{" "}
        <Link to="/prototype/rewards">Rewards hub</Link>
      </p>
      <div>
        <h2>Cat Cake Lab</h2>
        <p className="muted" style={{ margin: "0.25rem 0 0" }}>
          Pure inline SVG, no image assets or libraries. {STYLE_NOTES[style]}
        </p>
      </div>

      <div className="rw-toolbar">
        <label>
          <input type="checkbox" checked={animated} onChange={(e) => setAnimated(e.target.checked)} /> Idle
          animation (blink, tail wag, shine). Collector's Editions only; classics stay still.
        </label>
      </div>

      <div className="rw-section">
        <h3>Hero · 200px (pull reveal, detail view)</h3>
        <p className="muted">Classic on the left, Collector's Edition on the right.</p>
        <div className="rw-chip-row" style={{ marginBottom: "0.85rem" }}>
          {FLAVORS.map((f) => (
            <button
              key={f.id}
              type="button"
              className="secondary rw-chip"
              aria-pressed={hero === f.id}
              onClick={() => setHero(f.id)}
            >
              {f.name}
            </button>
          ))}
        </div>
        <div className="rw-hero-pair">
          <CatCakeCard flavor={hero} edition="classic" size={200} animated={animated} />
          <CatCakeCard flavor={hero} edition="collector" collectorStyle={style} size={200} animated={animated} />
          <p className="muted" style={{ maxWidth: "16rem", fontSize: "0.85rem" }}>
            {FLAVOR_BY_ID[hero].blurb}
          </p>
        </div>
      </div>

      <div className="rw-section">
        <h3>Card · 96px (collection grid)</h3>
        <p className="muted">Classic row, then Collector's Edition row.</p>
        <div className="rw-row">
          {FLAVORS.map((f) => (
            <CatCakeCard key={f.id} flavor={f.id} edition="classic" size={96} animated={animated} />
          ))}
        </div>
        <div className="rw-row" style={{ marginTop: "0.75rem" }}>
          {FLAVORS.map((f) => (
            <CatCakeCard
              key={f.id}
              flavor={f.id}
              edition="collector"
              collectorStyle={style}
              size={96}
              animated={animated}
            />
          ))}
        </div>
      </div>

      <div className="rw-section">
        <h3>Thumbnail · 48px and 32px (Home badge, earn flash cameo, pull history)</h3>
        <p className="muted">Success condition: every variant readable and CE distinguishable at 48px.</p>
        <div className="rw-thumb-strip">
          {allTiles.map((t) => (
            <span
              key={`${t.flavor}-${t.edition}`}
              className={`rw-thumb ${t.edition === "collector" ? `rw-thumb--ce-${style}` : ""}`}
            >
              <span className="rw-thumb-inner" style={{ display: "block" }}>
                <CatCake flavor={t.flavor} edition={t.edition} collectorStyle={style} size={48} />
              </span>
            </span>
          ))}
        </div>
        <div className="rw-thumb-strip" style={{ marginTop: "0.5rem" }}>
          {allTiles.map((t) => (
            <CatCake
              key={`${t.flavor}-${t.edition}-32`}
              flavor={t.flavor}
              edition={t.edition}
              collectorStyle={style}
              size={32}
            />
          ))}
        </div>
        <p className="muted" style={{ fontSize: "0.8rem", margin: "0.6rem 0 0.3rem" }}>
          Undiscovered (silhouette) state:
        </p>
        <div className="rw-thumb-strip">
          {FLAVORS.map((f) => (
            <CatCake key={f.id} flavor={f.id} size={48} silhouette />
          ))}
        </div>
      </div>

      <div className="rw-section">
        <h3>Blind check (no frames, no labels)</h3>
        <p className="muted">
          Shuffle the 12 bare 48px SVGs and try to spot the six Collector's Editions without the card frame
          helping. If you can't, the treatment relies too much on the frame.
        </p>
        <div className="rw-toolbar" style={{ marginBottom: "0.6rem" }}>
          <button
            type="button"
            className="secondary"
            onClick={() => {
              setBlindSeed(Date.now());
              setRevealed(false);
            }}
          >
            Shuffle
          </button>
          {blindTiles && (
            <button type="button" className="secondary" onClick={() => setRevealed((r) => !r)}>
              {revealed ? "Hide answers" : "Reveal answers"}
            </button>
          )}
        </div>
        {blindTiles && (
          <div className="rw-thumb-strip">
            {blindTiles.map((t) => (
              <span key={`${t.flavor}-${t.edition}`}>
                <CatCake flavor={t.flavor} edition={t.edition} collectorStyle={style} size={48} />
                <div className="rw-blind-answer">{revealed ? (t.edition === "collector" ? "CE" : "–") : " "}</div>
              </span>
            ))}
          </div>
        )}
      </div>

      <PrototypeSwitcher variants={[...VARIANTS]} surfaceLabel="Cat Cake Lab" />
    </section>
  );
}
