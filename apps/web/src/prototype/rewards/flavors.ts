/**
 * Cat cake flavor table: palettes + structural choices per flavor.
 * Each flavor carries three palettes: classic, night (Night Bakery CE),
 * and deluxe (the recommended mixed CE treatment).
 */

export type FlavorId =
  | "strawberry"
  | "matcha"
  | "blueberry"
  | "sesame"
  | "peach"
  | "lemon"
  | "cherry"
  | "redbean"
  | "chocobanana"
  | "raspberry"
  | "caramel"
  | "ube";
export type Edition = "classic" | "collector";
export type CollectorStyle = "day" | "night";
export type CakeBase = "sponge" | "tart" | "dome" | "flan";

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
  /** Night only: glow color when the garnish itself is too dark to glow. */
  glow?: string;
  /** Night only: soft ring that keeps dark eyes readable on dark fur. */
  eyeRim?: string;
};

export type Flavor = {
  id: FlavorId;
  name: string;
  collectorName: string;
  /** Personality description; written with the classic name, swapped for the CE name on collectors. */
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
    blurb:
      "Sweet, cheerful, and always ready to make a new friend. Strawberry Shortcake is a fluffy sponge cake layered with fresh strawberries, whipped cream, and plenty of rosy strawberry frosting.",
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
      cake: "#f9dcbc",
      cakeShade: "#ecbf8e",
      stripe: "#fff0f4",
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
    blurb:
      "Quiet and easygoing, Matcha Roll is happiest curled up somewhere peaceful. This soft matcha sponge is wrapped around a creamy swirl and finished with a little tea-leaf garnish.",
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
      fur: "#5f9058",
      furShade: "#426a47",
      earInner: "#b4e09c",
      cake: "#2a503a",
      cakeShade: "#193425",
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
    blurb:
      "Bright-eyed and endlessly curious, Blueberry Tart always seems to be investigating something. A buttery tart shell holds blueberry compote and fluffy cream, topped with a handful of fresh blueberries.",
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
      accent: "#2a3aa8",
      accent2: "#a898e8",
      glow: "#6a8ad0",
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
    blurb:
      "A little reserved at first, Black Sesame Mochi is wonderfully cozy once you get acquainted. Its soft mochi cake is flavored with nutty black sesame and topped with a gentle dollop of cream.",
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
      fur: "#6a6878",
      furShade: "#4a4858",
      earInner: "#a8a0c8",
      cake: "#16151d",
      cakeShade: "#0a0a0f",
      stripe: null,
      icing: "#e9e2ff",
      icingShade: "#b8acee",
      blush: "#c97fae",
      eye: "#0f0e16",
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
    blurb:
      "Bubbly and carefree, Peach Jelly tends to bounce through life without much concern for where it lands. Refreshing peach jelly, juicy peach slices, and a glossy fruit glaze make this cake especially light and sweet.",
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
    blurb:
      "Sunny, lively, and difficult to keep in one place, Lemon Meringue brings a little brightness wherever it goes. Its light sponge cake is filled with tangy lemon curd and topped with clouds of toasted meringue.",
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
  {
    id: "cherry",
    name: "Cherry Blossom Cake",
    collectorName: "Cherry Blossom Dream",
    blurb:
      "Gentle and thoughtful, Cherry Blossom Cake likes taking its time and noticing the little things. Sakura-infused sponge, delicate cherry blossom cream, and edible flowers give it a soft floral sweetness.",
    base: "sponge",
    classic: {
      fur: "#fff5f7",
      furShade: "#f1d9df",
      earInner: "#ffc6d6",
      cake: "#ffd9e4",
      cakeShade: "#f4b7c9",
      stripe: "#fff3f6",
      icing: "#ffb3c9",
      icingShade: "#f08fac",
      blush: "#ff9fbb",
      eye: "#3a2f33",
      accent: "#ff8fb1",
      accent2: "#8fbf73",
    },
    night: {
      fur: "#fbe9f2",
      furShade: "#d7b0c6",
      earInner: "#ff9fc4",
      cake: "#4a2645",
      cakeShade: "#2e1530",
      stripe: "#ffc2d8",
      icing: "#f06c9b",
      icingShade: "#c24876",
      blush: "#ff86b3",
      eye: "#2b1830",
      accent: "#ffb3d1",
      accent2: "#9ad68a",
    },
    deluxe: {
      fur: "#fffafc",
      furShade: "#f6d3dd",
      earInner: "#ffb3c9",
      cake: "#ffcfdf",
      cakeShade: "#f3a6c0",
      stripe: "#fff6f9",
      icing: "#ff94b6",
      icingShade: "#ec6f97",
      blush: "#ff8fb0",
      eye: "#3a2f33",
      accent: "#ff6f9f",
      accent2: "#6fae55",
    },
  },
  {
    id: "redbean",
    name: "Red Bean Daifuku",
    collectorName: "Moonlit Azuki Daifuku",
    blurb:
      "Calm and dependable, Red Bean Daifuku is the kind of cake that makes anywhere feel a little more comfortable. Its pillowy mochi cake is filled with sweet red bean cream and topped with azuki beans.",
    base: "dome",
    classic: {
      fur: "#fff8ef",
      furShade: "#ecdccb",
      earInner: "#f6c9c4",
      cake: "#fbf3e8",
      cakeShade: "#e9d8c2",
      stripe: "#7a2e2e",
      icing: "#8c3a3a",
      icingShade: "#6b2626",
      blush: "#f2a9a9",
      eye: "#3a2a26",
      accent: "#7a2a2a",
      accent2: "#8fae6a",
    },
    night: {
      fur: "#f3e6d8",
      furShade: "#c9b29b",
      earInner: "#e49b9b",
      cake: "#2c1f2a",
      cakeShade: "#170f16",
      stripe: "#e8b4a0",
      icing: "#a8443f",
      icingShade: "#7d2c2c",
      blush: "#d98a96",
      eye: "#2b1a1a",
      accent: "#c45a50",
      accent2: "#9cc47a",
    },
    deluxe: {
      fur: "#fffbf4",
      furShade: "#f0dcc4",
      earInner: "#f3b8b0",
      cake: "#fff6ea",
      cakeShade: "#ecd4b4",
      stripe: "#6e2222",
      icing: "#7e2b2b",
      icingShade: "#5a1a1a",
      blush: "#f19c9c",
      eye: "#3a2a26",
      accent: "#6a1f1f",
      accent2: "#e8c25a",
    },
  },
  {
    id: "chocobanana",
    name: "Chocolate Banana",
    collectorName: "Midnight Banana",
    blurb:
      "Playful and a little mischievous, Chocolate Banana has a talent for finding fun wherever it goes. Rich chocolate cake, smooth banana cream, and glossy chocolate ganache make it an especially indulgent companion.",
    base: "sponge",
    classic: {
      fur: "#c8a084",
      furShade: "#9e7559",
      earInner: "#f0d3bf",
      cake: "#f6dfb0",
      cakeShade: "#e0bd82",
      stripe: "#fff0c8",
      icing: "#5a3626",
      icingShade: "#3e2318",
      blush: "#f0a59a",
      eye: "#2a1d17",
      accent: "#ffe27a",
      accent2: "#fff7d6",
    },
    night: {
      fur: "#7a5442",
      furShade: "#553729",
      earInner: "#c99a80",
      cake: "#2a1c18",
      cakeShade: "#140c0a",
      stripe: "#ffd86b",
      icing: "#3a2219",
      icingShade: "#22120c",
      blush: "#d98a7a",
      eye: "#1e130e",
      accent: "#ffd86b",
      accent2: "#fff2c4",
    },
    deluxe: {
      fur: "#b88b6b",
      furShade: "#8a5e42",
      earInner: "#f3d6c0",
      cake: "#f9e3b2",
      cakeShade: "#e2b874",
      stripe: "#fff2c4",
      icing: "#4a2a1c",
      icingShade: "#2e170e",
      blush: "#f09a8c",
      eye: "#2a1d17",
      accent: "#ffd64a",
      accent2: "#fffaf0",
    },
  },
  {
    id: "raspberry",
    name: "Raspberry Mousse",
    collectorName: "Velvet Raspberry",
    blurb:
      "Confident and spirited, Raspberry Mousse likes being the center of attention—and usually manages it. Its airy mousse is layered with tart raspberry compote and finished with fresh berries.",
    base: "sponge",
    classic: {
      fur: "#fff0f2",
      furShade: "#efd0d6",
      earInner: "#ffb3c2",
      cake: "#ffd3dd",
      cakeShade: "#f2a9ba",
      stripe: "#e8476a",
      icing: "#e8476a",
      icingShade: "#c42d52",
      blush: "#ff9fb2",
      eye: "#3a2229",
      accent: "#d6284f",
      accent2: "#6aa84f",
    },
    night: {
      fur: "#ffd6e2",
      furShade: "#d98aa6",
      earInner: "#ff6f96",
      cake: "#4a1630",
      cakeShade: "#2a0a1a",
      stripe: "#ff6f96",
      icing: "#c0144a",
      icingShade: "#8c0c34",
      blush: "#ff7aa0",
      eye: "#2a0f1a",
      accent: "#ff3d74",
      accent2: "#8fd07a",
    },
    deluxe: {
      fur: "#ffe9ee",
      furShade: "#f2b9c6",
      earInner: "#ff9fb4",
      cake: "#ffc2d1",
      cakeShade: "#ee8ea6",
      stripe: "#d6284f",
      icing: "#d81e4b",
      icingShade: "#a8133a",
      blush: "#ff8aa4",
      eye: "#3a2229",
      accent: "#b8123c",
      accent2: "#4f9a3a",
    },
  },
  {
    id: "caramel",
    name: "Caramel Pudding",
    collectorName: "Caramel Eclipse",
    blurb:
      "Unhurried and exceedingly content, Caramel Pudding would rather enjoy the moment than rush anywhere. Silky pudding, rich caramel sauce, and a soft crown of whipped cream make it a particularly comforting treat.",
    base: "flan",
    classic: {
      fur: "#e8c39a",
      furShade: "#c49a6c",
      earInner: "#f8dfc6",
      cake: "#ffe7a8",
      cakeShade: "#f2c86a",
      stripe: null,
      icing: "#a8622a",
      icingShade: "#7e4518",
      blush: "#f2a58e",
      eye: "#2e2014",
      accent: "#8a4a1c",
      accent2: "#fffaf0",
    },
    night: {
      fur: "#b07a4e",
      furShade: "#7e5230",
      earInner: "#e6b48c",
      cake: "#9a6a32",
      cakeShade: "#5e3c1a",
      stripe: null,
      icing: "#4e2208",
      icingShade: "#2e1404",
      blush: "#d98a6e",
      eye: "#24170c",
      accent: "#e0a050",
      accent2: "#fff2d8",
    },
    deluxe: {
      fur: "#e2b483",
      furShade: "#b98552",
      earInner: "#fbe3c8",
      cake: "#ffe08c",
      cakeShade: "#f0b84a",
      stripe: null,
      icing: "#96501c",
      icingShade: "#6a3410",
      blush: "#f29a80",
      eye: "#2e2014",
      accent: "#7a3c10",
      accent2: "#fffaf0",
    },
  },
  {
    id: "ube",
    name: "Ube Mont Blanc",
    collectorName: "Violet Crown Mont Blanc",
    blurb:
      "Dreamy and imaginative, Ube Mont Blanc always seems to have its head somewhere in the clouds. Swirls of velvety ube cream sit over fluffy vanilla-kissed sponge for a mellow, gently sweet finish.",
    base: "sponge",
    classic: {
      fur: "#d9c8f2",
      furShade: "#b39fdd",
      earInner: "#f3ebff",
      cake: "#fff3dc",
      cakeShade: "#ecd9b0",
      stripe: "#d6c4f4",
      icing: "#9b7bd6",
      icingShade: "#7a5ab8",
      blush: "#f3b0d0",
      eye: "#2c2440",
      accent: "#8a66cf",
      accent2: "#fff6cc",
    },
    night: {
      fur: "#8a76c8",
      furShade: "#5f4c9e",
      earInner: "#c9b8ff",
      cake: "#241c45",
      cakeShade: "#120d26",
      stripe: "#ffd86b",
      icing: "#5b3fb0",
      icingShade: "#3d2884",
      blush: "#e08ac8",
      eye: "#1c1530",
      accent: "#b49cff",
      accent2: "#ffe9a0",
    },
    deluxe: {
      fur: "#e2d3fb",
      furShade: "#b9a2e8",
      earInner: "#f8f2ff",
      cake: "#fff6e0",
      cakeShade: "#efd7a2",
      stripe: "#aebcf6",
      icing: "#8a5fd8",
      icingShade: "#6a42b8",
      blush: "#f4a6cf",
      eye: "#2c2440",
      accent: "#6f45c4",
      accent2: "#ffe9a0",
    },
  },
];

export const FLAVOR_BY_ID: Record<FlavorId, Flavor> = Object.fromEntries(
  FLAVORS.map((f) => [f.id, f]),
) as Record<FlavorId, Flavor>;

export const COLLECTOR_STYLES: Array<{ key: CollectorStyle; name: string }> = [
  { key: "day", name: "Day" },
  { key: "night", name: "Night" },
];

export function paletteFor(flavor: Flavor, edition: Edition, style: CollectorStyle): Palette {
  if (edition === "classic") return flavor.classic;
  return style === "night" ? flavor.night : flavor.deluxe;
}

export function variantName(flavor: Flavor, edition: Edition): string {
  return edition === "collector" ? flavor.collectorName : flavor.name;
}

export function variantDescription(flavor: Flavor, edition: Edition): string {
  return edition === "collector" ? flavor.blurb.replaceAll(flavor.name, flavor.collectorName) : flavor.blurb;
}

/** WCAG 1.4.11 minimum contrast for graphics; dots sit on a near-white card. */
const DOT_MIN_CONTRAST = 3;

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function contrastWithWhite([r, g, b]: [number, number, number]): number {
  const lin = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  const lum = 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  return 1.05 / (lum + 0.05);
}

function hslToHex(h: number, s: number, l: number): string {
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, 9 - k(n), 1));
  return `#${[f(0), f(8), f(4)]
    .map((v) =>
      Math.round(v * 255)
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

/** Lowers lightness (keeping hue and saturation) until the color is visible on white. */
export function deepenForDot(hex: string): string {
  if (contrastWithWhite(hexToRgb(hex)) >= DOT_MIN_CONTRAST) return hex;
  const [r, g, b] = hexToRgb(hex).map((c) => c / 255) as [number, number, number];
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let l = (max + min) / 2;
  const d = max - min;
  const s = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  let out = hex;
  while (l > 0 && contrastWithWhite(hexToRgb(out)) < DOT_MIN_CONTRAST) {
    l = Math.max(0, l - 0.01);
    out = hslToHex(h, s, l);
  }
  return out;
}

/**
 * Friendship dots follow a themed gradient per flavor (start, middle, end)
 * rather than the cat's own palette, whose pastels sit too close together.
 */
const FRIENDSHIP_GRADIENTS: Record<FlavorId, [string, string, string]> = {
  strawberry: ["#ec5a7c", "#dc2a2a", "#8a1010"],
  matcha: ["#b08a1e", "#5f9640", "#1f5a4c"],
  blueberry: ["#3a86c8", "#3a56c0", "#1c2468"],
  sesame: ["#a08a6e", "#6e6460", "#2a272c"],
  peach: ["#d0780c", "#e04c3c", "#963024"],
  lemon: ["#5f9a3a", "#bb8e0c", "#c8441e"],
  cherry: ["#e0689e", "#a85ea8", "#605a86"],
  redbean: ["#c4787a", "#a83444", "#64122a"],
  chocobanana: ["#a49c0c", "#7a5232", "#2e1608"],
  raspberry: ["#e2489a", "#be1a6a", "#6c0f4e"],
  caramel: ["#c8941a", "#a45a1c", "#64320e"],
  ube: ["#b06ac8", "#7448c8", "#36287e"],
};

type Lab = [number, number, number];

function srgbToOklab(hex: string): Lab {
  const [r, g, b] = hexToRgb(hex).map((c) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  }) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [
    0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  ];
}

function oklabToHex([L, A, B]: Lab): string {
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((c) => {
    const v = c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, "0");
  });
  return `#${rgb.join("")}`;
}

/** Point `t` (0–1) along a three-stop gradient, mixed in OKLab so steps look even. */
function sampleGradient(stops: [string, string, string], t: number): string {
  const [a, b] = t <= 0.5 ? [stops[0], stops[1]] : [stops[1], stops[2]];
  const u = t <= 0.5 ? t * 2 : (t - 0.5) * 2;
  const la = srgbToOklab(a);
  const lb = srgbToOklab(b);
  return oklabToHex([0, 1, 2].map((i) => la[i]! + (lb[i]! - la[i]!) * u) as Lab);
}

/** Five friendship dot colors for a flavor, lightest first, each visible on white. */
export function friendshipColors(flavor: FlavorId): [string, string, string, string, string] {
  const stops = FRIENDSHIP_GRADIENTS[flavor];
  return [0, 0.25, 0.5, 0.75, 1].map((t) => deepenForDot(sampleGradient(stops, t))) as [
    string,
    string,
    string,
    string,
    string,
  ];
}
