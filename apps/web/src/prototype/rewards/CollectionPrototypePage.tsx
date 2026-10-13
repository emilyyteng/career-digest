/**
 * Collection album: friendship (5 dupes before refundable extras), refunds.
 */
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PrototypeSwitcher from "../PrototypeSwitcher";
import CatCake from "./CatCake";
import CatCakeCard from "./CatCakeCard";
import FriendshipDots from "./FriendshipDots";
import {
  COLLECTOR_STYLES,
  FLAVORS,
  FLAVOR_BY_ID,
  variantName,
  type CollectorStyle,
  type Edition,
  type FlavorId,
} from "./flavors";
import {
  dupeSummary,
  FRIENDSHIP_MAX,
  friendshipLevel,
  refundAllDupes,
  refundOne,
  refundValue,
  refundableCount,
  variantKey,
  type GachaState,
} from "./gacha";
import { midCollectionState } from "./fixtures";
import "../m4/prototype-m4.css";
import "./prototype-rewards.css";

const VARIANTS = [
  { key: "A", name: "Album grid" },
  { key: "B", name: "Bakery shelf" },
];

const EDITIONS: Edition[] = ["classic", "collector"];

export default function CollectionPrototypePage() {
  const [params] = useSearchParams();
  const variant = params.get("variant") === "B" ? "B" : "A";
  const [state, setState] = useState<GachaState>(midCollectionState);
  const [ceStyle, setCeStyle] = useState<CollectorStyle>("mix");
  const [selected, setSelected] = useState<{ flavor: FlavorId; edition: Edition } | null>({
    flavor: "sesame",
    edition: "classic",
  });
  const [toast, setToast] = useState<string | null>(null);

  const ownedCount = FLAVORS.reduce(
    (n, f) => n + EDITIONS.filter((e) => (state.owned[variantKey(f.id, e)] ?? 0) > 0).length,
    0,
  );
  const dupes = dupeSummary(state.owned);

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  function count(flavor: FlavorId, edition: Edition) {
    return state.owned[variantKey(flavor, edition)] ?? 0;
  }

  const sel = selected ? { ...selected, n: count(selected.flavor, selected.edition) } : null;
  const selRefundable = sel ? refundableCount(sel.n) : 0;

  return (
    <section className="rw-page">
      <p className="prototype-banner">
        Rewards throwaway prototype · friendship + refundable dupes. ← / → flips layout.{" "}
        <Link to="/prototype/rewards">Rewards hub</Link>
      </p>
      <div>
        <h2>Cat Cake Collection</h2>
        <p className="muted" style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.85rem" }}>
          Up to {FRIENDSHIP_MAX} extra copies raise friendship (one dot each). After max friendship, further dupes can
          be refunded for points.
        </p>
        <div className="rw-progress-bar" style={{ maxWidth: "22rem" }}>
          <span style={{ width: `${(ownedCount / 12) * 100}%` }} />
        </div>
        <div className="rw-toolbar">
          <span className="rw-stat">
            <strong>{ownedCount}</strong> / 12 discovered
          </span>
          <span className="rw-balance">{state.balance} pts</span>
          <button
            type="button"
            className="secondary"
            disabled={dupes.extras === 0}
            onClick={() => {
              setState(refundAllDupes(state));
              flash(`Refunded ${dupes.extras} dupes for +${dupes.value} pts`);
            }}
          >
            Refund all refundable ({dupes.extras}) · +{dupes.value}
          </button>
          <label>
            CE look{" "}
            <select value={ceStyle} onChange={(e) => setCeStyle(e.target.value as CollectorStyle)}>
              {COLLECTOR_STYLES.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </div>

      {variant === "A" ? (
        <div className="rw-section">
          <div className="rw-album">
            {EDITIONS.map((edition) => (
              <AlbumRow
                key={edition}
                edition={edition}
                ceStyle={ceStyle}
                count={count}
                selected={selected}
                onSelect={setSelected}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rw-shelf">
          {EDITIONS.map((edition) => (
            <div key={edition} className={`rw-shelf-row ${edition === "collector" ? "rw-shelf-row--ce" : ""}`}>
              {FLAVORS.map((f) => {
                const n = count(f.id, edition);
                const ref = refundableCount(n);
                return (
                  <div
                    key={f.id}
                    role="button"
                    tabIndex={0}
                    className="rw-shelf-item"
                    onClick={() => setSelected({ flavor: f.id, edition })}
                    onKeyDown={(e) => e.key === "Enter" && setSelected({ flavor: f.id, edition })}
                    title={n ? variantName(f, edition) : "Undiscovered"}
                  >
                    {ref > 0 && <span className="cc-card-count">×{ref}</span>}
                    <CatCake
                      flavor={f.id}
                      edition={edition}
                      collectorStyle={ceStyle}
                      size={edition === "collector" ? 96 : 86}
                      animated={edition === "collector" && n > 0}
                      silhouette={n === 0}
                    />
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {sel && (
        <div className="rw-section rw-detail">
          <CatCakeCard
            flavor={sel.flavor}
            edition={sel.edition}
            collectorStyle={ceStyle}
            size={160}
            animated={sel.edition === "collector" && sel.n > 0}
            silhouette={sel.n === 0}
            showName={false}
          />
          <div>
            <h3>{sel.n ? variantName(FLAVOR_BY_ID[sel.flavor], sel.edition) : "Undiscovered"}</h3>
            <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
              {sel.n
                ? FLAVOR_BY_ID[sel.flavor].blurb
                : sel.edition === "collector"
                  ? "A rare Collector's Edition. Any banner pull can bake it; pity guarantees some Collector's Edition by pull 20."
                  : "Classics drop at random from any pull."}
            </p>
            {sel.n > 0 && (
              <>
                <FriendshipDots flavor={sel.flavor} edition={sel.edition} count={sel.n} collectorStyle={ceStyle} />
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
                  Owned ×{sel.n}
                  {friendshipLevel(sel.n) < FRIENDSHIP_MAX && sel.n > 1 && (
                    <> · {FRIENDSHIP_MAX - friendshipLevel(sel.n)} friendship slot(s) left</>
                  )}
                  {selRefundable > 0 && (
                    <>
                      {" "}
                      · {selRefundable} refundable dupe{selRefundable === 1 ? "" : "s"} (
                      {refundValue(sel.edition)} pts each)
                    </>
                  )}
                </p>
              </>
            )}
            {selRefundable > 0 && (
              <button
                type="button"
                className="secondary"
                onClick={() => {
                  setState(refundOne(state, variantKey(sel.flavor, sel.edition)));
                  flash(`+${refundValue(sel.edition)} pts`);
                }}
              >
                Refund one dupe · +{refundValue(sel.edition)}
              </button>
            )}
          </div>
        </div>
      )}

      {toast && <div className="rw-toast">{toast}</div>}
      <PrototypeSwitcher variants={VARIANTS} surfaceLabel="Collection" />
    </section>
  );
}

function AlbumRow({
  edition,
  ceStyle,
  count,
  selected,
  onSelect,
}: {
  edition: Edition;
  ceStyle: CollectorStyle;
  count: (f: FlavorId, e: Edition) => number;
  selected: { flavor: FlavorId; edition: Edition } | null;
  onSelect: (s: { flavor: FlavorId; edition: Edition }) => void;
}) {
  return (
    <>
      <div className="rw-album-label">{edition === "classic" ? "Classics" : "Collector's Editions"}</div>
      {FLAVORS.map((f) => {
        const n = count(f.id, edition);
        const ref = refundableCount(n);
        return (
          <CatCakeCard
            key={f.id}
            flavor={f.id}
            edition={edition}
            collectorStyle={ceStyle}
            size={92}
            animated={edition === "collector" && n > 0}
            silhouette={n === 0}
            count={ref > 0 ? ref : undefined}
            selected={selected?.flavor === f.id && selected.edition === edition}
            onClick={() => onSelect({ flavor: f.id, edition })}
          />
        );
      })}
    </>
  );
}
