/**
 * Selection transforms (resize, rotate, move) in world coordinates. Pure.
 * All transforms compose correctly at any zoom because they never touch screen
 * space — the viewport applies zoom only at render.
 */
import type { Point, Rect, Shape } from "@/collab/types";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

export interface TransformModifiers {
  /** preserve aspect ratio (Shift) */
  aspect?: boolean;
  /** transform from center (Alt) */
  fromCenter?: boolean;
}

/** Minimum world-space size a shape may be resized to. */
export const MIN_SHAPE_SIZE = 8;

/** Apply a resize-handle drag (world delta) to a rect; clamps to MIN_SHAPE_SIZE
 *  and never inverts (the opposite edge stays put). */
export function applyResize(rect: Rect, handle: ResizeHandle, delta: Point, _mods: TransformModifiers = {}): Rect {
  let { x, y, w, h } = rect;
  const right = x + w;
  const bottom = y + h;

  if (handle === "w" || handle === "nw" || handle === "sw") {
    x = Math.min(x + delta.x, right - MIN_SHAPE_SIZE);
    w = right - x;
  }
  if (handle === "e" || handle === "ne" || handle === "se") {
    w = Math.max(MIN_SHAPE_SIZE, w + delta.x);
  }
  if (handle === "n" || handle === "nw" || handle === "ne") {
    y = Math.min(y + delta.y, bottom - MIN_SHAPE_SIZE);
    h = bottom - y;
  }
  if (handle === "s" || handle === "sw" || handle === "se") {
    h = Math.max(MIN_SHAPE_SIZE, h + delta.y);
  }
  return { x, y, w, h };
}

/** New rotation (radians) for a shape given the rotation-handle pointer (world).
 *  The handle sits above the shape's top edge, so 0° points the handle straight up. */
export function applyRotation(shape: Shape, pointer: Point, snapStepDeg?: number): number {
  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  let angle = Math.atan2(pointer.y - cy, pointer.x - cx) + Math.PI / 2;
  if (snapStepDeg) {
    const step = (snapStepDeg * Math.PI) / 180;
    angle = Math.round(angle / step) * step;
  }
  return angle;
}

/** Translate shapes by a world-space delta (immutable). */
export function translateShapes(shapes: Shape[], delta: Point): Shape[] {
  return shapes.map((s) => ({ ...s, x: s.x + delta.x, y: s.y + delta.y }));
}

/** The eight resize-handle anchor points (world coords) for an axis-aligned rect. */
export function handlePoints(rect: Rect): Record<ResizeHandle, Point> {
  const { x, y, w, h } = rect;
  return {
    nw: { x, y },
    n: { x: x + w / 2, y },
    ne: { x: x + w, y },
    e: { x: x + w, y: y + h / 2 },
    se: { x: x + w, y: y + h },
    s: { x: x + w / 2, y: y + h },
    sw: { x, y: y + h },
    w: { x, y: y + h / 2 },
  };
}
