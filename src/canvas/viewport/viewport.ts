/**
 * The viewport: a single translate+scale transform between world and screen.
 * Pure and unit-tested. Pan/zoom are transform changes, never data changes.
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

/** World point → screen point. */
export function worldToScreen(_vp: Viewport, _p: Point): Point {
  // TODO(M1)
  throw new Error("not implemented");
}

/** Screen point → world point. Inverse of worldToScreen. */
export function screenToWorld(_vp: Viewport, _p: Point): Point {
  // TODO(M1): must satisfy screenToWorld(worldToScreen(p)) === p.
  throw new Error("not implemented");
}

/** Pan by a screen-space delta (e.g. a drag). */
export function pan(_vp: Viewport, _screenDelta: Point): Viewport {
  // TODO(M1)
  throw new Error("not implemented");
}

/** Zoom toward an anchor screen point; clamps to [MIN_ZOOM, MAX_ZOOM]. */
export function zoomAt(_vp: Viewport, _anchor: Point, _factor: number): Viewport {
  // TODO(M1): keep the world point under `anchor` fixed across the zoom.
  throw new Error("not implemented");
}

/** The visible world rectangle for the given screen size. */
export function visibleWorldRect(
  _vp: Viewport,
  _screenW: number,
  _screenH: number,
): Rect {
  // TODO(M1)
  throw new Error("not implemented");
}
