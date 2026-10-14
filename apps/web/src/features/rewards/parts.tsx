/**
 * Shared SVG pieces for cat cakes: small shapes, the per-flavor Collector's
 * Edition charms, and Night's star tiara. Charms are drawn around (0, 0) at
 * roughly ±8 units and placed by `CHARM_SPOT`.
 */
import type { ReactNode } from "react";
import type { CollectorStyle, FlavorId, Palette } from "./flavors";

export function starPath(cx: number, cy: number, r: number, points = 5, inner = 0.45): string {
  const step = Math.PI / points;
  let d = "";
  for (let i = 0; i < points * 2; i++) {
    const rad = i % 2 === 0 ? r : r * inner;
    const a = i * step - Math.PI / 2;
    d += `${i === 0 ? "M" : "L"}${(cx + rad * Math.cos(a)).toFixed(2)} ${(cy + rad * Math.sin(a)).toFixed(2)} `;
  }
  return `${d}Z`;
}

export function Blossom({ cx, cy, r, fill, center }: { cx: number; cy: number; r: number; fill: string; center: string }) {
  return (
    <g>
      {[0, 72, 144, 216, 288].map((deg) => (
        <ellipse
          key={deg}
          cx={cx}
          cy={cy - r * 0.52}
          rx={r * 0.42}
          ry={r * 0.55}
          fill={fill}
          transform={`rotate(${deg} ${cx} ${cy})`}
        />
      ))}
      <circle cx={cx} cy={cy} r={r * 0.26} fill={center} />
    </g>
  );
}

export function Raspberry({ cx, cy, p }: { cx: number; cy: number; p: Palette }) {
  return (
    <g fill={p.accent} stroke={p.icingShade} strokeWidth={0.4}>
      {[
        [0, -4],
        [-3, -1.5],
        [3, -1.5],
        [0, 0],
        [-2.2, 2.6],
        [2.2, 2.6],
        [0, 4.6],
      ].map(([dx, dy]) => (
        <circle key={`${dx}-${dy}`} cx={cx + dx!} cy={cy + dy!} r={2.2} />
      ))}
    </g>
  );
}

/** Piped "kiss" of cream: round base rising to a point. */
export function kissPath(x: number, y: number, r: number): string {
  return `M${x - r} ${y} C${x - r} ${y - r} ${x - r * 0.3} ${y - r * 1.3} ${x} ${y - r * 2} C${x + r * 0.3} ${y - r * 1.3} ${x + r} ${y - r} ${x + r} ${y} Q${x} ${y + r * 0.45} ${x - r} ${y} Z`;
}

const HEART = "M0 6.5 C-7 1.5 -7.5 -4.5 -3.6 -5.6 C-1.8 -6.1 -0.5 -5 0 -3.6 C0.5 -5 1.8 -6.1 3.6 -5.6 C7.5 -4.5 7 1.5 0 6.5 Z";
const BOW_LOOPS = [
  "M0 0 C-3 -5 -9 -5 -8.5 -0.5 C-8 3.5 -3 3 0 0 Z",
  "M0 0 C3 -5 9 -5 8.5 -0.5 C8 3.5 3 3 0 0 Z",
  "M-1 0.5 L-4.5 7 L-2.2 6.2 L-1.2 8 L0.5 1 Z",
  "M1 0.5 L4.5 7 L2.2 6.2 L1.2 8 L-0.5 1 Z",
];
const PETAL = "M0 -2.2 L-0.7 -3.2 C-2.6 -2.6 -2.4 0.5 0 3 C2.4 0.5 2.6 -2.6 0.7 -3.2 Z";

function Bow({ fill, edge, knot }: { fill: string; edge: string; knot: ReactNode }) {
  return (
    <g>
      <g fill={fill} stroke={edge} strokeWidth={0.6} strokeLinejoin="round">
        {BOW_LOOPS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
      {knot}
    </g>
  );
}

/** Where each flavor's charm sits on the cake, like a pin on the chest. Flavors without one stay plain. */
/** Stripe top is y=93 on sponge cakes; charm centers sit just on or above that line. */
export const CHARM_SPOT: Partial<Record<FlavorId, { x: number; y: number; scale: number }>> = {
  strawberry: { x: 87, y: 94, scale: 1.28 },
  peach: { x: 88, y: 96.5, scale: 1.15 },
  lemon: { x: 88, y: 96.5, scale: 1.0 },
  cherry: { x: 85, y: 94, scale: 1.15 },
  redbean: { x: 82, y: 83.5, scale: 1.12 },
  chocobanana: { x: 87, y: 94.5, scale: 1.35 },
  raspberry: { x: 85, y: 94.5, scale: 1.2 },
  caramel: { x: 83, y: 87, scale: 1.15 },
  ube: { x: 87, y: 95.5, scale: 1.18 },
};

/** Charms that skip the strong night glow so their detail stays readable. */
export const CHARM_NO_STRONG_GLOW = new Set<FlavorId>(["strawberry", "lemon"]);

/** The Collector's Edition charm; `gold` is the caller's gold gradient fill. */
export function Charm({ flavor, look, p, gold }: { flavor: FlavorId; look: CollectorStyle; p: Palette; gold: string }) {
  const night = look === "night";
  switch (flavor) {
    case "strawberry":
      return (
        <Bow
          fill={night ? p.icing : p.icing}
          edge={p.icingShade}
          knot={<path d={HEART} fill={p.accent} transform="translate(0 0.4) scale(0.32)" />}
        />
      );
    case "peach":
      // C-facing crescent (opens right); leaf tucked toward the body.
      return (
        <g transform="rotate(22)">
          <path d="M0 -7 A7 7 0 0 1 0 7 Q2.4 0 0 -7 Z" fill={p.accent} />
          <path d="M0.9 -5.4 A5.5 5.5 0 0 1 0.9 5.4 Q3 0 0.9 -5.4 Z" fill="#ffd59a" />
          <ellipse cx={3.2} cy={-2.4} rx={1} ry={1.6} fill="#ffffff" opacity={0.45} transform="rotate(28 3.2 -2.4)" />
          <path d="M0.2 -6.6 Q-0.5 -8.2 -0.2 -9.2" stroke="#8a5a3a" strokeWidth={0.7} strokeLinecap="round" fill="none" />
          <ellipse cx={1.6} cy={-8.4} rx={1.1} ry={2.3} fill={p.accent2} transform="rotate(55 1.6 -8.4)" />
        </g>
      );
    case "lemon":
      return (
        <g>
          <circle r={6.5} fill={p.accent} />
          <circle r={5.3} fill="#fff6b8" />
          {[0, 45, 90, 135].map((deg) => (
            <line
              key={deg}
              x1={0}
              y1={-5}
              x2={0}
              y2={5}
              stroke={p.accent}
              strokeWidth={1.15}
              strokeLinecap="round"
              transform={`rotate(${deg})`}
            />
          ))}
          <circle r={1.15} fill="#fff6b8" stroke={p.accent} strokeWidth={0.55} />
        </g>
      );
    case "cherry":
      return night ? (
        <g>
          <path d={PETAL} fill={p.icing} transform="translate(-4 -4) rotate(-30)" />
          <path d={PETAL} fill={p.accent} transform="translate(1 0) rotate(25) scale(0.85)" />
          <path d={PETAL} fill={p.icing} transform="translate(5 5) rotate(60) scale(0.7)" />
        </g>
      ) : (
        <g>
          <path d="M-7 6 Q-2 3 1 -1 Q3 -4 7 -6" stroke="#8a5a4a" strokeWidth={0.9} fill="none" strokeLinecap="round" />
          <path d="M1 -1 Q3 0 4.4 2" stroke="#8a5a4a" strokeWidth={0.7} fill="none" strokeLinecap="round" />
          <Blossom cx={-2.4} cy={2.6} r={3.8} fill={p.accent} center="#ffe08a" />
          <Blossom cx={5.2} cy={-5.2} r={2.8} fill="#ffffff" center="#ffe08a" />
          <ellipse cx={4.6} cy={2.6} rx={1} ry={1.5} fill={p.icing} />
        </g>
      );
    case "redbean":
      return <Bow fill={gold} edge="#b8860b" knot={<circle r={1.8} fill="#e6b422" stroke="#b8860b" strokeWidth={0.5} />} />;
    case "chocobanana":
      return (
        <g>
          <path d={HEART} fill={p.icing} />
          <path d="M-5 -1.5 L-2.5 0.8 L0 -1.5 L2.5 0.8 L5 -1.5" stroke={p.accent2} strokeWidth={0.9} fill="none" strokeLinejoin="round" />
          <ellipse cx={-2.6} cy={-3.4} rx={1.4} ry={0.7} fill="#ffffff" opacity={0.3} />
        </g>
      );
    case "raspberry":
      return night ? (
        <g fill="#ffd86b" stroke="#c9971a" strokeWidth={0.4}>
          <path d={starPath(-2.6, 2, 4, 4, 0.35)} />
          <path d={starPath(4.2, -3.4, 2.6, 4, 0.35)} />
          <path d={starPath(4.6, 5.2, 1.8, 4, 0.35)} />
        </g>
      ) : (
        <g>
          <path d={HEART} fill={p.accent} />
          <path
            d="M0 -3.6 L-3.6 -5.6 M0 -3.6 L3.6 -5.6 M0 -3.6 L-2.2 1 L0 6.5 L2.2 1 Z M-6.4 -1 L-2.2 1 M6.4 -1 L2.2 1"
            stroke="#ffffff"
            strokeWidth={0.45}
            strokeOpacity={0.55}
            fill="none"
          />
          <path d="M-4.6 -4.2 L-2.6 -3.6 L-3.8 -1.4 Z" fill="#ffffff" opacity={0.55} />
        </g>
      );
    case "caramel":
      return (
        <g>
          <path d="M-3.5 -1.5 L-7.5 -3.8 L-6.8 0 L-7.5 3.8 L-3.5 1.5 Z" fill="#fff2d8" stroke={p.icingShade} strokeWidth={0.5} />
          <path d="M3.5 -1.5 L7.5 -3.8 L6.8 0 L7.5 3.8 L3.5 1.5 Z" fill="#fff2d8" stroke={p.icingShade} strokeWidth={0.5} />
          <rect x={-3.8} y={-2.8} width={7.6} height={5.6} rx={1.6} fill={p.icing} />
          <path d="M-2.4 -1.6 Q0 -2.4 2.4 -1.6" stroke="#ffffff" strokeWidth={0.7} opacity={0.5} fill="none" />
        </g>
      );
    case "ube": {
      const puffs = [
        [-5.6, 0.2, 2.55],
        [-1.8, -1.15, 2.95],
        [2.7, -0.55, 2.7],
        [5.7, 0.75, 2.2],
        [1.3, 1.55, 2.35],
        [-3.0, 1.65, 2.25],
      ];
      return (
        <g>
          <g fill={p.icing}>
            {puffs.map(([x, y, r]) => (
              <ellipse key={`o${x}`} cx={x} cy={y} rx={r! + 0.55} ry={(r! + 0.55) * 0.78} />
            ))}
          </g>
          <g fill="#ffffff">
            {puffs.map(([x, y, r]) => (
              <ellipse key={`i${x}`} cx={x} cy={y} rx={r} ry={r! * 0.78} />
            ))}
          </g>
          <ellipse cx={-2} cy={-1.35} rx={1.35} ry={0.7} fill={p.fur} opacity={0.5} />
        </g>
      );
    }
    default:
      return null;
  }
}

/** Night's head accessory, drawn where Day's crown sits. */
export function StarTiara() {
  return (
    <g>
      <path d="M-9 4 Q0 -1 9 4" stroke="#d9b44a" strokeWidth={1.2} fill="none" />
      <g fill="#ffe9a0" stroke="#d9b44a" strokeWidth={0.6} strokeLinejoin="round">
        <path d={starPath(-7, 1.4, 2.8)} />
        <path d={starPath(0, -2.6, 4.4)} />
        <path d={starPath(7, 1.4, 2.8)} />
      </g>
    </g>
  );
}
