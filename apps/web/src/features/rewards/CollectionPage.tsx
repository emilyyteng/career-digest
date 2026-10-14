import { useCallback, useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import {
  getRewardsCollection,
  postRewardsLook,
  postRewardsRefund,
  type CatCakeEdition,
  type CatCakeLook,
  type CatCakeVariantView,
} from "../../api";
import { CURRENCY_DISPLAY } from "../../currencyDisplay";
import CatCakeCard from "./CatCakeCard";
import FriendshipDots from "./FriendshipDots";
import {
  FRIENDSHIP_MAX,
  friendshipLevel,
  refundableCount,
  refundValue,
} from "./catCakeMath";
import {
  FLAVOR_BY_ID,
  FLAVORS,
  variantDescription,
  variantName,
  type FlavorId,
} from "./flavors";
import type { RewardsOutletContext } from "./RewardsLayout";

const EDITIONS: CatCakeEdition[] = ["classic", "collector"];
const TOTAL_VARIANTS = FLAVORS.length * EDITIONS.length;

function variantMap(
  variants: CatCakeVariantView[],
): Map<string, CatCakeVariantView> {
  const m = new Map<string, CatCakeVariantView>();
  for (const v of variants) m.set(`${v.flavorId}:${v.edition}`, v);
  return m;
}

export default function CollectionPage() {
  const { refreshSeeds } = useOutletContext<RewardsOutletContext>();
  const [variants, setVariants] = useState<CatCakeVariantView[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{
    flavor: FlavorId;
    edition: CatCakeEdition;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const reload = useCallback(async () => {
    const col = await getRewardsCollection();
    setVariants(col.variants);
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        await reload();
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load collection");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reload]);

  const byKey = useMemo(() => variantMap(variants), [variants]);

  function count(flavor: FlavorId, edition: CatCakeEdition): number {
    return byKey.get(`${flavor}:${edition}`)?.copies ?? 0;
  }

  function lookFor(flavor: FlavorId): CatCakeLook {
    return byKey.get(`${flavor}:collector`)?.selectedLook ?? "day";
  }

  const ownedCount = variants.filter((v) => v.copies > 0).length;
  const sel = selected
    ? { ...selected, n: count(selected.flavor, selected.edition) }
    : null;
  const selView = sel
    ? byKey.get(`${sel.flavor}:${sel.edition}`)
    : null;
  const selRefundable = sel ? refundableCount(sel.n) : 0;
  const selNightUnlocked =
    sel?.edition === "collector" ? Boolean(selView?.nightUnlocked) : false;

  function flash(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(null), 1800);
  }

  async function refundOne() {
    if (!sel || selRefundable <= 0 || busy) return;
    setBusy(true);
    setError(null);
    try {
      const out = await postRewardsRefund({
        flavorId: sel.flavor,
        edition: sel.edition,
      });
      await reload();
      await refreshSeeds();
      flash(`+${out.credited} ${CURRENCY_DISPLAY.plural}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Refund failed");
    } finally {
      setBusy(false);
    }
  }

  async function setLook(look: CatCakeLook) {
    if (!sel || sel.edition !== "collector" || !selNightUnlocked || busy) return;
    setBusy(true);
    setError(null);
    try {
      await postRewardsLook({ flavorId: sel.flavor, look });
      await reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not change look");
    } finally {
      setBusy(false);
    }
  }

  if (loading && variants.length === 0) {
    return <p className="muted">Loading collection…</p>;
  }

  return (
    <div className="rw-page">
      <div>
        <h3>Cat Cake Collection</h3>
        <p className="muted" style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.85rem" }}>
          Up to {FRIENDSHIP_MAX} extra copies raise friendship. After max friendship,
          further dupes can be refunded for {CURRENCY_DISPLAY.plural}.
        </p>
        <div className="rw-toolbar">
          <span className="rw-stat">
            <strong>{ownedCount}</strong> / {TOTAL_VARIANTS} discovered
          </span>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="rw-section">
        <div className="rw-album">
          {EDITIONS.map((edition) => (
            <AlbumRow
              key={edition}
              edition={edition}
              count={count}
              lookFor={lookFor}
              selected={selected}
              onSelect={setSelected}
            />
          ))}
        </div>
      </div>

      {sel && (
        <div className="rw-section rw-detail">
          <CatCakeCard
            flavor={sel.flavor}
            edition={sel.edition}
            collectorStyle={
              sel.edition === "collector" ? lookFor(sel.flavor) : "day"
            }
            size={160}
            animated={sel.edition === "collector" && sel.n > 0}
            silhouette={sel.n === 0}
            showName={false}
          />
          <div>
            <h3>
              {sel.n
                ? variantName(FLAVOR_BY_ID[sel.flavor], sel.edition)
                : "Undiscovered"}
            </h3>
            <p className="muted" style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
              {sel.n
                ? variantDescription(FLAVOR_BY_ID[sel.flavor], sel.edition)
                : sel.edition === "collector"
                  ? "A rare Collector's Edition. Any banner pull can bake it; pity guarantees some Collector's Edition by pull 20."
                  : "Classics drop at random from any pull."}
            </p>
            {sel.n > 0 && (
              <>
                <FriendshipDots flavor={sel.flavor} count={sel.n} />
                <p style={{ margin: "0 0 0.5rem", fontSize: "0.85rem" }}>
                  Owned ×{sel.n}
                  {friendshipLevel(sel.n) < FRIENDSHIP_MAX && sel.n > 1 && (
                    <>
                      {" "}
                      · {FRIENDSHIP_MAX - friendshipLevel(sel.n)} friendship
                      slot(s) left
                    </>
                  )}
                  {selRefundable > 0 && (
                    <>
                      {" "}
                      · {selRefundable} refundable dupe
                      {selRefundable === 1 ? "" : "s"} (
                      {refundValue(sel.edition)} {CURRENCY_DISPLAY.plural} each)
                    </>
                  )}
                </p>
              </>
            )}
            {selNightUnlocked && (
              <div className="ui-segmented" role="radiogroup" aria-label="CE look">
                {(["day", "night"] as const).map((look) => (
                  <button
                    key={look}
                    type="button"
                    className={`secondary ui-btn ui-btn-ghost${
                      lookFor(sel.flavor) === look ? " is-active" : ""
                    }`}
                    aria-pressed={lookFor(sel.flavor) === look}
                    disabled={busy}
                    onClick={() => void setLook(look)}
                  >
                    {look === "day" ? "Day" : "Night"}
                  </button>
                ))}
              </div>
            )}
            {selRefundable > 0 && (
              <button
                type="button"
                className="secondary ui-btn"
                disabled={busy}
                onClick={() => void refundOne()}
                style={{ marginTop: "0.5rem" }}
              >
                Refund one dupe · +{refundValue(sel.edition)}
              </button>
            )}
          </div>
        </div>
      )}

      {toast && <div className="rw-toast">{toast}</div>}
    </div>
  );
}

function AlbumRow({
  edition,
  count,
  lookFor,
  selected,
  onSelect,
}: {
  edition: CatCakeEdition;
  count: (f: FlavorId, e: CatCakeEdition) => number;
  lookFor: (f: FlavorId) => CatCakeLook;
  selected: { flavor: FlavorId; edition: CatCakeEdition } | null;
  onSelect: (s: { flavor: FlavorId; edition: CatCakeEdition }) => void;
}) {
  return (
    <>
      <div className="rw-album-label">
        {edition === "classic" ? "Classics" : "Collector's Editions"}
      </div>
      {FLAVORS.map((f) => {
        const n = count(f.id, edition);
        const ref = refundableCount(n);
        return (
          <CatCakeCard
            key={f.id}
            flavor={f.id}
            edition={edition}
            collectorStyle={edition === "collector" ? lookFor(f.id) : "day"}
            size={92}
            animated={edition === "collector" && n > 0}
            silhouette={n === 0}
            count={ref > 0 ? ref : undefined}
            selected={
              selected?.flavor === f.id && selected.edition === edition
            }
            onClick={() => onSelect({ flavor: f.id, edition })}
          />
        );
      })}
    </>
  );
}
