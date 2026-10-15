/**
 * F09 M0-02 · exploratory lab config.
 * Axes: brand (Q17), vibe (Q12), font (Q14), color-meaning (Q18), containment (Q2).
 */

export const HUB_PATH = "/prototype/f09/lab";

export const BRANDS = [
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
    key: "b3",
    name: "Motivation desk",
    promise: "Show up daily — streaks, Seeds, and rewards keep momentum.",
    mark: "seed desk",
  },
  {
    key: "b4",
    name: "Personal command center",
    promise: "Everything-in-one-place hub for career work and habits.",
    mark: "command",
  },
] as const;

export const VIBES = [
  {
    key: "V1",
    name: "Sakura Terminal",
    blurb: "Raised cards, mono chrome, pastel desk — current raised dialect.",
  },
  {
    key: "V2",
    name: "Soft Sakura Clean",
    blurb: "Baby pink canvas, flat/clean, readable titles — pink + refresh.",
  },
  {
    key: "V3",
    name: "Blush Studio",
    blurb: "Soft pink brand, airy hub/planner — less hacker, still blush.",
  },
  {
    key: "V4",
    name: "Ink & Blush",
    blurb: "High-contrast ink actions; blush as accent, not wash.",
  },
  {
    key: "V5",
    name: "Seed Garden",
    blurb: "Motivation/rewards-forward; playful but tokenized.",
  },
  {
    key: "V6",
    name: "Cool Focus",
    blurb: "Mint/blue-gray wash — elimination sample: is pink load-bearing?",
  },
  {
    key: "V7",
    name: "Editorial Hub",
    blurb: "Literary/portfolio-calm; alternate personality for rebrand.",
  },
] as const;

export const FONTS = [
  {
    key: "current",
    name: "Mono + DM Sans",
    axis: "Current · style chrome + readable body",
    display: '"JetBrains Mono", ui-monospace, monospace',
    body: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    href: null as string | null,
  },
  {
    key: "plex",
    name: "IBM Plex",
    axis: "Technical but more readable",
    display: '"IBM Plex Mono", ui-monospace, monospace',
    body: '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  },
  {
    key: "grotesk",
    name: "Space Grotesk + Source Sans",
    axis: "Modern product · less hacker",
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
    axis: "Soft editorial · pairs with V7",
    display: '"Newsreader", Georgia, serif',
    body: '"DM Sans", "Segoe UI", system-ui, sans-serif',
    href: "https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,500;6..72,600;6..72,700&display=swap",
  },
] as const;

export const COLORS = [
  {
    key: "c1",
    name: "Decorative pastels + traffic severity",
    blurb: "Pastels for brand/data; R/Y/G reserved for priority severity.",
  },
  {
    key: "c2",
    name: "One semantic stack",
    blurb: "Shared danger/warn/ok/info for priority, urgency, banners.",
  },
  {
    key: "c3",
    name: "Domain hue + severity step",
    blurb: "Apps/tech/rewards families; worse = darker/hotter.",
  },
  {
    key: "c4",
    name: "Ink semantics + blush brand",
    blurb: "Near-neutral UI; pink brand; true danger red.",
  },
] as const;

export const CONTAINS = [
  { key: "carded", name: "All carded", blurb: "Panels on the desk (Jobs/Tasks-like)." },
  { key: "open", name: "Open canvas", blurb: "Content on the page wash (Rewards-like)." },
  { key: "hybrid", name: "Hybrid", blurb: "Flat feature chrome + carded body (Progress-like)." },
] as const;

export const SHELLS = [
  { key: "960", name: "960px", blurb: "Current production shell." },
  { key: "1100", name: "1100px", blurb: "Wider well for dual-column stress." },
] as const;

export type BrandKey = (typeof BRANDS)[number]["key"];
export type VibeKey = (typeof VIBES)[number]["key"];
export type FontKey = (typeof FONTS)[number]["key"];
export type ColorKey = (typeof COLORS)[number]["key"];
export type ContainKey = (typeof CONTAINS)[number]["key"];
export type ShellKey = (typeof SHELLS)[number]["key"];
