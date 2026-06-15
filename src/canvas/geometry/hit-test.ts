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
export function shapeBounds(shape: Shape): Rect {
  if (!shape.rotation) {
    return { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
  }
  // Rotate the four corners about the shape's center, then take their AABB.
  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  const cos = Math.cos(shape.rotation);
  const sin = Math.sin(shape.rotation);
  const hw = shape.w / 2;
  const hh = shape.h / 2;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [dx, dy] of [
    [-hw, -hh],
    [hw, -hh],
    [hw, hh],
    [-hw, hh],
  ] as const) {
    const x = cx + dx * cos - dy * sin;
    const y = cy + dx * sin + dy * cos;
    minX = Math.min(minX, x);
    minY = Math.min(minY, y);
    maxX = Math.max(maxX, x);
    maxY = Math.max(maxY, y);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** True if two world rects intersect (boundary-inclusive). */
export function rectsIntersect(a: Rect, b: Rect): boolean {
  return a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
}

/** True if rect `outer` fully contains rect `inner`. */
export function rectContainsRect(outer: Rect, inner: Rect): boolean {
  return (
    inner.x >= outer.x &&
    inner.y >= outer.y &&
    inner.x + inner.w <= outer.x + outer.w &&
    inner.y + inner.h <= outer.y + outer.h
  );
}
