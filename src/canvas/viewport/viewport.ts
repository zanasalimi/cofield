/**
 * The viewport: a single translate+scale transform between world and screen.
 * Pure and unit-tested. Pan/zoom are transform changes, never data changes.
 *
 * Convention: (x, y) is the world coordinate sitting at the screen's top-left,
 * and `zoom` is screen pixels per world unit. So a screen point s maps to world
 * `(x + s/zoom)`, and a world point w maps to screen `((w - {x,y}) * zoom)`.
 */
import type { Point, Rect } from "@/collab/types";

export interface Viewport {
  /** world coordinate at the top-left of the screen */
  x: number;
  y: number;
  /** scale: screen pixels per world unit */
  zoom: number;
}

export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 8;

export function createViewport(): Viewport {
  return { x: 0, y: 0, zoom: 1 };
}

function clampZoom(zoom: number): number {
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

/** World point → screen point. */
export function worldToScreen(vp: Viewport, p: Point): Point {
  return { x: (p.x - vp.x) * vp.zoom, y: (p.y - vp.y) * vp.zoom };
}

/** Screen point → world point. Inverse of worldToScreen. */
export function screenToWorld(vp: Viewport, p: Point): Point {
  return { x: vp.x + p.x / vp.zoom, y: vp.y + p.y / vp.zoom };
}

/** Pan by a screen-space delta (e.g. a grab-drag). Dragging content right by
 *  `screenDelta` shifts the world origin left by the same world distance. */
export function pan(vp: Viewport, screenDelta: Point): Viewport {
  return { x: vp.x - screenDelta.x / vp.zoom, y: vp.y - screenDelta.y / vp.zoom, zoom: vp.zoom };
}

/** Zoom toward an anchor screen point; clamps to [MIN_ZOOM, MAX_ZOOM]. The world
 *  point under `anchor` stays fixed across the zoom. */
export function zoomAt(vp: Viewport, anchor: Point, factor: number): Viewport {
  const zoom = clampZoom(vp.zoom * factor);
  // World point currently under the anchor must remain under it afterwards.
  const world = screenToWorld(vp, anchor);
  return { x: world.x - anchor.x / zoom, y: world.y - anchor.y / zoom, zoom };
}

/** The visible world rectangle for the given screen size. */
export function visibleWorldRect(vp: Viewport, screenW: number, screenH: number): Rect {
  return { x: vp.x, y: vp.y, w: screenW / vp.zoom, h: screenH / vp.zoom };
}
