/** Named font families offered in the toolbar, mapped to CSS font stacks. */
export const FONT_STACKS: Record<string, string> = {
  Sans: "ui-sans-serif, system-ui, sans-serif",
  Serif: "ui-serif, Georgia, 'Times New Roman', serif",
  Mono: "ui-monospace, 'SF Mono', Menlo, monospace",
  Rounded: "'Comic Sans MS', 'Segoe Print', ui-rounded, sans-serif",
};

export const FONT_NAMES = Object.keys(FONT_STACKS);

export function fontStack(name: string | undefined): string {
  return (name && FONT_STACKS[name]) || FONT_STACKS.Sans!;
}
