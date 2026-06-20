/**
 * The eight curated multiplayer hues are Cofield's brand palette. Deriving a
 * board's accent from its id keeps the colour stable across reloads and clients
 * without storing anything.
 */
export const BRAND_HUES = [
  "#FF5C5C", // coral
  "#FF9F1C", // amber
  "#E8C547", // citrus
  "#3FA34D", // fern
  "#1FB3A3", // teal
  "#2D9CDB", // sky
  "#5B5BD6", // indigo
  "#C44CD9", // orchid
] as const;

export function hueFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return BRAND_HUES[h % BRAND_HUES.length]!;
}
