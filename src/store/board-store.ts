/**
 * LOCAL board store — the shape list for single-player M1. In M2 this is
 * replaced by the Yjs document (the source of truth); the surface (add/update/
 * remove/shapes) is kept deliberately close to what the Yjs helpers will expose
 * so the swap is mechanical.
 */
import { create } from "zustand";
import type { Shape, ShapeType, ShapeStyle } from "@/collab/types";

let counter = 0;
function nextId(): string {
  counter += 1;
  return `s_${counter.toString(36)}_${counter}`;
}

const DEFAULT_STYLE: Record<ShapeType, ShapeStyle> = {
  rect: { fill: "#FFE8A3", stroke: "#1A1A1A", strokeWidth: 2 },
  ellipse: { fill: "#BFE3FF", stroke: "#1F5C8B", strokeWidth: 2 },
  sticky: { fill: "#FF9F1C", stroke: "#1A1A1A", strokeWidth: 0 },
  text: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 0 },
  arrow: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 2 },
  draw: { fill: "transparent", stroke: "#1A1A1A", strokeWidth: 3 },
};

const SEED: Shape[] = [
  { id: "seed_sticky", type: "sticky", x: 360, y: 120, w: 180, h: 180, rotation: 0, style: DEFAULT_STYLE.sticky, content: "pick a tool,\ndrag to draw", createdBy: "seed" },
  { id: "seed_rect", type: "rect", x: 80, y: 90, w: 220, h: 140, rotation: 0, style: DEFAULT_STYLE.rect, createdBy: "seed" },
];

export interface BoardState {
  shapes: Shape[];
  addShape: (type: ShapeType, rect: { x: number; y: number; w: number; h: number }) => string;
  updateShape: (id: string, patch: Partial<Shape>) => void;
  removeShape: (id: string) => void;
  getShape: (id: string) => Shape | undefined;
}

export const useBoardStore = create<BoardState>((set, get) => ({
  shapes: SEED,

  addShape: (type, rect) => {
    const id = nextId();
    const shape: Shape = {
      id,
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
    set((s) => ({ shapes: [...s.shapes, shape] }));
    return id;
  },

  updateShape: (id, patch) =>
    set((s) => ({ shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, ...patch } : sh)) })),

  removeShape: (id) => set((s) => ({ shapes: s.shapes.filter((sh) => sh.id !== id) })),

  getShape: (id) => get().shapes.find((sh) => sh.id === id),
}));
