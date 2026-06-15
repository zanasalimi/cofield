/**
 * Marquee selection in world coordinates. Pure — unit-tested without a DOM.
 */
import type { Rect, Shape, ShapeId } from "@/collab/types";

export type MarqueeMode = "intersect" | "contain";

/**
 * Select the shapes matching a marquee rect.
 * - "intersect": any shape whose bounds touch the marquee.
 * - "contain":   only shapes fully inside the marquee.
 */
export function shapesInMarquee(
  _shapes: Shape[],
  _marquee: Rect,
  _mode: MarqueeMode = "intersect",
): ShapeId[] {
  // TODO(M2)
  throw new Error("not implemented");
}

/** Normalize a drag (start, current) into a positive-extent Rect. */
export function marqueeRect(_start: { x: number; y: number }, _current: { x: number; y: number }): Rect {
  // TODO(M2)
  throw new Error("not implemented");
}
