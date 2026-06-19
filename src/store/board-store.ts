/**
 * Board store — the reactive shape cache the renderer reads from. When a Yjs
 * BoardDoc is bound (multiplayer), mutations are written to the document (the
 * source of truth) and the cache is refreshed by the doc observer; unbound, it
 * falls back to a local list (single-player / SSR). The surface is identical
 * either way, so the tools and ToolContext never know which is active.
 */
import { create } from "zustand";
import type * as Y from "yjs";
import type { Shape, ShapeType, ShapeStyle, Side } from "@/collab/types";
import {
  addShape as docAddShape,
  updateShape as docUpdateShape,
  removeShape as docRemoveShape,
  reorderShapes as docReorderShapes,
  createUndoManager,
  type BoardDoc,
} from "@/collab/doc";

let bound: BoardDoc | null = null;
let undoMgr: Y.UndoManager | null = null;
/** Internal clipboard for copy/paste (snapshots, not live shapes). */
let clipboard: Shape[] = [];
let pasteCount = 0;
let counter = 0;
/**
 * Globally-unique shape id. A plain per-session counter is unsafe: it resets to
 * 0 on reload, so the first shape added to a *persisted* board would reuse an id
 * already in the document and silently overwrite that shape. randomUUID avoids
 * all collisions across sessions and clients.
 */
function nextId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `s_${crypto.randomUUID()}`;
  }
  counter += 1;
  return `s_${Date.now().toString(36)}_${counter.toString(36)}`;
}

const DEFAULT_STYLE: Record<ShapeType, ShapeStyle> = {
  rect: { fill: "#FFE8A3", stroke: "#1A1A1A", strokeWidth: 2 },
  ellipse: { fill: "#BFE3FF", stroke: "#1F5C8B", strokeWidth: 2 },
  triangle: { fill: "#BBE5B3", stroke: "#1A1A1A", strokeWidth: 2 },
  diamond: { fill: "#FFC2D1", stroke: "#1A1A1A", strokeWidth: 2 },
  star: { fill: "#D9C2FF", stroke: "#1A1A1A", strokeWidth: 2 },
  sticky: { fill: "#FF9F1C", stroke: "#1A1A1A", strokeWidth: 0 },
  text: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 0 },
  image: { fill: "transparent", stroke: "transparent", strokeWidth: 0 },
  arrow: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 2 },
  draw: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 3 },
  connector: { fill: "transparent", stroke: "#37352F", strokeWidth: 2.5 },
};

/** Build a fully-formed shape with per-type defaults. */
export function makeShape(type: ShapeType, rect: { x: number; y: number; w: number; h: number }): Shape {
  return {
    id: nextId(),
    type,
    x: rect.x,
    y: rect.y,
    w: rect.w,
    h: rect.h,
    rotation: 0,
    style: DEFAULT_STYLE[type],
    content: type === "sticky" ? "" : type === "text" ? "Text" : undefined,
    createdBy: "me",
  };
}

/** Write a fully-formed shape (used for clone/paste, which carry their own id). */
function putShape(shape: Shape): void {
  if (bound) docAddShape(bound, shape);
  else useBoardStore.setState((s) => ({ shapes: [...s.shapes, shape] }));
}

/**
 * Clone shapes with fresh ids, offset by (dx, dy), as one atomic step. A
 * connector is cloned only when BOTH endpoints are in the set (re-linked to the
 * clones); a connector to an outside shape is dropped, like Miro.
 */
function cloneShapes(sources: Shape[], dx: number, dy: number): string[] {
  const idMap = new Map<string, string>();
  for (const s of sources) idMap.set(s.id, nextId());
  const created: string[] = [];
  const run = () => {
    for (const s of sources) {
      if (s.type === "connector") continue;
      putShape({
        ...s,
        id: idMap.get(s.id)!,
        x: s.x + dx,
        y: s.y + dy,
        style: { ...s.style },
        points: s.points ? s.points.map((v, i) => v + (i % 2 === 0 ? dx : dy)) : undefined,
      });
      created.push(idMap.get(s.id)!);
    }
    for (const s of sources) {
      if (s.type !== "connector" || !s.from || !s.to) continue;
      const nf = idMap.get(s.from);
      const nt = idMap.get(s.to);
      if (!nf || !nt) continue;
      putShape({ ...s, id: idMap.get(s.id)!, from: nf, to: nt, style: { ...s.style } });
      created.push(idMap.get(s.id)!);
    }
  };
  if (bound) bound.doc.transact(run);
  else run();
  return created;
}

export interface BoardState {
  shapes: Shape[];
  addShape: (type: ShapeType, rect: { x: number; y: number; w: number; h: number }) => string;
  addConnector: (from: string, to: string, fromSide?: Side, toSide?: Side) => string;
  /** Add an image shape (src is a data URL or remote URL). */
  addImage: (src: string, rect: { x: number; y: number; w: number; h: number }) => string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  /** Clone shapes in place (fresh ids, small offset); returns the new ids. */
  duplicate: (ids: string[]) => string[];
  /** Snapshot shapes to the clipboard. */
  copy: (ids: string[]) => void;
  /** Paste the clipboard (staggered offset per paste); returns the new ids. */
  paste: () => string[];
  /** Move shapes in the z-stack. */
  reorder: (ids: string[], where: "front" | "back" | "forward" | "backward") => void;
  /** Lock / unlock shapes (locked = not movable). */
  setLocked: (ids: string[], locked: boolean) => void;
  /** Align selected shapes to a shared edge / centre. */
  align: (ids: string[], mode: "left" | "centerH" | "right" | "top" | "middleV" | "bottom") => void;
  /** Evenly distribute selected shapes by centre along an axis. */
  distribute: (ids: string[], axis: "h" | "v") => void;
  getShape: (id: string) => Shape | undefined;
  /** Per-user undo / redo of document edits. */
  undo: () => void;
  redo: () => void;
  /** Close the current undo step so the next edit starts a fresh one. */
  commitHistory: () => void;
  /** Bind/unbind the Yjs document. */
  bindDoc: (board: BoardDoc) => void;
  unbindDoc: () => void;
  /** Replace the cache — called by the doc observer. */
  _setShapes: (shapes: Shape[]) => void;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  shapes: [],

  addShape: (type, rect) => {
    const shape = makeShape(type, rect);
    if (bound) docAddShape(bound, shape);
    else set((s) => ({ shapes: [...s.shapes, shape] }));
    return shape.id;
  },

  addConnector: (from, to, fromSide, toSide) => {
    const shape: Shape = {
      id: nextId(),
      type: "connector",
      x: 0,
      y: 0,
      w: 0,
      h: 0,
      rotation: 0,
      style: DEFAULT_STYLE.connector,
      from,
      to,
      fromSide,
      toSide,
      createdBy: "me",
    };
    if (bound) docAddShape(bound, shape);
    else set((s) => ({ shapes: [...s.shapes, shape] }));
    return shape.id;
  },

  addImage: (src, rect) => {
    const shape: Shape = { ...makeShape("image", rect), src };
    if (bound) docAddShape(bound, shape);
    else set((s) => ({ shapes: [...s.shapes, shape] }));
    return shape.id;
  },

  updateShape: (id, patch) => {
    if (bound) docUpdateShape(bound, id, patch);
    else set((s) => ({ shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) }));
  },

  removeShape: (id) => {
    // Cascade: a connector cannot outlive either endpoint it links.
    const attached = get().shapes.filter((sh) => sh.type === "connector" && (sh.from === id || sh.to === id));
    if (bound) {
      docRemoveShape(bound, id);
      for (const c of attached) docRemoveShape(bound, c.id);
    } else {
      const drop = new Set([id, ...attached.map((c) => c.id)]);
      set((s) => ({ shapes: s.shapes.filter((sh) => !drop.has(sh.id)) }));
    }
  },

  getShape: (id) => get().shapes.find((sh) => sh.id === id),

  duplicate: (ids) => {
    const set = new Set(ids);
    return cloneShapes(
      get().shapes.filter((s) => set.has(s.id)),
      16,
      16,
    );
  },
  copy: (ids) => {
    const set = new Set(ids);
    clipboard = get()
      .shapes.filter((s) => set.has(s.id))
      .map((s) => ({ ...s, style: { ...s.style }, points: s.points ? [...s.points] : undefined }));
    pasteCount = 0;
  },
  paste: () => {
    if (clipboard.length === 0) return [];
    pasteCount += 1;
    return cloneShapes(clipboard, 16 * pasteCount, 16 * pasteCount);
  },
  reorder: (ids, where) => {
    if (bound) docReorderShapes(bound, ids, where);
    else
      set((s) => {
        const sel = new Set(ids);
        const kept = s.shapes.filter((sh) => !sel.has(sh.id));
        const moved = s.shapes.filter((sh) => sel.has(sh.id));
        return { shapes: where === "back" ? [...moved, ...kept] : [...kept, ...moved] };
      });
  },
  setLocked: (ids, locked) => {
    for (const id of ids) get().updateShape(id, { locked });
  },
  align: (ids, mode) => {
    const idset = new Set(ids);
    const sel = get().shapes.filter((s) => idset.has(s.id) && s.type !== "connector" && !s.locked);
    if (sel.length < 2) return;
    const minX = Math.min(...sel.map((s) => s.x));
    const maxX = Math.max(...sel.map((s) => s.x + s.w));
    const minY = Math.min(...sel.map((s) => s.y));
    const maxY = Math.max(...sel.map((s) => s.y + s.h));
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const run = () => {
      for (const s of sel) {
        if (mode === "left") get().updateShape(s.id, { x: minX });
        else if (mode === "right") get().updateShape(s.id, { x: maxX - s.w });
        else if (mode === "centerH") get().updateShape(s.id, { x: cx - s.w / 2 });
        else if (mode === "top") get().updateShape(s.id, { y: minY });
        else if (mode === "bottom") get().updateShape(s.id, { y: maxY - s.h });
        else get().updateShape(s.id, { y: cy - s.h / 2 });
      }
    };
    if (bound) bound.doc.transact(run);
    else run();
  },
  distribute: (ids, axis) => {
    const idset = new Set(ids);
    const sel = get().shapes.filter((s) => idset.has(s.id) && s.type !== "connector" && !s.locked);
    if (sel.length < 3) return;
    const run = () => {
      const sorted = [...sel].sort((a, b) =>
        axis === "h" ? a.x + a.w / 2 - (b.x + b.w / 2) : a.y + a.h / 2 - (b.y + b.h / 2),
      );
      const first = sorted[0]!;
      const last = sorted[sorted.length - 1]!;
      const lo = axis === "h" ? first.x + first.w / 2 : first.y + first.h / 2;
      const hi = axis === "h" ? last.x + last.w / 2 : last.y + last.h / 2;
      const step = (hi - lo) / (sorted.length - 1);
      sorted.forEach((s, i) => {
        const center = lo + step * i;
        if (axis === "h") get().updateShape(s.id, { x: center - s.w / 2 });
        else get().updateShape(s.id, { y: center - s.h / 2 });
      });
    };
    if (bound) bound.doc.transact(run);
    else run();
  },

  undo: () => undoMgr?.undo(),
  redo: () => undoMgr?.redo(),
  commitHistory: () => undoMgr?.stopCapturing(),

  bindDoc: (board) => {
    bound = board;
    undoMgr?.destroy();
    undoMgr = createUndoManager(board);
    set({ shapes: [] });
  },
  unbindDoc: () => {
    bound = null;
    undoMgr?.destroy();
    undoMgr = null;
  },
  _setShapes: (shapes) => set({ shapes }),
}));
