import { describe, it, expect } from "vitest";
import { computeSnap } from "@/canvas/geometry/snapping";
import type { Rect } from "@/collab/types";

const other: Rect = { x: 100, y: 100, w: 100, h: 100 }; // edges x:100/150/200, y:100/150/200

describe("computeSnap", () => {
  it("snaps a near-aligned left edge and reports a vertical guide", () => {
    const moving: Rect = { x: 104, y: 400, w: 50, h: 50 }; // left 104 → snaps to 100
    const r = computeSnap(moving, [other], 6);
    expect(r.dx).toBe(-4);
    expect(r.guides.some((g) => g.axis === "x" && g.pos === 100)).toBe(true);
  });

  it("snaps centre-to-centre on both axes", () => {
    const moving: Rect = { x: 123, y: 123, w: 50, h: 50 }; // centre 148,148 → other centre 150,150
    const r = computeSnap(moving, [other], 6);
    expect(r.dx).toBe(2);
    expect(r.dy).toBe(2);
  });

  it("does not snap beyond the threshold", () => {
    const moving: Rect = { x: 160, y: 400, w: 50, h: 50 }; // every edge/centre >6px from other's
    const r = computeSnap(moving, [other], 6);
    expect(r.dx).toBe(0);
    expect(r.dy).toBe(0);
    expect(r.guides).toHaveLength(0);
  });
});
