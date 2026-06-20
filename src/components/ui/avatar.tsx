import { cn } from "@/lib/utils";
import { initialOf } from "@/lib/initials";

/**
 * A coloured initial badge — the one avatar primitive used for people and boards.
 * Defaults to a circle; pass `className` for size, shape (e.g. `rounded-xl`),
 * rings or shadows. `color` is the background (a brand hue or a stored colour).
 */
export function Avatar({
  name,
  color,
  fallback,
  className,
}: {
  name: string;
  color: string;
  fallback?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("grid size-9 place-items-center rounded-full text-sm font-semibold text-white", className)}
      style={{ backgroundColor: color }}
      aria-hidden
    >
      {initialOf(name, fallback)}
    </span>
  );
}
