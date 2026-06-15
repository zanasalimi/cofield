/**
 * Selection transforms (resize, rotate, move) in world coordinates. Pure.
 * All transforms compose correctly at any zoom because they never touch screen
 * space — the viewport applies zoom only at render.
 */
import type { Point, Rect, Shape } from "@/collab/types";

export type ResizeHandle =
  | "nw"
  | "n"
  | "ne"
  | "e"
  | "se"
  | "s"
  | "sw"
  | "w";

export interface TransformModifiers {
  /** preserve aspect ratio (Shift) */
  aspect?: boolean;
  /** transform from center (Alt) */
  fromCenter?: boolean;
}

/** Minimum world-space size a shape may be resized to. */
export const MIN_SHAPE_SIZE = 4;

/** Apply a resize-handle drag to a rect; clamps to MIN_SHAPE_SIZE. */
export function applyResize(
  _rect: Rect,
  _handle: ResizeHandle,
  _pointerDelta: Point,
  _mods: TransformModifiers = {},
): Rect {
  // TODO(M2)
  throw new Error("not implemented");
}

/** Apply a rotation (radians) about a shape's center; snaps with `snapStep`. */
export function applyRotation(
  _shape: Shape,
  _pointer: Point,
  _snapStepDeg?: number,
): number {
  // TODO(M2)
  throw new Error("not implemented");
}

/** Translate a set of shapes by a world-space delta (immutable). */
export function translateShapes(_shapes: Shape[], _delta: Point): Shape[] {
  // TODO(M2)
  throw new Error("not implemented");
}
