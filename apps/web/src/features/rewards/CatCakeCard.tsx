import CatCake from "./CatCake";
import {
  FLAVOR_BY_ID,
  variantName,
  type CollectorStyle,
  type Edition,
  type FlavorId,
} from "./flavors";

export function MedalIcon({ size = 18 }: { size?: number }) {
  return (
    <svg viewBox="0 0 20 20" width={size} height={size} aria-label="Collector's Edition" role="img">
      <circle cx={10} cy={10} r={9} fill="#c9971a" />
      <circle cx={10} cy={10} r={7.2} fill="#ffd86b" />
      <path
        d="M10 4.8 L11.4 8 L14.9 8.2 L12.2 10.4 L13.1 13.8 L10 11.9 L6.9 13.8 L7.8 10.4 L5.1 8.2 L8.6 8 Z"
        fill="#fff7d1"
      />
    </svg>
  );
}

export default function CatCakeCard({
  flavor,
  edition,
  collectorStyle = "day",
  size = 96,
  animated = true,
  silhouette = false,
  showName = true,
  count,
  selected = false,
  onClick,
}: {
  flavor: FlavorId;
  edition: Edition;
  collectorStyle?: CollectorStyle;
  size?: number;
  animated?: boolean;
  silhouette?: boolean;
  showName?: boolean;
  /** Shown as ×N badge when &gt; 1 (typically refundable dupes only). */
  count?: number;
  selected?: boolean;
  onClick?: () => void;
}) {
  const f = FLAVOR_BY_ID[flavor];
  const classes = [
    "cc-card",
    `cc-card--${edition}`,
    edition === "collector" ? `cc-card--${collectorStyle}` : "",
    silhouette ? "cc-card--locked" : "",
    selected ? "cc-card--selected" : "",
    onClick ? "cc-card--clickable" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const body = (
    <>
      {edition === "collector" && !silhouette && (
        <span className="cc-card-tag" title="Collector's Edition">
          <MedalIcon />
        </span>
      )}
      {count != null && count > 1 && <span className="cc-card-count">×{count}</span>}
      <CatCake
        flavor={flavor}
        edition={edition}
        collectorStyle={collectorStyle}
        size={size}
        animated={animated}
        silhouette={silhouette}
      />
      {showName && (
        <span className="cc-card-name" style={{ maxWidth: Math.max(size, 84) }}>
          {silhouette ? "???" : variantName(f, edition)}
        </span>
      )}
    </>
  );

  return onClick ? (
    <div
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      className={classes}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {body}
    </div>
  ) : (
    <div className={classes}>{body}</div>
  );
}
