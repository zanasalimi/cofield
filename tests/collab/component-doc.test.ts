import { describe, it, expect } from "vitest";
import { createBoardDoc, addShape, readShape, updateComponentProps } from "@/collab/doc";
import type { Shape } from "@/collab/types";

function frame(id: string): Shape {
  return {
    id, type: "component", kind: "frame",
    x: 0, y: 0, w: 200, h: 120, rotation: 0,
    style: { fill: "#fff", stroke: "#1A1A1A", strokeWidth: 1 },
    props: { title: "Screen", preset: "free", bg: "#FFFFFF", radius: 12 },
    createdBy: "u1",
  };
}

describe("component persistence", () => {
  it("round-trips kind and props", () => {
    const b = createBoardDoc();
    addShape(b, frame("c1"));
    const got = readShape(b, "c1")!;
    expect(got.type).toBe("component");
    expect(got.kind).toBe("frame");
    expect(got.props).toEqual({ title: "Screen", preset: "free", bg: "#FFFFFF", radius: 12 });
  });

  it("merges prop patches without clobbering siblings", () => {
    const b = createBoardDoc();
    addShape(b, frame("c1"));
    updateComponentProps(b, "c1", { title: "Login" });
    const got = readShape(b, "c1")!;
    expect(got.props).toEqual({ title: "Login", preset: "free", bg: "#FFFFFF", radius: 12 });
  });

  it("converges on concurrent edits to different prop keys", async () => {
    const Y = await import("yjs");
    const a = createBoardDoc(new Y.Doc());
    const b = createBoardDoc(new Y.Doc());
    addShape(a, frame("c1"));
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    updateComponentProps(a, "c1", { title: "A" });
    updateComponentProps(b, "c1", { bg: "#000000" });
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));
    expect(readShape(a, "c1")!.props).toEqual(readShape(b, "c1")!.props);
    expect(readShape(a, "c1")!.props!.title).toBe("A");
    expect(readShape(a, "c1")!.props!.bg).toBe("#000000");
  });
});
