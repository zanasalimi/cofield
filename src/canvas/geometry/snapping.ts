/**
 * Edge/center snapping + alignment guides (v1). Pure, world-space.
 */
import type { Rect } from "@/collab/types";

export interface SnapGuide {
  /** "x" = vertical guide line at world x; "y" = horizontal at world y */
  axis: "x" | "y";
  position: number;
}

export interface SnapResult {
  /** the rect after snapping */
  rect: Rect;
  /** guide lines to render while snapped */
  guides: SnapGuide[];
}

/** Snap distance threshold in world units. */
export const SNAP_THRESHOLD = 6;

/**
 * Snap a moving rect against the edges/centers of nearby static rects.
 * TODO(v1): collect candidate edges within SNAP_THRESHOLD, snap, emit guides.
 */
export function snapRect(_moving: Rect, _others: Rect[]): SnapResult {
  throw new Error("not implemented");
}
