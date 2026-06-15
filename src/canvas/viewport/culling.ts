/**
 * Viewport culling — the perf headline. Per frame, only shapes whose world
 * bounds intersect the visible rect are returned for drawing. Pure and tested:
 * the cull set must equal exactly the shapes intersecting the viewport rect.
 */
import type { Rect, Shape } from "@/collab/types";
import { shapeBounds, rectsIntersect } from "@/canvas/geometry/hit-test";

/**
 * Return the subset of `shapes` that intersect `visibleRect`, preserving input
 * (z-) order. Off-screen shapes cost nothing downstream.
 */
export function cullToViewport(shapes: Shape[], visibleRect: Rect): Shape[] {
  return shapes.filter((s) => rectsIntersect(shapeBounds(s), visibleRect));
}
