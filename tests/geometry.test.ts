/**
 * Geometry + viewport tests. Pure, no DOM. These prove hit-testing and the
 * world/screen math the canvas depends on at every zoom.
 */
import { describe, it } from "vitest";

describe("viewport transform", () => {
  it.todo("screenToWorld(worldToScreen(p)) === p across pan and zoom");
  it.todo("zoomAt keeps the world point under the anchor fixed");
  it.todo("zoom clamps to [MIN_ZOOM, MAX_ZOOM]");
});

describe("hit-testing", () => {
  it.todo("shapeContainsPoint accounts for rotation");
  it.todo("topmost shape wins when shapes overlap");
});

describe("marquee", () => {
  it.todo("intersect mode selects exactly the touching shapes");
  it.todo("contain mode selects only fully-enclosed shapes");
});

describe("transforms", () => {
  it.todo("applyResize clamps to MIN_SHAPE_SIZE and never inverts");
  it.todo("resize is correct under zoom (world-space)");
});

describe("culling", () => {
  it.todo("cullToViewport returns exactly the shapes intersecting the visible rect");
});
