/**
 * Resolve a CSS variable set by next/font (e.g. --font-geist-sans) to its real
 * family name so the canvas can draw with it (ctx.font can't read CSS vars).
 * Cached after first read.
 */
const resolved: Record<string, string> = {};
function fromVar(varName: string, fallback: string): string {
  if (resolved[varName] === undefined) {
    let v = "";
    if (typeof document !== "undefined") v = getComputedStyle(document.documentElement).getPropertyValue(varName).trim();
    resolved[varName] = v || "";
  }
  return resolved[varName] ? `${resolved[varName]}, ${fallback}` : fallback;
}

/** Named font families offered in the toolbar, mapped to CSS font stacks. */
export const FONT_STACKS: Record<string, () => string> = {
  Geist: () => fromVar("--font-geist-sans", "ui-sans-serif, system-ui, sans-serif"),
  System: () => "system-ui, sans-serif",
  Serif: () => "ui-serif, Georgia, 'Times New Roman', serif",
  Mono: () => "ui-monospace, 'SF Mono', Menlo, monospace",
  Rounded: () => "'Comic Sans MS', 'Segoe Print', ui-rounded, sans-serif",
  Slab: () => "Rockwell, 'Roboto Slab', 'Courier New', serif",
  Condensed: () => "'Arial Narrow', 'Roboto Condensed', sans-serif",
  Handwriting: () => fromVar("--font-hand", "'Comic Sans MS', cursive"),
};

export const FONT_NAMES = Object.keys(FONT_STACKS);

export function fontStack(name: string | undefined): string {
  const fn = (name && FONT_STACKS[name]) || FONT_STACKS.Geist!;
  return fn();
}
