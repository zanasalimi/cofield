/**
 * Alignment snapping for drag-move. Pure functions in world coordinates — no
 * DOM, unit-tested. A moving rectangle snaps its left / centre / right edges to
 * any other rectangle's left / centre / right (and likewise on Y), within a
 * pixel threshold, and reports guide lines to draw where it aligned.
 */
import type { Rect } from "@/collab/types";

/** A snap guide line. For axis "x" it is vertical at world x = `pos`, spanning
 *  `start`..`end` on Y; for axis "y" it is horizontal at world y = `pos`. The
 *  optional `gap` carries the empty distance (px) to the aligned neighbour plus
 *  the world point to label it. */
export interface SnapGuide {
  axis: "x" | "y";
  pos: number;
  start: number;
  end: number;
  gap?: { px: number; x: number; y: number };
}

export interface SnapResult {
  dx: number;
  dy: number;
  guides: SnapGuide[];
}

/** Snap distance threshold in world units (callers scale by zoom). */
export const SNAP_THRESHOLD = 6;

/**
 * Find the nearest edge/centre alignment of `moving` to any of `others`, within
 * `threshold` (world units). Returns the delta to apply so the alignment is
 * exact, plus a guide line per snapped axis.
 */
export function computeSnap(moving: Rect, others: Rect[], threshold: number): SnapResult {
  const mXs = [moving.x, moving.x + moving.w / 2, moving.x + moving.w];
  const mYs = [moving.y, moving.y + moving.h / 2, moving.y + moving.h];

  let bestX = Number.POSITIVE_INFINITY;
  let oxRect: Rect | null = null;
  let oxPos = 0;
  let bestY = Number.POSITIVE_INFINITY;
  let oyRect: Rect | null = null;
  let oyPos = 0;

  for (const o of others) {
    const oXs = [o.x, o.x + o.w / 2, o.x + o.w];
    const oYs = [o.y, o.y + o.h / 2, o.y + o.h];
    for (const m of mXs) {
      for (const ox of oXs) {
        const d = ox - m;
        if (Math.abs(d) < Math.abs(bestX)) {
          bestX = d;
          oxRect = o;
          oxPos = ox;
        }
      }
    }
    for (const m of mYs) {
      for (const oy of oYs) {
        const d = oy - m;
        if (Math.abs(d) < Math.abs(bestY)) {
          bestY = d;
          oyRect = o;
          oyPos = oy;
        }
      }
    }
  }

  const guides: SnapGuide[] = [];
  let dx = 0;
  let dy = 0;
  const snappedX = !!oxRect && Math.abs(bestX) <= threshold;
  const snappedY = !!oyRect && Math.abs(bestY) <= threshold;
  if (snappedX) dx = bestX;
  if (snappedY) dy = bestY;

  if (oxRect && snappedX) {
    guides.push({
      axis: "x",
      pos: oxPos,
      start: Math.min(moving.y + dy, oxRect.y),
      end: Math.max(moving.y + moving.h + dy, oxRect.y + oxRect.h),
      gap: gapMeasure(moving.y + dy, moving.h, oxRect.y, oxRect.h, "x", oxPos),
    });
  }
  if (oyRect && snappedY) {
    guides.push({
      axis: "y",
      pos: oyPos,
      start: Math.min(moving.x + dx, oyRect.x),
      end: Math.max(moving.x + moving.w + dx, oyRect.x + oyRect.w),
      gap: gapMeasure(moving.x + dx, moving.w, oyRect.x, oyRect.w, "y", oyPos),
    });
  }
  return { dx, dy, guides };
}

/** Empty distance (px) between the moving rect and the aligned neighbour on the
 *  axis perpendicular to the guide, with a world point to label it. Undefined if
 *  the rects overlap on that axis. */
function gapMeasure(mLo: number, mLen: number, oLo: number, oLen: number, guideAxis: "x" | "y", guidePos: number): SnapGuide["gap"] {
  const mHi = mLo + mLen;
  const oHi = oLo + oLen;
  let px: number;
  let mid: number;
  if (mLo >= oHi) {
    px = mLo - oHi;
    mid = (oHi + mLo) / 2;
  } else if (oLo >= mHi) {
    px = oLo - mHi;
    mid = (mHi + oLo) / 2;
  } else {
    return undefined;
  }
  if (px < 1) return undefined;
  return guideAxis === "x" ? { px: Math.round(px), x: guidePos, y: mid } : { px: Math.round(px), x: mid, y: guidePos };
}
