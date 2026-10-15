/**
 * F09 M0-02 · exploratory lab config.
 *
 * Interim leanings (not locked): V1/V4 pink+ink remix · IBM Plex ·
 * RYG priorities + domain kind badges · rose heat (4-stop peak) ·
 * carded · 1100px. Flora packs kept for elimination contrast.
 *
 * Core hue roles (keep the set small — map meaning onto these):
 *   ink · brand/blush · severity R/Y/G · domain apps/tech/reward · success mint
 */

export const HUB_PATH = "/prototype/f09/lab";

export const BRANDS = [
  {
    key: "flora",
    name: "flora.exe",
    promise:
      "Soft growth + productive execution — still on the table; pink/green balance is hard.",
    mark: "flora.exe",
  },
  {
    key: "b1",
    name: "Job board & tracker",
    promise: "Find roles, track applications, stay on top of the pipeline.",
    mark: "career-digest",
  },
  {
    key: "b2",
    name: "Career prep OS",
    promise: "One calm system for jobs, tasks, and weekly prep progress.",
    mark: "prep OS",
  },
  {
    key: "b4",
    name: "Personal command center",
    promise: "Everything-in-one-place hub for career work and habits.",
    mark: "command",
  },
] as const;

/** Vibe packs — each owns action/select/chrome/hover (no leftover purple/blue). */
export const VIBES = [
  {
    key: "V1",
    name: "Ink desk (V1×V4)",
    blurb:
      "Leaning remix: sakura desk + ink titles/buttons · tabs = ink + gray wash · flat elev · sev-5 · all carded.",
  },
  {
    key: "V4",
    name: "Ink & Blush",
    blurb: "Cooler gray desk; ink everywhere; blush spark only. Button source for V1 remix.",
  },
  {
    key: "V2",
    name: "Soft Sakura Clean",
    blurb: "Flat pink canvas — titles now ink (was pink chrome).",
  },
  {
    key: "V3",
    name: "Blush Studio",
    blurb: "Airy blush surfaces; ink titles/actions (less pink chrome).",
  },
  {
    key: "V5",
    name: "Flora soft",
    blurb: "Elimination — pink/green balance feels hard.",
  },
  {
    key: "V5b",
    name: "Flora ink",
    blurb: "Elimination — green select vs ink actions.",
  },
  {
    key: "V6",
    name: "Cool Focus",
    blurb: "Mint/blue-gray wash — is pink load-bearing?",
  },
  {
    key: "V7",
    name: "Editorial Hub",
    blurb: "Literary/portfolio-calm; warm ink + dusty rose.",
  },
] as const;

export const FONTS = [
  {
    key: "plex",
    name: "IBM Plex",
    axis: "Leaning · technical + readable",
    display: '"IBM Plex Mono", ui-monospace, monospace',
    body: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  },
  {
    key: "current",
    name: "Mono + DM Sans",
    axis: "Current production pair",
    display: '"JetBrains Mono", ui-monospace, monospace',
    body: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    href: null as string | null,
  },
  {
    key: "grotesk",
    name: "Space Grotesk + Source Sans",
    axis: "Comfortable but maybe too clean",
    display: '"Space Grotesk", system-ui, sans-serif',
    body: '"Source Sans 3", "Segoe UI", system-ui, sans-serif',
    href: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;500;600;700&family=Space+Grotesk:wght@500;600;700&display=swap",
  },
  {
    key: "hyper",
    name: "Hyperlegible + Plex Mono nums",
    axis: "Max readability",
    display: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif',
    body: '"Atkinson Hyperlegible", "Segoe UI", system-ui, sans-serif',
    href: "https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&family=IBM+Plex+Mono:wght@500;600&display=swap",
  },
  {
    key: "editorial",
    name: "Newsreader + DM Sans",
    axis: "Soft editorial",
    display: '"Newsreader", Georgia, serif',
    body: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    href: "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap",
  },
] as const;

/**
 * Color-meaning maps.
 * Preferred lean: RYG for priority severity + domain hues for kind
 * (interview=apps blue, goal=reward pink). Purple = domain tech only if kept.
 */
export const COLORS = [
  {
    key: "c3",
    name: "Domain + RYG severity (preferred)",
    blurb:
      "P0–P2 = traffic R/Y/G. Interview=apps blue · goal=reward pink · tech=purple (only if purple earns a seat).",
  },
  {
    key: "c1",
    name: "Pastels + traffic priority",
    blurb: "Same RYG priorities; kind badges also on domain blue/pink.",
  },
  {
    key: "c2",
    name: "One semantic stack",
    blurb: "Elimination — muddy when P1 goes dark.",
  },
  {
    key: "c4",
    name: "Ink semantics + blush brand",
    blurb: "Elimination — dark P1 muddy.",
  },
] as const;

/** Heatmap peak explorations — rose peak = former step-3 (less intense). */
export const HEATS = [
  {
    key: "rose",
    name: "Vivid rose (soft peak)",
    blurb: "Former 4th stop is now the peak; empties stay cream.",
  },
  {
    key: "orchid",
    name: "Orchid",
    blurb: "Peak = vivid orchid (lighter than navy).",
  },
  {
    key: "coral",
    name: "Coral bloom",
    blurb: "Peak = warm coral; empty stays blush-cream.",
  },
  {
    key: "flora",
    name: "Flora mint→bloom",
    blurb: "Elimination contrast with flora packs.",
  },
  {
    key: "navy",
    name: "Navy (current prod)",
    blurb: "Elimination — often too intense as a reward.",
  },
] as const;

/**
 * Urgency vs purple: domain-tech (purple) = identity (streak/score/tech).
 * Urgency = time severity — must not reuse purple/blue domain hues.
 */
export const URGENCIES = [
  {
    key: "u-sev5",
    name: "Severity 5 (recommended)",
    blurb:
      "Overdue=P0 · urgent=rose · soon=amber · ahead=muted · ok=mint. No purple/blue — frees tech purple.",
  },
  {
    key: "u-warm3",
    name: "Warm 3-step",
    blurb: "Overdue rose · soon amber · ok mint — simplest unload.",
  },
  {
    key: "u-mono",
    name: "One hue, step weight",
    blurb: "Brand blush ladder only; urgency = weight/saturation.",
  },
  {
    key: "u-prod",
    name: "Prod 5 · overdue→P0",
    blurb: "Elimination — middle steps still steal domain purple/blue.",
  },
  {
    key: "u-soft5",
    name: "Soft 5 (prod-like)",
    blurb: "Elimination — pastel purple/blue middle.",
  },
] as const;

/** Button elevation — secondary always flat; primary may lift. */
export const ELEVS = [
  {
    key: "flat",
    name: "Flat / bordered",
    blurb: "No button shadow — matches day-panel controls; secondary stays quiet.",
  },
  {
    key: "raised",
    name: "Soft shadow (primary only)",
    blurb: "Primary lifts; secondary/ghost stay flat (Keep editing never shadows).",
  },
] as const;

export const CONTAINS = [
  { key: "carded", name: "All carded", blurb: "Preferred visually. Nested-tab IA → M1." },
  { key: "open", name: "Open canvas", blurb: "Rewards-like — contrast only." },
  { key: "hybrid", name: "Hybrid", blurb: "Progress-like flat subnav + cards." },
] as const;

export const SHELLS = [
  { key: "1100", name: "1100px", blurb: "Preferred — freer dual-column space." },
  { key: "960", name: "960px", blurb: "Current production shell." },
] as const;

export type BrandKey = (typeof BRANDS)[number]["key"];
export type VibeKey = (typeof VIBES)[number]["key"];
export type FontKey = (typeof FONTS)[number]["key"];
export type ColorKey = (typeof COLORS)[number]["key"];
export type HeatKey = (typeof HEATS)[number]["key"];
export type UrgencyKey = (typeof URGENCIES)[number]["key"];
export type ElevKey = (typeof ELEVS)[number]["key"];
export type ContainKey = (typeof CONTAINS)[number]["key"];
export type ShellKey = (typeof SHELLS)[number]["key"];
