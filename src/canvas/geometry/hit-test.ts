/**
 * Hit-testing in world coordinates. Pure functions — unit-tested without a DOM.
 * Topmost-wins semantics are the caller's responsibility (iterate z-order back
 * to front and take the first hit).
 */
import type { Point, Rect, Shape } from "@/collab/types";

/** True if a world point lies inside a shape, accounting for its rotation. */
export function shapeContainsPoint(_shape: Shape, _point: Point): boolean {
  // TODO(M2): rotate the point into the shape's local frame, then test bounds.
  throw new Error("not implemented");
}

/** The axis-aligned world bounds of a shape (post-rotation). */
export function shapeBounds(_shape: Shape): Rect {
  // TODO(M2)
  throw new Error("not implemented");
}

/** True if two world rects intersect (boundary-inclusive). */
export function rectsIntersect(_a: Rect, _b: Rect): boolean {
  // TODO(M1)
  throw new Error("not implemented");
}

/** True if rect `outer` fully contains rect `inner`. */
export function rectContainsRect(_outer: Rect, _inner: Rect): boolean {
  // TODO(M2)
  throw new Error("not implemented");
}
