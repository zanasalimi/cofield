/**
 * Presence must never reach the document.
 *
 * Cursors move at pointer frequency, so if any of it leaked into the Yjs doc
 * the board would grow without bound and replay stale positions on the next
 * load. The rule is easy to break by accident, since one stray
 * `shapes.set("cursor", ...)` is all it takes, so it is pinned here rather than
 * left to review.
 */
import { describe, it, expect } from "vitest";
import * as Y from "yjs";
import { Awareness, applyAwarenessUpdate, encodeAwarenessUpdate } from "y-protocols/awareness";
import { createBoardDoc, addShape } from "@/collab/doc";
import { setLocalIdentity, setLocalCursor, setLocalSelection, readPresenceStates } from "@/collab/awareness";
import type { Shape } from "@/collab/types";

function rect(id: string): Shape {
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
  };
}

describe("presence isolation", () => {
  it("writing identity, cursor and selection leaves the document byte-identical", () => {
    const doc = new Y.Doc();
    const board = createBoardDoc(doc);
    addShape(board, rect("s1"));
    const before = Y.encodeStateAsUpdate(doc);

    const awareness = new Awareness(doc);
    setLocalIdentity(awareness, { userId: "u1", name: "Wren 42", color: "#FF5C5C" });
    setLocalCursor(awareness, { x: 240, y: 90 });
    setLocalSelection(awareness, ["s1"]);

    expect(Y.encodeStateAsUpdate(doc)).toEqual(before);
    // shapes / order / meta / comments. Presence never adds a fifth root type.
    expect([...doc.share.keys()].sort()).toEqual(["comments", "meta", "order", "shapes"]);
  });

  it("a peer's presence arrives without touching that peer's document", () => {
    const aDoc = new Y.Doc();
    const bDoc = new Y.Doc();
    createBoardDoc(aDoc);
    const bBoard = createBoardDoc(bDoc);
    addShape(bBoard, rect("only-b-has-this"));

    const a = new Awareness(aDoc);
    const b = new Awareness(bDoc);
    setLocalIdentity(a, { userId: "u-a", name: "Otter 11", color: "#2D9CDB" });
    setLocalCursor(a, { x: 12, y: 34 });

    const bStateBefore = Y.encodeStateAsUpdate(bDoc);
    applyAwarenessUpdate(b, encodeAwarenessUpdate(a, [a.clientID]), "test");

    const seen = readPresenceStates(b);
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ userId: "u-a", name: "Otter 11", cursor: { x: 12, y: 34 } });
    // The awareness channel carried it; B's document is untouched.
    expect(Y.encodeStateAsUpdate(bDoc)).toEqual(bStateBefore);
  });

  it("one person in two tabs is two presences with distinct client ids", () => {
    const local = new Awareness(new Y.Doc());
    setLocalIdentity(local, { userId: "me", name: "Fox 07", color: "#3FA34D" });

    // The same signed-in account, open twice. `userId` is identical in both, so
    // only the awareness client id can tell the two connections apart.
    for (const [tab, cursor] of [[11, { x: 1, y: 1 }], [22, { x: 2, y: 2 }]] as const) {
      local.getStates().set(tab, { userId: "sara", name: "Sara", color: "#2D9CDB", cursor });
    }

    const seen = readPresenceStates(local);
    expect(seen.map((p) => p.clientId).sort()).toEqual([11, 22]);
    expect(new Set(seen.map((p) => p.userId)).size).toBe(1);
  });

  it("readPresenceStates skips the local client and half-populated peers", () => {
    const doc = new Y.Doc();
    const awareness = new Awareness(doc);
    setLocalIdentity(awareness, { userId: "me", name: "Fox 07", color: "#3FA34D" });
    // A peer that announced a cursor before its identity must not render as a
    // nameless, colourless ghost.
    awareness.getStates().set(999, { cursor: { x: 1, y: 2 } });

    expect(readPresenceStates(awareness)).toEqual([]);
  });
});
