/**
 * Work-intensity colors for Past work calendar and Lifetime heatmaps (R8.13 / F09 R0.3).
 * Gradient is proportional to raw apps / LC counts (not seeds, not clamped to 3).
 * Points math still uses the 0–3 activity-credit cap elsewhere.
 *
 * Filled stops mirror `:root` `--heat-0` … `--heat-4` (vivid-rose soft peak, F09 M0).
 * Empty cells use `--surface-2` separately.
 */

/** Soft RGB stops matching `--heat-0` … `--heat-4` (lightest work → peak). */
const STOPS: Array<[number, number, number]> = [
  [255, 248, 250], // #fff8fa — heat-0
  [252, 228, 238], // #fce4ee — heat-1
  [245, 192, 212], // #f5c0d4 — heat-2
  [235, 160, 188], // #eba0bc — heat-3
  [224, 120, 160], // #e078a0 — heat-4
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

/** Legend swatches for continuous scale (empty → hot). Prefer CSS heat tokens when count is 5. */
export function workIntensityLegendStops(count = 5): string[] {
  if (count === 5) {
    return [
      "var(--heat-0)",
      "var(--heat-1)",
      "var(--heat-2)",
      "var(--heat-3)",
      "var(--heat-4)",
    ];
  }
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? "var(--surface-2)" : mixStop(i / (count - 1)),
  );
}
