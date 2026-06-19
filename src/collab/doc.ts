/**
 * Yjs document setup and typed shape helpers.
 *
 * The document is the source of truth and is replicated to every client.
 * Layout:
 *   shapes : Y.Map<ShapeId, Y.Map<field, value>>   // nested per-shape maps
 *   order  : Y.Array<ShapeId>                       // z-order
 *   meta   : Y.Map<string, unknown>                 // board name, background
 *
 * Each shape is a NESTED Y.Map (not a plain object) so two users editing
 * different fields of the same shape merge without clobbering.
 */
import * as Y from "yjs";
import type { Shape, ShapeId, ShapeType, ShapeStyle, Side } from "./types";

export interface BoardDoc {
  doc: Y.Doc;
  shapes: Y.Map<Y.Map<unknown>>;
  order: Y.Array<ShapeId>;
  meta: Y.Map<unknown>;
}

const FIELDS: (keyof Shape)[] = ["id", "type", "x", "y", "w", "h", "rotation", "style", "content", "points", "src", "from", "to", "fromSide", "toSide", "locked", "link", "createdBy"];

/** Create (or wrap) the typed top-level structures on a Y.Doc. */
export function createBoardDoc(doc: Y.Doc = new Y.Doc()): BoardDoc {
  return {
    doc,
    shapes: doc.getMap<Y.Map<unknown>>("shapes"),
    order: doc.getArray<ShapeId>("order"),
    meta: doc.getMap("meta"),
  };
}

function toYMap(shape: Shape): Y.Map<unknown> {
  const ym = new Y.Map<unknown>();
  for (const f of FIELDS) {
    const v = shape[f];
    if (v !== undefined) ym.set(f, v);
  }
  return ym;
}

function fromYMap(ym: Y.Map<unknown>): Shape | null {
  const id = ym.get("id") as ShapeId | undefined;
  if (!id) return null;
  return {
    id,
    type: ym.get("type") as ShapeType,
    x: ym.get("x") as number,
    y: ym.get("y") as number,
    w: ym.get("w") as number,
    h: ym.get("h") as number,
    rotation: (ym.get("rotation") as number) ?? 0,
    style: ym.get("style") as ShapeStyle,
    content: ym.get("content") as string | undefined,
    points: ym.get("points") as number[] | undefined,
    src: ym.get("src") as string | undefined,
    from: ym.get("from") as string | undefined,
    to: ym.get("to") as string | undefined,
    fromSide: ym.get("fromSide") as Side | undefined,
    toSide: ym.get("toSide") as Side | undefined,
    locked: ym.get("locked") as boolean | undefined,
    link: ym.get("link") as string | undefined,
    createdBy: ym.get("createdBy") as string,
  };
}

/** Insert a shape as a nested Y.Map and append it to the z-order. */
export function addShape(board: BoardDoc, shape: Shape): void {
  board.doc.transact(() => {
    board.shapes.set(shape.id, toYMap(shape));
    board.order.push([shape.id]);
  });
}

/** Patch one or more fields of an existing shape (per-field, merge-safe). */
export function updateShape(board: BoardDoc, id: ShapeId, patch: Partial<Shape>): void {
  const ym = board.shapes.get(id);
  if (!ym) return;
  board.doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) {
      if (v !== undefined) ym.set(k, v);
    }
  });
}

/** Remove a shape and its z-order entry (produces a tombstone — expected). */
export function removeShape(board: BoardDoc, id: ShapeId): void {
  board.doc.transact(() => {
    board.shapes.delete(id);
    const idx = board.order.toArray().indexOf(id);
    if (idx >= 0) board.order.delete(idx, 1);
  });
}

/** Project a shape's nested Y.Map back to a plain Shape. */
export function readShape(board: BoardDoc, id: ShapeId): Shape | null {
  const ym = board.shapes.get(id);
  return ym ? fromYMap(ym) : null;
}

/** Snapshot all shapes in z-order — the renderer's cull-pass input. */
export function readShapesInOrder(board: BoardDoc): Shape[] {
  const out: Shape[] = [];
  for (const id of board.order.toArray()) {
    const ym = board.shapes.get(id);
    if (ym) {
      const s = fromYMap(ym);
      if (s) out.push(s);
    }
  }
  return out;
}

/**
 * An undo manager scoped to the document's shapes and z-order. It tracks only
 * locally-originated transactions (origin `null`); updates applied by the
 * websocket provider carry the provider as origin and are ignored — so undo is
 * per-user and never reverts a collaborator's edit. `captureTimeout` groups a
 * rapid burst (e.g. a drag) into a single undo step.
 */
export function createUndoManager(board: BoardDoc): Y.UndoManager {
  return new Y.UndoManager([board.shapes, board.order], { captureTimeout: 400 });
}

/** Reorder a shape in the z-stack (bring forward / send back / to front/back). */
export function reorderShape(board: BoardDoc, id: ShapeId, toIndex: number): void {
  board.doc.transact(() => {
    const arr = board.order.toArray();
    const from = arr.indexOf(id);
    if (from < 0) return;
    board.order.delete(from, 1);
    board.order.insert(Math.max(0, Math.min(toIndex, board.order.length)), [id]);
  });
}

/** Move a set of shapes in the z-stack, preserving their relative order. */
export function reorderShapes(
  board: BoardDoc,
  ids: string[],
  where: "front" | "back" | "forward" | "backward",
): void {
  const sel = new Set(ids);
  board.doc.transact(() => {
    const arr = board.order.toArray();
    let next: string[];
    if (where === "front") {
      next = [...arr.filter((id) => !sel.has(id)), ...arr.filter((id) => sel.has(id))];
    } else if (where === "back") {
      next = [...arr.filter((id) => sel.has(id)), ...arr.filter((id) => !sel.has(id))];
    } else if (where === "forward") {
      next = [...arr];
      for (let i = next.length - 2; i >= 0; i--) {
        if (sel.has(next[i]!) && !sel.has(next[i + 1]!)) [next[i], next[i + 1]] = [next[i + 1]!, next[i]!];
      }
    } else {
      next = [...arr];
      for (let i = 1; i < next.length; i++) {
        if (sel.has(next[i]!) && !sel.has(next[i - 1]!)) [next[i], next[i - 1]] = [next[i - 1]!, next[i]!];
      }
    }
    board.order.delete(0, board.order.length);
    board.order.insert(0, next);
  });
}
