/** First letter of a name, upper-cased, for avatar fallbacks. */
export function initialOf(name: string, fallback = "?"): string {
  return name.trim().slice(0, 1).toUpperCase() || fallback;
}
