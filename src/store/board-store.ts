/**
 * Board store — the reactive shape cache the renderer reads from. When a Yjs
 * BoardDoc is bound (multiplayer), mutations are written to the document (the
 * source of truth) and the cache is refreshed by the doc observer; unbound, it
 * falls back to a local list (single-player / SSR). The surface is identical
 * either way, so the tools and ToolContext never know which is active.
 */
import { create } from "zustand";
import type { Shape, ShapeType, ShapeStyle, Side } from "@/collab/types";
import {
  addShape as docAddShape,
  updateShape as docUpdateShape,
  removeShape as docRemoveShape,
  type BoardDoc,
} from "@/collab/doc";

let bound: BoardDoc | null = null;
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
  sticky: { fill: "#FF9F1C", stroke: "#1A1A1A", strokeWidth: 0 },
  text: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 0 },
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

export interface BoardState {
  shapes: Shape[];
  addShape: (type: ShapeType, rect: { x: number; y: number; w: number; h: number }) => string;
  addConnector: (from: string, to: string, fromSide?: Side, toSide?: Side) => string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  getShape: (id: string) => Shape | undefined;
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

  bindDoc: (board) => {
    bound = board;
    set({ shapes: [] });
  },
  unbindDoc: () => {
    bound = null;
  },
  _setShapes: (shapes) => set({ shapes }),
}));
