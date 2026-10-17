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
import { Blossom, CHARM_NO_STRONG_GLOW, CHARM_SPOT, Charm, Raspberry, StarTiara, kissPath, starPath } from "./parts";

/** Wide, squat "dumpling" head: nearly as wide as the cake, cheeks at the bottom. */
const HEAD = "M60 20 C89 20 104 36 104 58 C104 73 90 84 60 84 C30 84 16 73 16 58 C16 36 31 20 60 20 Z";

const BASE_PATH: Record<CakeBase, string> = {
  sponge: "M15 68 C13 82 14 99 24 105 Q60 114 96 105 C106 99 107 82 105 68 Z",
  tart: "M13 68 H107 L98 103 Q97 109 90 109 H30 Q23 109 22 103 Z",
  dome: "M14 68 Q12 112 60 112 Q108 112 106 68 Z",
  flan: "M18 68 H102 L108 103 Q109 110 101 110 H19 Q11 110 12 103 Z",
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
  flan: icingPath(14, 106, 61, [5, 13, 4, 15, 5, 11, 4, 10]),
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

function CreamDollop({ y = 30, fill = "#ffffff", edge = "#ece2dc" }: { y?: number; fill?: string; edge?: string }) {
  return (
    <g fill={fill} stroke={edge} strokeWidth={0.8}>
      <circle cx={50} cy={y} r={6} />
      <circle cx={70} cy={y} r={6} />
      <circle cx={60} cy={y - 1.4} r={7} />
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
            d="M60 12.5 C69 12.5 73.5 16.5 72 22.5 C70.5 28 65 32 60 32.5 C55 32 49.5 28 48 22.5 C46.5 16.5 51 12.5 60 12.5 Z"
            fill={p.accent}
          />
          <g fill="#ffe9a8">
            <ellipse cx={55} cy={18.5} rx={0.75} ry={1.05} />
            <ellipse cx={60} cy={18} rx={0.75} ry={1.05} />
            <ellipse cx={65} cy={18.5} rx={0.75} ry={1.05} />
            <ellipse cx={52.5} cy={23} rx={0.75} ry={1.05} />
            <ellipse cx={57.5} cy={23.5} rx={0.75} ry={1.05} />
            <ellipse cx={62.5} cy={23.5} rx={0.75} ry={1.05} />
            <ellipse cx={67.5} cy={23} rx={0.75} ry={1.05} />
            <ellipse cx={60} cy={28} rx={0.75} ry={1.05} />
          </g>
          <path d="M60 11 Q60.4 7.7 62.2 5.7" stroke={p.accent2} strokeWidth={1.3} strokeLinecap="round" fill="none" />
          <path d="M52 12.5 L60 15 L68 12.5 L64.5 8.5 L60 11 L55.5 8.5 Z" fill={p.accent2} />
        </g>
      );
    case "matcha":
      return (
        <g>
          <CreamDollop fill={p.icing} edge={p.icingShade} />
          <path d="M60 26 C51 25 46 17 50 10 C57 11 62 18 60 26 Z" fill={p.accent} />
          <path d="M60 26 C64 19 70 15 76 17 C75 24 68 28 60 26 Z" fill={p.furShade} />
          <path d="M60 26 C57 20 54 15 51 12" stroke={p.icing} strokeWidth={0.9} fill="none" />
        </g>
      );
    case "blueberry":
      return (
        <g>
          <CreamDollop y={32} />
          {[
            [51.5, 27.5],
            [68.5, 27.5],
            [60, 22.5],
            [55.5, 31.5],
            [64.5, 31.5],
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
            <ellipse cx={55} cy={28.5} rx={0.6} ry={1.2} transform="rotate(30 55 28.5)" />
            <ellipse cx={61} cy={25} rx={0.6} ry={1.2} transform="rotate(-20 61 25)" />
            <ellipse cx={65} cy={30.5} rx={0.6} ry={1.2} transform="rotate(60 65 30.5)" />
            <ellipse cx={58} cy={32} rx={0.6} ry={1.2} transform="rotate(-50 58 32)" />
          </g>
        </g>
      );
    case "peach":
      return (
        <g>
          <CreamDollop y={32} />
          <circle cx={60} cy={21.5} r={9} fill={p.accent} />
          <circle cx={57} cy={18.5} r={4} fill="#ffffff" opacity={0.3} />
          <path d="M60 13 Q56 21.5 60 30.5" stroke={p.icingShade} strokeWidth={1} fill="none" opacity={0.6} />
          <path d="M61 13.5 C64 8 70 8 72.5 10.5 C69 13.5 65 14.5 61 13.5 Z" fill={p.accent2} />
        </g>
      );
    case "lemon":
      return (
        <g>
          <path
            d="M47 31 Q47 23 53 23 Q54 17 57.5 14.5 Q58 20 62 21.5 Q69 22.5 69 31 Z"
            fill={p.accent2}
            stroke="#e9c48a"
            strokeWidth={1.2}
          />
          <circle cx={67} cy={22} r={9} fill={p.accent} />
          <circle cx={67} cy={22} r={7.3} fill="#fff6b8" />
          {[0, 60, 120].map((deg) => (
            <line
              key={deg}
              x1={67}
              y1={15}
              x2={67}
              y2={29}
              stroke={p.accent}
              strokeWidth={1.1}
              transform={`rotate(${deg} 67 22)`}
            />
          ))}
        </g>
      );
    case "cherry":
      return (
        <g>
          <CreamDollop y={32} fill={p.icing} edge={p.icingShade} />
          <path d="M66 24 C70 18 76 18 78 20 C75 24 70 26 66 24 Z" fill={p.accent2} />
          <Blossom cx={56} cy={21} r={8} fill={p.accent} center="#ffe08a" />
          <Blossom cx={67.5} cy={27} r={5} fill="#ffffff" center="#ffe08a" />
        </g>
      );
    case "redbean":
      return (
        <g>
          <CreamDollop y={32} fill="#fffaf3" edge="#ecdccb" />
          <path d="M66 24.5 C70 17.5 76 17.5 78 19.5 C75 24.5 70 26.5 66 24.5 Z" fill={p.accent2} />
          {[
            [54, 27.5, -20],
            [61, 23.5, 10],
            [66.5, 28.5, 40],
            [58.5, 31, -5],
          ].map(([x, y, r]) => (
            <g key={`${x}-${y}`} transform={`rotate(${r} ${x} ${y})`}>
              <ellipse cx={x} cy={y} rx={3.4} ry={2.5} fill={p.accent} />
              <ellipse cx={x! - 1} cy={y! - 0.9} rx={1.1} ry={0.6} fill="#ffffff" opacity={0.5} />
            </g>
          ))}
        </g>
      );
    case "chocobanana":
      return (
        <g>
          <CreamDollop y={32} fill={p.icing} edge={p.icingShade} />
          <circle cx={60} cy={21} r={11} fill={p.accent2} stroke={p.accent} strokeWidth={2.4} />
          <g fill={p.icingShade} opacity={0.75}>
            {[0, 120, 240].map((deg) => (
              <circle key={deg} cx={60} cy={17.4} r={1.15} transform={`rotate(${deg} 60 21)`} />
            ))}
          </g>
          <ellipse cx={55.4} cy={16.6} rx={2.8} ry={1.5} fill="#ffffff" opacity={0.45} transform="rotate(-35 55.4 16.6)" />
        </g>
      );
    case "raspberry":
      return (
        <g>
          <CreamDollop y={32} />
          <path d="M60 21.5 C63 14.5 70 13.5 73 15.5 C70 20.5 65 22.5 60 21.5 Z" fill={p.accent2} />
          <Raspberry cx={54.5} cy={25.5} p={p} />
          <Raspberry cx={65.5} cy={27} p={p} />
        </g>
      );
    case "caramel":
      return (
        <g>
          <CreamDollop y={32} />
          <path
            d="M52.2 28 C51.2 28 51.1 27.2 51.5 26.4 L54.1 15.2 C54.4 14.2 55.1 13.7 56.2 13.7 H63.8 C64.9 13.7 65.6 14.2 65.9 15.2 L68.5 26.4 C68.9 27.2 68.8 28 67.8 28 Z"
            fill={p.cake}
            stroke={p.cakeShade}
            strokeWidth={0.8}
            strokeLinejoin="round"
          />
          <path
            d="M54.2 17.5 Q60 14 65.8 17.5 L66.2 20.8 Q64.9 23.6 63.4 21.2 Q61.5 25 60 21.4 Q58.5 24.4 56.8 21 Q55.2 23.8 54 20.8 Z"
            fill={p.icing}
          />
          <ellipse cx={58.2} cy={16.4} rx={2.6} ry={0.8} fill="#ffffff" opacity={0.4} />
        </g>
      );
    case "ube":
      return (
        <g>
          {[
            [48.5, 32, 5.2],
            [71.5, 32, 5.2],
            [60, 31.5, 8.4],
          ].map(([x, y, r]) => (
            <g key={x}>
              <path d={kissPath(x!, y!, r!)} fill={p.icing} stroke={p.icingShade} strokeWidth={0.9} />
              <path
                d={`M${x! - r! * 0.5} ${y! - 0.4} Q${x! - r! * 0.25} ${y! - r! * 1.1} ${x!} ${y! - r! * 1.8} M${x! + r! * 0.5} ${y! - 0.4} Q${x! + r! * 0.25} ${y! - r! * 1.1} ${x!} ${y! - r! * 1.8}`}
                stroke={p.icingShade}
                strokeWidth={0.7}
                fill="none"
                opacity={0.7}
              />
            </g>
          ))}
          <circle cx={60} cy={15.2} r={1.7} fill={p.accent2} stroke={p.icingShade} strokeWidth={0.5} />
          <circle cx={54} cy={29} r={1} fill={p.accent2} />
          <circle cx={66} cy={29} r={1} fill={p.accent2} />
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
        d="M60 97 a1.75 1.75 0 0 1 3.5 0 a3.5 3.5 0 0 1 -7 0 a5.25 5.25 0 0 1 10.5 0 a7 7 0 0 1 -14 0"
        stroke={p.icing}
        strokeWidth={2.4}
        strokeLinecap="round"
        fill="none"
      />,
    );
  }
  if (flavor === "cherry") {
    parts.push(
      <Blossom key="b1" cx={30} cy={94} r={5} fill={p.icing} center="#ffe08a" />,
      <Blossom key="b2" cx={42} cy={97} r={3.6} fill="#ffffff" center="#ffe08a" />,
    );
  }
  if (base === "flan") {
    parts.push(
      <path key="pool" d="M8 104 Q60 99 112 104 V114 H8 Z" fill={p.icing} opacity={0.55} />,
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
    const beans = flavor === "redbean";
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
          rx={beans ? 1.8 : 0.8}
          ry={beans ? 2.4 : 1.5}
          fill={beans ? (p.stripe ?? p.accent) : p.icing}
          opacity={beans ? 0.8 : 0.55}
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
  /** Seconds before CSS animations start. Omit for flavor-based album stagger. */
  animationDelay?: number;
  className?: string;
};

const NIGHT_SPARKLES_ON_CAKE = [
  [28, 96],
  [42, 103],
  [72, 101],
  [90, 95],
  [56, 92],
  [82, 105],
];
/** Dome cakes already carry seeds or beans, so their sparkles float around the cat instead. */
const NIGHT_SPARKLES_AROUND = [
  [3, 40],
  [7, 100],
  [115, 90],
  [24, 6],
];

export default function CatCake({
  flavor,
  edition = "classic",
  collectorStyle = "day",
  size = 96,
  animated = false,
  silhouette = false,
  animationDelay,
  className,
}: CatCakeProps) {
  const f = FLAVOR_BY_ID[flavor];
  const p = paletteFor(f, edition, collectorStyle);
  const ce = edition === "collector";
  const day = ce && collectorStyle === "day";
  const night = ce && collectorStyle === "night";
  const charm = ce ? CHARM_SPOT[flavor] : undefined;
  const sparkles = !night
    ? []
    : f.base === "dome"
      ? NIGHT_SPARKLES_AROUND
      : NIGHT_SPARKLES_ON_CAKE.filter(([x, y]) => !charm || Math.hypot(x! - charm.x, y! - charm.y) > 12 * charm.scale);
  const uid = useId().replace(/:/g, "");
  const id = (s: string) => `cc-${uid}-${flavor}-${edition}-${collectorStyle}-${s}`;
  const gold = `url(#${id("gold")})`;
  const basePath = BASE_PATH[f.base];
  const delay =
    animationDelay ?? FLAVORS.findIndex((x) => x.id === flavor) * 0.37;
  const animate = animated && ce && !silhouette;

  const classes = [
    "cc",
    animate ? "cc--animated" : "",
    // Keep shine mounted across Day/Night so its CSS animation is not
    // restarted (and frozen for --cc-delay) on every look toggle.
    ce && !silhouette ? (night ? "cc--night" : "cc--day") : "",
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
          {f.base === "flan" && <stop offset="45%" stopColor={p.cake} />}
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
          <>
            <filter id={id("glow")} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow
                dx={0}
                dy={0}
                stdDeviation={flavor === "blueberry" ? 1.4 : 2.6}
                floodColor={p.glow ?? p.accent}
                floodOpacity={flavor === "blueberry" ? 0.45 : 0.85}
              />
            </filter>
            <filter id={id("glowStrong")} x="-40%" y="-40%" width="180%" height="180%">
              <feDropShadow dx={0} dy={0} stdDeviation={1.6} floodColor={p.glow ?? p.accent} floodOpacity={1} />
            </filter>
          </>
        )}
      </defs>

      <ellipse cx={60} cy={113} rx={44} ry={5} fill="#3c283c" opacity={night ? 0.25 : 0.12} />

      <g filter={night && flavor !== "blueberry" ? `url(#${id("glow")})` : undefined}>
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

        <path d={basePath} fill={`url(#${id("cake")})`} stroke={day ? gold : p.cakeShade} strokeWidth={day ? 2.6 : 0.8} />
        <g clipPath={`url(#${id("base")})`}>
          <CakeDetail base={f.base} flavor={flavor} p={p} />
        </g>
        {sparkles.map(([x, y]) => (
          <path key={`spr-${x}-${y}`} d={starPath(x!, y!, 2.2, 4, 0.35)} fill="#ffe9a0" />
        ))}
        <path d={ICING_PATH[f.base]} fill={p.icing} stroke={day ? gold : p.icingShade} strokeWidth={day ? 1.3 : 0.8} />
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
          {p.eyeRim && (
            <g fill={p.eyeRim} opacity={0.9}>
              <ellipse cx={46} cy={47} rx={4.2} ry={4.7} />
              <ellipse cx={74} cy={47} rx={4.2} ry={4.7} />
            </g>
          )}
          <ellipse cx={46} cy={47} rx={3.2} ry={3.7} fill={p.eye} />
          <ellipse cx={74} cy={47} rx={3.2} ry={3.7} fill={p.eye} />
          <circle cx={47.1} cy={45.7} r={1.1} fill="#ffffff" />
          <circle cx={75.1} cy={45.7} r={1.1} fill="#ffffff" />
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

        {/* Blueberry berries and strawberry bow skip night glow so they stay clean. */}
        {flavor !== "blueberry" && (
          <g filter={night ? `url(#${id("glowStrong")})` : undefined}>
            <g transform="translate(0 -7)">
              <Garnish flavor={flavor} p={p} />
            </g>
          </g>
        )}
        {charm && !CHARM_NO_STRONG_GLOW.has(flavor) && (
          <g
            filter={night ? `url(#${id("glowStrong")})` : undefined}
            transform={`translate(${charm.x} ${charm.y}) scale(${charm.scale})`}
          >
            <Charm flavor={flavor} look={collectorStyle} p={p} gold={gold} />
          </g>
        )}
        {night && (
          <g filter={`url(#${id("glowStrong")})`} transform="translate(94 12) rotate(20)">
            <StarTiara />
          </g>
        )}

        {day && (
          <g transform="translate(94 12) rotate(20)">
            <path
              d="M-10 5 L-10 -4 L-5 1 L0 -8 L5 1 L10 -4 L10 5 Z"
              fill={gold}
              stroke="#b8860b"
              strokeWidth={0.9}
              strokeLinejoin="round"
            />
            <circle cx={0} cy={1.5} r={1.7} fill={p.accent} />
            <circle cx={-6} cy={3} r={1} fill="#ffffff" />
            <circle cx={6} cy={3} r={1} fill="#ffffff" />
          </g>
        )}

        {ce && !silhouette && (
          <g clipPath={`url(#${id("body")})`}>
            <g className="cc-shine">
              <rect x={-34} y={-4} width={22} height={128} fill={`url(#${id("shine")})`} transform="skewX(-18)" />
            </g>
          </g>
        )}
      </g>

      {flavor === "blueberry" && (
        <g transform="translate(0 -7)">
          <Garnish flavor={flavor} p={p} />
        </g>
      )}
      {charm && CHARM_NO_STRONG_GLOW.has(flavor) && (
        <g transform={`translate(${charm.x} ${charm.y}) scale(${charm.scale})`}>
          <Charm flavor={flavor} look={collectorStyle} p={p} gold={gold} />
        </g>
      )}
    </svg>
  );
}

