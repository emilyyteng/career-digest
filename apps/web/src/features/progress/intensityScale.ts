/**
 * R8.13 work-intensity colors for Past work calendar and Lifetime heatmaps.
 * Gradient is proportional to raw apps / LC counts (not seeds, not clamped to 3).
 * Points math still uses the 0–3 activity-credit cap elsewhere.
 */

/** Soft RGB stops from empty → hottest (same family as the old 0–3 swatches). */
const STOPS: Array<[number, number, number]> = [
  [232, 228, 236], // near --surface-2
  [243, 208, 220],
  [201, 168, 216],
  [91, 124, 153],
];

function lerp(a: number, b: number, t: number): number {
  return Math.round(a + (b - a) * t);
}

function mixStop(t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  if (clamped <= 0) {
    const [r, g, b] = STOPS[0]!;
    return `rgb(${r}, ${g}, ${b})`;
  }
  const scaled = clamped * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(scaled));
  const local = scaled - i;
  const a = STOPS[i]!;
  const b = STOPS[i + 1]!;
  return `rgb(${lerp(a[0], b[0], local)}, ${lerp(a[1], b[1], local)}, ${lerp(a[2], b[2], local)})`;
}

/** `peak` is the max raw in the visible set (at least 1). */
export function workIntensityFill(raw: number, peak: number): string {
  if (raw <= 0) return "var(--surface-2)";
  return mixStop(raw / Math.max(peak, 1));
}

export function peakRaw(values: Iterable<number>): number {
  let max = 0;
  for (const v of values) {
    if (v > max) max = v;
  }
  return Math.max(max, 1);
}

/** Legend swatches for continuous scale (empty → hot). */
export function workIntensityLegendStops(count = 5): string[] {
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? "var(--surface-2)" : mixStop(i / (count - 1)),
  );
}
