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
import type { Shape, ShapeId } from "./types";

export interface BoardDoc {
  doc: Y.Doc;
  shapes: Y.Map<Y.Map<unknown>>;
  order: Y.Array<ShapeId>;
  meta: Y.Map<unknown>;
}

/** Create (or wrap) the typed top-level structures on a Y.Doc. */
export function createBoardDoc(_doc: Y.Doc = new Y.Doc()): BoardDoc {
  // TODO(M3): return the typed handles to shapes / order / meta.
  throw new Error("not implemented");
}

/** Insert a shape as a nested Y.Map and append it to the z-order. */
export function addShape(_board: BoardDoc, _shape: Shape): void {
  // TODO(M3): nested Y.Map per field; push id onto `order` in one transaction.
  throw new Error("not implemented");
}

/** Patch one or more fields of an existing shape (per-field, merge-safe). */
export function updateShape(
  _board: BoardDoc,
  _id: ShapeId,
  _patch: Partial<Shape>,
): void {
  // TODO(M3): set only the changed fields on the shape's nested Y.Map.
  throw new Error("not implemented");
}

/** Remove a shape and its z-order entry (produces a tombstone — expected). */
export function removeShape(_board: BoardDoc, _id: ShapeId): void {
  // TODO(M3)
  throw new Error("not implemented");
}

/** Project a shape's nested Y.Map back to a plain Shape. */
export function readShape(_board: BoardDoc, _id: ShapeId): Shape | null {
  // TODO(M3)
  throw new Error("not implemented");
}

/** Snapshot all shapes in z-order — used by the renderer's cull pass input. */
export function readShapesInOrder(_board: BoardDoc): Shape[] {
  // TODO(M3)
  throw new Error("not implemented");
}

/** Reorder a shape in the z-stack (bring forward / send back / to front/back). */
export function reorderShape(
  _board: BoardDoc,
  _id: ShapeId,
  _toIndex: number,
): void {
  // TODO(M2): mutate the `order` Y.Array.
  throw new Error("not implemented");
}
