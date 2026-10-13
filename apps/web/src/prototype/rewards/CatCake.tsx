/**
 * Parametric cat cake SVG. Layer order matters: the tail is painted first so
 * the head and cake cover its base and it reads as coming from behind.
 */
import { useId, type CSSProperties, type ReactNode } from "react";
import {
  FLAVOR_BY_ID,
  FLAVORS,
  paletteFor,
  variantName,
  type CakeBase,
  type CollectorStyle,
  type Edition,
  type FlavorId,
  type Palette,
} from "./flavors";

/** Wide, squat "dumpling" head: nearly as wide as the cake, cheeks at the bottom. */
const HEAD = "M60 20 C89 20 104 36 104 58 C104 73 90 84 60 84 C30 84 16 73 16 58 C16 36 31 20 60 20 Z";

const BASE_PATH: Record<CakeBase, string> = {
  sponge: "M15 68 C13 82 14 99 24 105 Q60 114 96 105 C106 99 107 82 105 68 Z",
  tart: "M13 68 H107 L98 103 Q97 109 90 109 H30 Q23 109 22 103 Z",
  dome: "M14 68 Q12 112 60 112 Q108 112 106 68 Z",
};

/** Rounded slab across the top with one U-shaped drip per entry in `depths`. */
function icingPath(x0: number, x1: number, yTop: number, depths: number[]): string {
  const base = yTop + 9;
  const w = (x1 - x0) / depths.length;
  let d = `M${x0} ${yTop + 6} Q${x0} ${yTop} ${x0 + 8} ${yTop} H${x1 - 8} Q${x1} ${yTop} ${x1} ${yTop + 6} V${base}`;
  depths.forEach((depth, i) => {
    const xr = x1 - i * w;
    const xl = xr - w;
    const xm = (xr + xl) / 2;
    const tip = base + depth;
    d += ` C${xr} ${base + depth * 0.25} ${xm + w * 0.35} ${tip} ${xm} ${tip}`;
    d += ` C${xm - w * 0.35} ${tip} ${xl} ${base + depth * 0.25} ${xl} ${base}`;
  });
  return `${d} Z`;
}

const ICING_PATH: Record<CakeBase, string> = {
  sponge: icingPath(12, 108, 61, [4, 11, 3, 13, 4, 9, 3, 12, 4]),
  tart: icingPath(10, 110, 61, [2, 4, 2, 3, 2, 4, 2, 3, 2, 4]),
  dome: icingPath(12, 108, 61, [3, 9, 3, 7, 3, 10, 3, 6]),
};

const EARS = {
  left: "M22 42 Q18 22 24 14 Q28 11 33 14 L48 24 Z",
  leftInner: "M25.5 37 Q23 24 26.5 18 Q29 16 32 18.5 L42 25 Z",
  right: "M98 42 Q102 22 96 14 Q92 11 87 14 L72 24 Z",
  rightInner: "M94.5 37 Q97 24 93.5 18 Q91 16 88 18.5 L78 25 Z",
};

/** Attachment at center back (drawn first, so the base sits under the body). */
const TAIL_ANCHOR = { x: 80, y: 79, rotate: 26 };
/** Lowercase “r”: stem up-right, hook to the side — rotated clockwise so only the upper arc reads. */
const TAIL_CURVE = "M80 79 C81 77 88 72 96 60 C98 50 110 47 116 53 C119 59 112 61 106 58";

function starPath(cx: number, cy: number, r: number, points = 5, inner = 0.45): string {
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = i * step - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)} `;
  }
  return `${d}Z`;
}

function CreamDollop({ y = 30, fill = "#ffffff", edge = "#ece2dc" }: { y?: number; fill?: string; edge?: string }) {
  return (
    <g fill={fill} stroke={edge} strokeWidth={0.8}>
      <circle cx={53} cy={y} r={6} />
      <circle cx={67} cy={y} r={6} />
      <circle cx={60} cy={y - 5} r={7} />
    </g>
  );
}

function Garnish({ flavor, p }: { flavor: FlavorId; p: Palette }) {
  switch (flavor) {
    case "strawberry":
      return (
        <g>
          <CreamDollop />
          <path
            d="M60 8 C66 8 69 13 67 19 C65 24 62 27 60 28 C58 27 55 24 53 19 C51 13 54 8 60 8 Z"
            fill={p.accent}
          />
          <g fill="#ffe9a8">
            <ellipse cx={57} cy={15} rx={0.7} ry={1} />
            <ellipse cx={63} cy={15} rx={0.7} ry={1} />
            <ellipse cx={60} cy={19} rx={0.7} ry={1} />
            <ellipse cx={56.5} cy={21} rx={0.7} ry={1} />
            <ellipse cx={63.5} cy={21} rx={0.7} ry={1} />
          </g>
          <path d="M53.5 10 L60 12.5 L66.5 10 L63 6.5 L60 8.5 L57 6.5 Z" fill={p.accent2} />
        </g>
      );
    case "matcha":
      return (
        <g>
          <CreamDollop fill={p.icing} edge={p.icingShade} />
          <path d="M60 24 C51 23 46 15 50 8 C57 9 62 16 60 24 Z" fill={p.accent} />
          <path d="M60 24 C64 17 70 13 76 15 C75 22 68 26 60 24 Z" fill={p.furShade} />
          <path d="M60 24 C57 18 54 13 51 10" stroke={p.icing} strokeWidth={0.9} fill="none" />
        </g>
      );
    case "blueberry":
      return (
        <g>
          <CreamDollop y={32} />
          {[
            [52, 25],
            [68, 25],
            [60, 20],
            [56, 29],
            [64, 29],
          ].map(([x, y]) => (
            <g key={`${x}-${y}`}>
              <circle cx={x} cy={y} r={5} fill={p.accent} />
              <circle cx={x! - 1.6} cy={y! - 1.6} r={1.4} fill="#ffffff" opacity={0.55} />
              <path d={starPath(x!, y! + 0.5, 1.4, 5, 0.5)} fill={p.icingShade} opacity={0.8} />
            </g>
          ))}
        </g>
      );
    case "sesame":
      return (
        <g>
          <CreamDollop fill={p.icing} edge={p.icingShade} />
          <g fill={p.accent}>
            <ellipse cx={55} cy={27} rx={0.6} ry={1.2} transform="rotate(30 55 27)" />
            <ellipse cx={61} cy={23} rx={0.6} ry={1.2} transform="rotate(-20 61 23)" />
            <ellipse cx={65} cy={29} rx={0.6} ry={1.2} transform="rotate(60 65 29)" />
            <ellipse cx={58} cy={31} rx={0.6} ry={1.2} transform="rotate(-50 58 31)" />
          </g>
        </g>
      );
    case "peach":
      return (
        <g>
          <CreamDollop y={32} />
          <circle cx={60} cy={19} r={9} fill={p.accent} />
          <circle cx={57} cy={16} r={4} fill="#ffffff" opacity={0.3} />
          <path d="M60 10.5 Q56 19 60 28" stroke={p.icingShade} strokeWidth={1} fill="none" opacity={0.6} />
          <path d="M61 11 C64 5.5 70 5.5 72.5 8 C69 11 65 12 61 11 Z" fill={p.accent2} />
        </g>
      );
    case "lemon":
      return (
        <g>
          <circle cx={67} cy={15} r={9} fill={p.accent} />
          <circle cx={67} cy={15} r={7.3} fill="#fff6b8" />
          {[0, 60, 120].map((deg) => (
            <line
              key={deg}
              x1={67}
              y1={8}
              x2={67}
              y2={22}
              stroke={p.accent}
              strokeWidth={1.1}
              transform={`rotate(${deg} 67 15)`}
            />
          ))}
          <path
            d="M47 31 Q47 23 53 23 Q54 17 57.5 14.5 Q58 20 62 21.5 Q69 22.5 69 31 Z"
            fill={p.accent2}
            stroke="#e9c48a"
            strokeWidth={1.2}
          />
        </g>
      );
  }
}

function CakeDetail({ base, flavor, p }: { base: CakeBase; flavor: FlavorId; p: Palette }) {
  const parts: ReactNode[] = [];
  if (p.stripe && base === "sponge") {
    parts.push(<rect key="stripe" x={10} y={93} width={100} height={4.5} fill={p.stripe} opacity={0.9} />);
  }
  if (flavor === "matcha") {
    parts.push(
      <path
        key="swirl"
        d="M60 97 a1.75 1.75 0 0 1 3.5 0 a3.5 3.5 0 0 1 -7 0 a5.25 5.25 0 0 1 10.5 0 a7 7 0 0 1 -14 0"        stroke={p.icing}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />,
    );
  }
  if (base === "tart") {
    for (let x = 22; x <= 98; x += 7) {
      parts.push(
        <line
          key={`flute-${x}`}
          x1={x}
          y1={76}
          x2={x + (60 - x) * 0.12}
          y2={108}
          stroke={p.cakeShade}
          strokeWidth={1.3}
          opacity={0.7}
        />,
      );
    }
  }
  if (base === "dome") {
    [
      [30, 92, 20],
      [44, 101, -30],
      [60, 95, 50],
      [76, 103, -10],
      [90, 91, 35],
      [52, 88, -60],
      [68, 88, 15],
      [84, 99, -45],
    ].forEach(([x, y, r]) =>
      parts.push(
        <ellipse
          key={`seed-${x}`}
          cx={x}
          cy={y}
          rx={0.8}
          ry={1.5}
          fill={p.icing}
          opacity={0.55}
          transform={`rotate(${r} ${x} ${y})`}
        />,
      ),
    );
  }
  return <>{parts}</>;
}

export type CatCakeProps = {
  flavor: FlavorId;
  edition?: Edition;
  collectorStyle?: CollectorStyle;
  size?: number;
  animated?: boolean;
  silhouette?: boolean;
  className?: string;
};

export default function CatCake({
  flavor,
  edition = "classic",
  collectorStyle = "mix",
  size = 96,
  animated = false,
  silhouette = false,
  className,
}: CatCakeProps) {
  const f = FLAVOR_BY_ID[flavor];
  const p = paletteFor(f, edition, collectorStyle);
  const ce = edition === "collector";
  const foil = ce && (collectorStyle === "foil" || collectorStyle === "mix");
  const night = ce && collectorStyle === "night";
  const dressed = ce && collectorStyle === "dressed";
  const crown = ce && (collectorStyle === "dressed" || collectorStyle === "mix");
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `cc-${uid}-${flavor}-${edition}-${collectorStyle}-${s}`;
  const basePath = BASE_PATH[f.base];
  const delay = FLAVORS.findIndex((x) => x.id === flavor) * 0.37;
  const animate = animated && ce && !silhouette;

  const classes = [
    "cc",
    animate ? "cc--animated" : "",
    silhouette ? "cc--silhouette" : "",
    className ?? "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <svg
      className={classes}
      viewBox="-4 -4 128 128"
      width={size}
      height={size}
      role="img"
      aria-label={silhouette ? "Undiscovered cat cake" : variantName(f, edition)}
      style={
        {
          "--cc-delay": `${delay}s`,
          "--cc-tail-base": `${TAIL_ANCHOR.rotate}deg`,
        } as CSSProperties
      }
    >
      <defs>
        <radialGradient id={id("fur")} cx="38%" cy="32%" r="75%">
          <stop offset="0%" stopColor={p.fur} />
          <stop offset="70%" stopColor={p.fur} />
          <stop offset="100%" stopColor={p.furShade} />
        </radialGradient>
        <linearGradient id={id("cake")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={p.cake} />
          <stop offset="100%" stopColor={p.cakeShade} />
        </linearGradient>
        <linearGradient id={id("gold")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff3b0" />
          <stop offset="35%" stopColor="#e6b422" />
          <stop offset="50%" stopColor="#fff7d1" />
          <stop offset="70%" stopColor="#c9971a" />
          <stop offset="100%" stopColor="#ffe48a" />
        </linearGradient>
        <linearGradient id={id("shine")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ffffff" stopOpacity={0} />
          <stop offset="50%" stopColor="#ffffff" stopOpacity={0.75} />
          <stop offset="100%" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
        <clipPath id={id("body")}>
          <path d={HEAD} />
          <path d={EARS.left} />
          <path d={EARS.right} />
          <path d={basePath} />
          <path d={ICING_PATH[f.base]} />
        </clipPath>
        <clipPath id={id("base")}>
          <path d={basePath} />
        </clipPath>
        {night && (
          <filter id={id("glow")} x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx={0} dy={0} stdDeviation={2.6} floodColor={p.accent} floodOpacity={0.85} />
          </filter>
        )}
      </defs>

      <ellipse cx={60} cy={113} rx={44} ry={5} fill="#3c283c" opacity={night ? 0.25 : 0.12} />

      <g filter={night ? `url(#${id("glow")})` : undefined}>
        <g className="cc-tail">
          <path
            d={TAIL_CURVE}
            fill="none"
            stroke={p.furShade}
            strokeWidth={13}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d={TAIL_CURVE}
            fill="none"
            stroke={p.fur}
            strokeWidth={9.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>

        <path d={EARS.left} fill={p.fur} stroke={p.furShade} strokeWidth={1} strokeLinejoin="round" />
        <path d={EARS.leftInner} fill={p.earInner} />
        <path d={EARS.right} fill={p.fur} stroke={p.furShade} strokeWidth={1} strokeLinejoin="round" />
        <path d={EARS.rightInner} fill={p.earInner} />
        <path d={HEAD} fill={`url(#${id("fur")})`} stroke={p.furShade} strokeWidth={0.6} />
        <ellipse cx={40} cy={31} rx={10} ry={4} fill="#ffffff" opacity={0.45} transform="rotate(-25 40 31)" />

        <path
          d={basePath}
          fill={`url(#${id("cake")})`}
          stroke={foil ? `url(#${id("gold")})` : p.cakeShade}
          strokeWidth={foil ? 2.6 : 0.8}
        />
        <g clipPath={`url(#${id("base")})`}>
          <CakeDetail base={f.base} flavor={flavor} p={p} />
        </g>
        {night &&
          [
            [28, 96],
            [42, 103],
            [72, 101],
            [90, 95],
            [56, 92],
            [82, 105],
          ].map(([x, y]) => <path key={`spr-${x}`} d={starPath(x!, y!, 2.2, 4, 0.35)} fill="#ffe9a0" />)}
        <path
          d={ICING_PATH[f.base]}
          fill={p.icing}
          stroke={foil ? `url(#${id("gold")})` : p.icingShade}
          strokeWidth={foil ? 1.3 : 0.8}
        />
        <ellipse cx={32} cy={64.5} rx={10} ry={1.6} fill="#ffffff" opacity={0.45} />

        <g fill={p.fur} stroke={p.furShade} strokeWidth={0.9}>
          <ellipse cx={48} cy={69} rx={7.5} ry={5.5} />
          <ellipse cx={72} cy={69} rx={7.5} ry={5.5} />
        </g>
        <g stroke={p.furShade} strokeWidth={0.8} strokeLinecap="round">
          <line x1={45.5} y1={71.8} x2={45.5} y2={73.6} />
          <line x1={50.5} y1={71.8} x2={50.5} y2={73.6} />
          <line x1={69.5} y1={71.8} x2={69.5} y2={73.6} />
          <line x1={74.5} y1={71.8} x2={74.5} y2={73.6} />
        </g>

        <g className="cc-eyes">
          {dressed ? (
            <>
              <path d={starPath(46, 47, 4.4)} fill="#ffcf4a" stroke={p.eye} strokeWidth={0.9} strokeLinejoin="round" />
              <path d={starPath(74, 47, 4.4)} fill="#ffcf4a" stroke={p.eye} strokeWidth={0.9} strokeLinejoin="round" />
            </>
          ) : (
            <>
              <ellipse cx={46} cy={47} rx={3.2} ry={3.7} fill={p.eye} />
              <ellipse cx={74} cy={47} rx={3.2} ry={3.7} fill={p.eye} />
              <circle cx={47.1} cy={45.7} r={1.1} fill="#ffffff" />
              <circle cx={75.1} cy={45.7} r={1.1} fill="#ffffff" />
            </>
          )}
        </g>
        <ellipse cx={36} cy={54} rx={5.5} ry={3} fill={p.blush} opacity={0.75} />
        <ellipse cx={84} cy={54} rx={5.5} ry={3} fill={p.blush} opacity={0.75} />
        <path d="M58.6 50.5 H61.4 L60 52.1 Z" fill={p.eye} opacity={0.8} />
        <path
          d="M56 53 Q58 55.5 60 53.3 Q62 55.5 64 53"
          stroke={p.eye}
          strokeWidth={1.3}
          strokeLinecap="round"
          fill="none"
        />

        <g transform="translate(0 -7)">
          <Garnish flavor={flavor} p={p} />
        </g>
        {dressed && (
          <g transform="translate(56 84) scale(0.5)">
            <Garnish flavor={flavor} p={p} />
          </g>
        )}

        {crown && (
          <g transform="translate(94 12) rotate(20)">
            <path
              d="M-10 5 L-10 -4 L-5 1 L0 -8 L5 1 L10 -4 L10 5 Z"
              fill={`url(#${id("gold")})`}
              stroke="#b8860b"
              strokeWidth={0.9}
              strokeLinejoin="round"
            />
            <circle cx={0} cy={1.5} r={1.7} fill={p.accent} />
            <circle cx={-6} cy={3} r={1} fill="#ffffff" />
            <circle cx={6} cy={3} r={1} fill="#ffffff" />
          </g>
        )}

        {foil && (
          <g clipPath={`url(#${id("body")})`}>
            <g className="cc-shine">
              <rect x={-34} y={-4} width={22} height={128} fill={`url(#${id("shine")})`} transform="skewX(-18)" />
            </g>
          </g>
        )}
      </g>

      {dressed && (
        <g>
          <circle cx={104} cy={104} r={8.5} fill={`url(#${id("gold")})`} stroke="#ffffff" strokeWidth={1.6} />
          <path d={starPath(104, 104.5, 4.6)} fill="#ffffff" />
        </g>
      )}
    </svg>
  );
}
