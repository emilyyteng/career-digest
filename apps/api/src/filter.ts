/** Cheap title-only intern filter. Avoids matching "internal" / "international". */
export function looksLikeInternship(title: string): boolean {
  return /\bintern(?:ship)?s?\b|\bco-?ops?\b/i.test(title);
}
