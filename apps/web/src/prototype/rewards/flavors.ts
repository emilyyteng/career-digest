/**
 * Cat cake flavor table: palettes + structural choices per flavor.
 * Each flavor carries three palettes: classic, night (Night Bakery CE),
 * and deluxe (the recommended mixed CE treatment).
 */

export type FlavorId = "strawberry" | "matcha" | "blueberry" | "sesame" | "peach" | "lemon";
export type Edition = "classic" | "collector";
export type CollectorStyle = "foil" | "night" | "dressed" | "mix";
export type CakeBase = "sponge" | "tart" | "dome";

export type Palette = {
  fur: string;
  furShade: string;
  earInner: string;
  cake: string;
  cakeShade: string;
  stripe: string | null;
  icing: string;
  icingShade: string;
  blush: string;
  eye: string;
  /** Dominant garnish color, also used for rarity glow. */
  accent: string;
  accent2: string;
};

export type Flavor = {
  id: FlavorId;
  name: string;
  collectorName: string;
  blurb: string;
  base: CakeBase;
  classic: Palette;
  night: Palette;
  deluxe: Palette;
};

export const FLAVORS: Flavor[] = [
  {
    id: "strawberry",
    name: "Strawberry Shortcake",
    collectorName: "Berry Royale Shortcake",
    blurb: "Classic sponge cake with fresh strawberries and whipped cream.",
    base: "sponge",
    classic: {
      fur: "#fffaf6",
      furShade: "#f3e3dc",
      earInner: "#ffc9d4",
      cake: "#fbe2c4",
      cakeShade: "#ecc79e",
      stripe: "#ffffff",
      icing: "#f9a8bd",
      icingShade: "#ec8aa5",
      blush: "#ffb3c4",
      eye: "#3a2f33",
      accent: "#ec4b5e",
      accent2: "#6aa84f",
    },
    night: {
      fur: "#f4e9ff",
      furShade: "#cdb9e6",
      earInner: "#f59bc0",
      cake: "#4a2b4f",
      cakeShade: "#2f1a35",
      stripe: "#f6d7ff",
      icing: "#d9467a",
      icingShade: "#a92c5c",
      blush: "#ff8fb8",
      eye: "#2b1830",
      accent: "#ff3d6e",
      accent2: "#7ad08b",
    },
    deluxe: {
      fur: "#fffdfb",
      furShade: "#f6dfe2",
      earInner: "#ffaec2",
      cake: "#fff0dc",
      cakeShade: "#f2cfa5",
      stripe: "#ffd6e0",
      icing: "#ff7fa3",
      icingShade: "#e85a86",
      blush: "#ff9db6",
      eye: "#3a2f33",
      accent: "#e8203f",
      accent2: "#4f9a3a",
    },
  },
  {
    id: "matcha",
    name: "Matcha Roll",
    collectorName: "Gilded Matcha Roll",
    blurb: "Soft matcha sponge with cream swirl and a tea leaf garnish.",
    base: "sponge",
    classic: {
      fur: "#bcd98f",
      furShade: "#97bd6a",
      earInner: "#e9f3cf",
      cake: "#a8cb78",
      cakeShade: "#86ad57",
      stripe: null,
      icing: "#f6f3df",
      icingShade: "#e2dcbd",
      blush: "#f3b3a8",
      eye: "#2e3a26",
      accent: "#4f8a3a",
      accent2: "#f6f3df",
    },
    night: {
      fur: "#4f7d4a",
      furShade: "#33573a",
      earInner: "#a6d68f",
      cake: "#1f3d2c",
      cakeShade: "#122619",
      stripe: null,
      icing: "#d8f0b0",
      icingShade: "#a9cc80",
      blush: "#e48fa0",
      eye: "#0f1d12",
      accent: "#9be36b",
      accent2: "#f0ffd8",
    },
    deluxe: {
      fur: "#c8e69a",
      furShade: "#9fc96d",
      earInner: "#f3fadf",
      cake: "#8fc25a",
      cakeShade: "#6b9e3c",
      stripe: null,
      icing: "#fffbe8",
      icingShade: "#ecdfae",
      blush: "#f5a99c",
      eye: "#2e3a26",
      accent: "#3e7c28",
      accent2: "#fff6d0",
    },
  },
  {
    id: "blueberry",
    name: "Blueberry Tart",
    collectorName: "Blueberry Jubilee Tart",
    blurb: "Buttery tart shell with blueberry compote and cream.",
    base: "tart",
    classic: {
      fur: "#d4cbf5",
      furShade: "#b0a3e2",
      earInner: "#f2edff",
      cake: "#eec389",
      cakeShade: "#d49e5c",
      stripe: null,
      icing: "#8f7fd6",
      icingShade: "#6e5cbc",
      blush: "#f4b3cf",
      eye: "#2c2640",
      accent: "#4b4aa8",
      accent2: "#7a78d8",
    },
    night: {
      fur: "#6a5bb8",
      furShade: "#4a3d8f",
      earInner: "#c9bdff",
      cake: "#2d2552",
      cakeShade: "#1b1536",
      stripe: null,
      icing: "#3b2f8f",
      icingShade: "#271d6b",
      blush: "#e58fd0",
      eye: "#140f2a",
      accent: "#8ab4ff",
      accent2: "#c9b6ff",
    },
    deluxe: {
      fur: "#ddd4ff",
      furShade: "#b4a4f0",
      earInner: "#f7f3ff",
      cake: "#f4cc8e",
      cakeShade: "#d9a258",
      stripe: null,
      icing: "#7059d6",
      icingShade: "#5440b8",
      blush: "#f7a8d0",
      eye: "#2c2640",
      accent: "#3532a8",
      accent2: "#9a8cff",
    },
  },
  {
    id: "sesame",
    name: "Black Sesame Mochi",
    collectorName: "Ink Moon Mochi",
    blurb: "Soft mochi with black sesame and a dollop of cream.",
    base: "dome",
    classic: {
      fur: "#9a989f",
      furShade: "#747279",
      earInner: "#d9d6de",
      cake: "#4a4950",
      cakeShade: "#2f2e34",
      stripe: null,
      icing: "#f4f1ea",
      icingShade: "#ddd8cc",
      blush: "#e8a9b5",
      eye: "#1d1c21",
      accent: "#2a292e",
      accent2: "#f4f1ea",
    },
    night: {
      fur: "#3b3a48",
      furShade: "#25242f",
      earInner: "#8e86b8",
      cake: "#16151d",
      cakeShade: "#0a0a0f",
      stripe: null,
      icing: "#e9e2ff",
      icingShade: "#b8acee",
      blush: "#c97fae",
      eye: "#f5e9a8",
      accent: "#f5d76e",
      accent2: "#e9e2ff",
    },
    deluxe: {
      fur: "#8e8b96",
      furShade: "#64616c",
      earInner: "#e2dbe8",
      cake: "#35333b",
      cakeShade: "#1d1c22",
      stripe: null,
      icing: "#fffaf0",
      icingShade: "#e8dcc4",
      blush: "#efa2b4",
      eye: "#1d1c21",
      accent: "#18171b",
      accent2: "#fffaf0",
    },
  },
  {
    id: "peach",
    name: "Peach Jelly",
    collectorName: "Sunset Peach Jelly",
    blurb: "Refreshing jelly with peach slices and a glossy glaze.",
    base: "sponge",
    classic: {
      fur: "#ffe6d6",
      furShade: "#f4c8ad",
      earInner: "#ffc2b0",
      cake: "#fff1e6",
      cakeShade: "#f6d6bf",
      stripe: "#ffc7b0",
      icing: "#ffb39b",
      icingShade: "#f2927a",
      blush: "#ff9d93",
      eye: "#3d2c28",
      accent: "#ff9a76",
      accent2: "#7cae58",
    },
    night: {
      fur: "#ffd0b8",
      furShade: "#d99a86",
      earInner: "#ff8f86",
      cake: "#5a2a3e",
      cakeShade: "#3a1828",
      stripe: "#ff9a76",
      icing: "#ff6f61",
      icingShade: "#d64a45",
      blush: "#ff7a8e",
      eye: "#2a1418",
      accent: "#ffb070",
      accent2: "#9bd27a",
    },
    deluxe: {
      fur: "#ffeee3",
      furShade: "#f8c6a8",
      earInner: "#ffb09b",
      cake: "#fff6ee",
      cakeShade: "#f8d4b8",
      stripe: "#ffab8f",
      icing: "#ff9478",
      icingShade: "#ee6f55",
      blush: "#ff8c86",
      eye: "#3d2c28",
      accent: "#ff7e57",
      accent2: "#5f9a3d",
    },
  },
  {
    id: "lemon",
    name: "Lemon Meringue",
    collectorName: "Golden Hour Meringue",
    blurb: "Light sponge with lemon curd and toasted meringue.",
    base: "sponge",
    classic: {
      fur: "#fff4c4",
      furShade: "#f1dc8e",
      earInner: "#fff9e3",
      cake: "#fff8df",
      cakeShade: "#f3e2a8",
      stripe: "#ffe066",
      icing: "#ffe27a",
      icingShade: "#f4c94a",
      blush: "#ffb59c",
      eye: "#3b3322",
      accent: "#f6c823",
      accent2: "#fffaf0",
    },
    night: {
      fur: "#ffe58a",
      furShade: "#d9b24f",
      earInner: "#fff2b8",
      cake: "#2e2a4f",
      cakeShade: "#1b1834",
      stripe: "#ffd23f",
      icing: "#ffcf3a",
      icingShade: "#e0a81b",
      blush: "#ff9d7a",
      eye: "#1a1626",
      accent: "#ffe14d",
      accent2: "#fff6d6",
    },
    deluxe: {
      fur: "#fff6cc",
      furShade: "#f4d677",
      earInner: "#fffbe8",
      cake: "#fffbe8",
      cakeShade: "#f6e2a0",
      stripe: "#ffd23f",
      icing: "#ffd64a",
      icingShade: "#f2b51e",
      blush: "#ffaa8c",
      eye: "#3b3322",
      accent: "#f2b400",
      accent2: "#fffaf0",
    },
  },
];

export const FLAVOR_BY_ID: Record<FlavorId, Flavor> = Object.fromEntries(
  FLAVORS.map((f) => [f.id, f]),
) as Record<FlavorId, Flavor>;

export const COLLECTOR_STYLES: Array<{ key: CollectorStyle; name: string }> = [
  { key: "foil", name: "Foil" },
  { key: "night", name: "Night Bakery" },
  { key: "dressed", name: "Dressed Up" },
  { key: "mix", name: "Mix (recommended)" },
];

export function paletteFor(flavor: Flavor, edition: Edition, style: CollectorStyle): Palette {
  if (edition === "classic") return flavor.classic;
  if (style === "night") return flavor.night;
  if (style === "mix") return flavor.deluxe;
  return flavor.classic;
}

export function variantName(flavor: Flavor, edition: Edition): string {
  return edition === "collector" ? flavor.collectorName : flavor.name;
}

/** Five palette swatches used as friendship dots, in display order. */
export function friendshipColors(palette: Palette): [string, string, string, string, string] {
  return [palette.icing, palette.accent, palette.blush, palette.cake, palette.accent2];
}
