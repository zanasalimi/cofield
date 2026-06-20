/**
 * Geometry + viewport tests. Pure, no DOM. These prove hit-testing and the
 * world/screen math the canvas depends on at every zoom.
 */
import { describe, it, expect } from "vitest";
import {
  createViewport,
  worldToScreen,
  screenToWorld,
  pan,
  zoomAt,
  visibleWorldRect,
  MIN_ZOOM,
  MAX_ZOOM,
} from "@/canvas/viewport/viewport";
import { cullToViewport } from "@/canvas/viewport/culling";
import { rectsIntersect, shapeContainsPoint, hitTestTopmost, unionBounds } from "@/canvas/geometry/hit-test";
import { sampleConnector } from "@/canvas/geometry/connectors";
import type { Shape, Rect } from "@/collab/types";

function shape(id: string, x: number, y: number, w = 10, h = 10): Shape {
  return {
    id,
    type: "rect",
    x,
    y,
    w,
    h,
    rotation: 0,
    style: { fill: "#fff", stroke: "#000", strokeWidth: 1 },
    createdBy: "u1",
  };
}

describe("viewport transform", () => {
  it("screenToWorld(worldToScreen(p)) === p across pan and zoom", () => {
    let vp = createViewport();
    vp = pan(vp, { x: 137, y: -42 });
    vp = zoomAt(vp, { x: 300, y: 200 }, 2.5);
    for (const p of [
      { x: 0, y: 0 },
      { x: 123.4, y: -56.7 },
      { x: -1000, y: 2000 },
    ]) {
      const back = screenToWorld(vp, worldToScreen(vp, p));
      expect(back.x).toBeCloseTo(p.x, 6);
      expect(back.y).toBeCloseTo(p.y, 6);
    }
  });

  it("zoomAt keeps the world point under the anchor fixed", () => {
    const vp = pan(createViewport(), { x: 50, y: 50 });
    const anchor = { x: 420, y: 260 };
    const worldBefore = screenToWorld(vp, anchor);
    const zoomed = zoomAt(vp, anchor, 1.8);
    const screenAfter = worldToScreen(zoomed, worldBefore);
    expect(screenAfter.x).toBeCloseTo(anchor.x, 6);
    expect(screenAfter.y).toBeCloseTo(anchor.y, 6);
  });

  it("zoom clamps to [MIN_ZOOM, MAX_ZOOM]", () => {
    let vp = createViewport();
    for (let i = 0; i < 50; i++) vp = zoomAt(vp, { x: 0, y: 0 }, 2);
    expect(vp.zoom).toBe(MAX_ZOOM);
    for (let i = 0; i < 50; i++) vp = zoomAt(vp, { x: 0, y: 0 }, 0.5);
    expect(vp.zoom).toBe(MIN_ZOOM);
  });

  it("visibleWorldRect scales inversely with zoom", () => {
    const vp = { x: 10, y: 20, zoom: 2 };
    const r = visibleWorldRect(vp, 800, 600);
    expect(r).toEqual({ x: 10, y: 20, w: 400, h: 300 });
  });
});

describe("hit-testing", () => {
  it("shapeContainsPoint accounts for rotation", () => {
    // A 100×40 box centred at (50,20), rotated 90°. A point past its un-rotated
    // right edge but inside the rotated body must hit; a point off the long axis
    // must miss.
    const box: Shape = shape("r", 0, 0, 100, 40);
    box.rotation = Math.PI / 2;
    expect(shapeContainsPoint(box, { x: 50, y: 20 })).toBe(true); // centre always hits
    expect(shapeContainsPoint(box, { x: 50, y: 60 })).toBe(true); // inside the rotated (tall) body
    expect(shapeContainsPoint(box, { x: 95, y: 20 })).toBe(false); // outside once rotated
  });

  it("topmost shape wins when shapes overlap", () => {
    const shapes = [shape("under", 0, 0, 50, 50), shape("over", 20, 20, 50, 50)];
    // Point inside both → the later (topmost in z-order) one wins.
    expect(hitTestTopmost(shapes, { x: 30, y: 30 })).toBe("over");
    // Point in only the bottom shape → that one.
    expect(hitTestTopmost(shapes, { x: 5, y: 5 })).toBe("under");
    // Empty space → null.
    expect(hitTestTopmost(shapes, { x: 200, y: 200 })).toBeNull();
  });
});

describe("unionBounds", () => {
  it("returns null for an empty set", () => {
    expect(unionBounds([])).toBeNull();
  });

  it("encloses every shape, including a left-pointing arrow's normalized bounds", () => {
    const a = shape("a", 0, 0, 50, 50);
    const leftArrow: Shape = { ...shape("arr", 200, 100, 0, 0), type: "arrow", w: -80, h: -20 }; // points up-left
    const u = unionBounds([a, leftArrow])!;
    // arrow spans x[120..200], y[80..100]; union with a (0..50, 0..50)
    expect(u).toEqual({ x: 0, y: 0, w: 200, h: 100 });
  });
});

describe("connector flattening (hit-test must match the drawn line)", () => {
  // [A, cp1, cp2, B] — 8 numbers. Only a *curved* connector is a bezier.
  const eight = [0, 0, 10, 20, 30, 20, 40, 0];

  it("samples a curved connector into many on-curve points", () => {
    const out = sampleConnector(eight, 18, "curved");
    expect(out.length).toBe((18 + 1) * 2); // n+1 sampled points
    expect(out.slice(0, 2)).toEqual([0, 0]); // starts at A
    expect(out.slice(-2)).toEqual([40, 0]); // ends at B
  });

  it("passes an elbow connector through unchanged (it is already a polyline)", () => {
    expect(sampleConnector(eight, 18, "elbow")).toEqual(eight);
  });

  it("passes a straight 2-point line through unchanged", () => {
    expect(sampleConnector([0, 0, 40, 0], 18, "straight")).toEqual([0, 0, 40, 0]);
  });
});

describe("culling", () => {
  it("cullToViewport returns exactly the shapes intersecting the visible rect", () => {
    const visible: Rect = { x: 0, y: 0, w: 100, h: 100 };
    const shapes = [
      shape("inside", 10, 10),
      shape("overlap-edge", 95, 95), // touches the corner → intersects
      shape("far-right", 500, 10), // off-screen
      shape("touching-boundary", 100, 50), // x === right edge → boundary-inclusive
      shape("above", 10, -50), // off-screen (y+h = -40 < 0)
    ];
    const culled = cullToViewport(shapes, visible);
    const ids = culled.map((s) => s.id);
    // Cross-check against the predicate directly.
    const expected = shapes
      .filter((s) => rectsIntersect({ x: s.x, y: s.y, w: s.w, h: s.h }, visible))
      .map((s) => s.id);
    expect(ids).toEqual(expected);
    expect(ids).toContain("inside");
    expect(ids).toContain("overlap-edge");
    expect(ids).toContain("touching-boundary");
    expect(ids).not.toContain("far-right");
    expect(ids).not.toContain("above");
  });
});
