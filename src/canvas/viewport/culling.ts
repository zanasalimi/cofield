/**
 * Viewport culling — the perf headline. Per frame, only shapes whose world
 * bounds intersect the visible rect are returned for drawing. Pure and tested:
 * the cull set must equal exactly the shapes intersecting the viewport rect.
 */
import type { Rect, Shape } from "@/collab/types";

/**
 * Return the subset of `shapes` that intersect `visibleRect`, preserving input
 * (z-) order. Off-screen shapes cost nothing downstream.
 * TODO(M1): use shapeBounds + rectsIntersect from geometry.
 */
export function cullToViewport(_shapes: Shape[], _visibleRect: Rect): Shape[] {
  throw new Error("not implemented");
}
