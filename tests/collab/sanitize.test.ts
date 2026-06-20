/**
 * The document is replicated from untrusted peers, so the projection from Yjs to
 * a Shape sanitizes the fields a malicious editor could weaponize when another
 * client renders them. These round-trip a hostile shape through the doc.
 */
import { describe, it, expect } from "vitest";
import { createBoardDoc, addShape, readShape } from "@/collab/doc";
import type { Shape } from "@/collab/types";

function shape(over: Partial<Shape>): Shape {
  return {
    id: "s",
    type: "rect",
    x: 0,
    y: 0,
    w: 10,
    h: 10,
    rotation: 0,
    style: { fill: "#fff", stroke: "#000", strokeWidth: 1 },
    createdBy: "u",
    ...over,
  };
}

describe("document sanitization", () => {
  it("drops a javascript: link but keeps an https one", () => {
    const b = createBoardDoc();
    addShape(b, shape({ id: "bad", link: "javascript:alert(1)" }));
    addShape(b, shape({ id: "ok", link: "https://example.com" }));
    expect(readShape(b, "bad")!.link).toBeUndefined();
    expect(readShape(b, "ok")!.link).toBe("https://example.com");
  });

  it("rejects a non-image src but keeps a data:image one", () => {
    const b = createBoardDoc();
    addShape(b, shape({ id: "evil", type: "image", src: "javascript:stealCookies()" }));
    addShape(b, shape({ id: "img", type: "image", src: "data:image/png;base64,AAAA" }));
    expect(readShape(b, "evil")!.src).toBeUndefined();
    expect(readShape(b, "img")!.src).toBe("data:image/png;base64,AAAA");
  });

  it("clamps an oversized points array (DoS guard)", () => {
    const b = createBoardDoc();
    addShape(b, shape({ id: "huge", type: "draw", points: new Array(50_000).fill(0) }));
    expect(readShape(b, "huge")!.points!.length).toBe(20_000);
  });
});
