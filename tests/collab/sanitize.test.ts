/**
 * The document is replicated from untrusted peers, so the projection from Yjs to
 * a Shape sanitizes the fields a malicious editor could weaponize when another
 * client renders them. These round-trip a hostile shape through the doc.
 */
import { describe, it, expect } from "vitest";
import * as Y from "yjs";
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

describe("payload limits at the document boundary", () => {
  it("refuses an image far larger than the UI allows", () => {
    const board = createBoardDoc(new Y.Doc());
    const huge = "data:image/png;base64," + "A".repeat(6 * 1024 * 1024);
    addShape(board, shape({ id: "big", type: "image", src: huge }));
    // The 2MB cap lives in the sender's browser; a peer that skips it must not
    // be able to replicate an unbounded blob to everyone.
    expect(readShape(board, "big")!.src).toBeUndefined();
  });

  it("keeps an image within the limit", () => {
    const board = createBoardDoc(new Y.Doc());
    const ok = "data:image/png;base64," + "A".repeat(1024);
    addShape(board, shape({ id: "ok", type: "image", src: ok }));
    expect(readShape(board, "ok")!.src).toBe(ok);
  });

  it("truncates runaway text rather than dropping the shape's label", () => {
    const board = createBoardDoc(new Y.Doc());
    addShape(board, shape({ id: "wordy", type: "sticky", content: "x".repeat(50_000) }));
    const content = readShape(board, "wordy")!.content!;
    expect(content.length).toBe(20_000);
  });

  it("refuses an absurdly long link", () => {
    const board = createBoardDoc(new Y.Doc());
    addShape(board, shape({ id: "linky", link: "https://example.com/" + "a".repeat(4000) }));
    expect(readShape(board, "linky")!.link).toBeUndefined();
  });
});
