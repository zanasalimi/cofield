/**
 * Deterministic CRDT convergence tests — the property the whole architecture
 * rests on. Script two (or more) Y.Docs, apply divergent concurrent ops, then
 * assert the docs converge to identical state. No DOM, no randomness in the
 * assertions, no real timers — convergence is a property of the data structure,
 * so it must be provable without a browser or a network.
 */
import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { createBoardDoc, addShape, updateShape, removeShape, reorderShape, readShape, readShapesInOrder } from "@/collab/doc";
import type { BoardDoc } from "@/collab/doc";
import type { Shape } from "@/collab/types";

const fresh = (): BoardDoc => createBoardDoc(new Y.Doc());

function rect(id: string, over: Partial<Shape> = {}): Shape {
  return {
    id,
    type: "rect",
    x: 0,
    y: 0,
    w: 100,
    h: 80,
    rotation: 0,
    style: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 2 },
    createdBy: "u",
    ...over,
  };
}

/** Full bidirectional state exchange — the merge under test. */
function exchange(a: BoardDoc, b: BoardDoc): void {
  Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
  Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));
}

/** Both docs agree on shapes AND z-order. */
function assertConverged(a: BoardDoc, b: BoardDoc): void {
  expect(readShapesInOrder(a)).toEqual(readShapesInOrder(b));
  expect(a.order.toArray()).toEqual(b.order.toArray());
}

describe("CRDT convergence", () => {
  it("two docs editing different fields of one shape both survive (move vs recolor)", () => {
    const a = fresh();
    addShape(a, rect("s1"));
    const b = fresh();
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc)); // start from the same shape

    updateShape(a, "s1", { x: 240, y: 120 }); // A moves it
    updateShape(b, "s1", { style: { fill: "#FF9F1C", stroke: "#1A1A1A", strokeWidth: 2 } }); // B recolors it
    exchange(a, b);

    assertConverged(a, b);
    const s = readShape(a, "s1")!;
    expect(s.x).toBe(240); // A's move survived
    expect(s.style.fill).toBe("#FF9F1C"); // B's colour survived — neither clobbered the other
  });

  it("concurrent z-order reorders converge to identical `order`", () => {
    const a = fresh();
    addShape(a, rect("s1"));
    addShape(a, rect("s2"));
    addShape(a, rect("s3"));
    const b = fresh();
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));

    reorderShape(a, "s1", 2); // A sends s1 to the front
    reorderShape(b, "s3", 0); // B sends s3 to the back, concurrently
    exchange(a, b);

    assertConverged(a, b); // identical order on both — Yjs resolves the race deterministically
    expect([...a.order.toArray()].sort()).toEqual(["s1", "s2", "s3"]); // no id lost or duplicated
  });

  it("concurrent edit + delete of the same shape converges deterministically", () => {
    const a = fresh();
    addShape(a, rect("s1"));
    const b = fresh();
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));

    removeShape(a, "s1"); // A deletes
    updateShape(b, "s1", { x: 99 }); // B edits the same shape concurrently
    exchange(a, b);

    assertConverged(a, b); // both land in the same place — the delete tombstones the entry
    expect(readShape(a, "s1")).toBeNull();
    expect(a.order.toArray()).toEqual([]);
  });

  it("offline edits merge on reconnect with zero data loss in both directions", () => {
    const a = fresh();
    addShape(a, rect("shared", { x: 10 }));
    const b = fresh();
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));

    // Both go offline and keep editing.
    addShape(a, rect("from-a", { x: 1 }));
    updateShape(a, "shared", { x: 50 });
    addShape(b, rect("from-b", { x: 2 }));
    updateShape(b, "shared", { y: 70 });

    exchange(a, b); // reconnect

    assertConverged(a, b);
    const ids = readShapesInOrder(a).map((s) => s.id);
    expect(ids).toContain("from-a"); // A's offline shape reached B
    expect(ids).toContain("from-b"); // B's offline shape reached A
    const shared = readShape(a, "shared")!;
    expect(shared.x).toBe(50); // A's field
    expect(shared.y).toBe(70); // B's field — both offline edits merged, nothing lost
  });

  it("apply order does not affect the converged state", () => {
    const capture = (fn: (d: BoardDoc) => void): Uint8Array => {
      const d = fresh();
      fn(d);
      return Y.encodeStateAsUpdate(d.doc);
    };
    const u1 = capture((d) => addShape(d, rect("s1", { x: 10 })));
    const u2 = capture((d) => addShape(d, rect("s2", { x: 20 })));
    const u3 = capture((d) => addShape(d, rect("s3", { x: 30 })));

    const forward = fresh();
    [u1, u2, u3].forEach((u) => Y.applyUpdate(forward.doc, u));
    const shuffled = fresh();
    [u3, u1, u2].forEach((u) => Y.applyUpdate(shuffled.doc, u));

    // Same updates, different apply order → identical converged state.
    expect(readShapesInOrder(forward)).toEqual(readShapesInOrder(shuffled));
    expect(forward.order.toArray()).toEqual(shuffled.order.toArray());
  });
});
