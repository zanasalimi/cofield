/**
 * Zustand store for LOCAL UI/tool state only. It never holds shape/document
 * data (that's the Yjs doc) and never holds presence (that's Awareness).
 */
import { create } from "zustand";
import type { ToolId } from "@/canvas/tools/types";
import type { Viewport } from "@/canvas/viewport/viewport";
import { createViewport } from "@/canvas/viewport/viewport";
import type { ConnectionState, Point, Rect, Side } from "@/collab/types";
import type { SnapGuide } from "@/canvas/geometry/snapping";

export interface UiState {
  activeTool: ToolId;
  viewport: Viewport;
  /** local selection (the shared selection tint is published via Awareness) */
  selection: string[];
  /** id of the shape currently being text-edited, or null */
  editingId: string | null;
  /** in-progress connector drag (from a connection dot to the pointer), or null */
  connecting: { from: string; fromSide?: Side; point: Point } | null;
  /** in-progress marquee selection rectangle (world coords), or null */
  marquee: Rect | null;
  /** alignment guide lines shown while dragging, world coords */
  guides: SnapGuide[];
  connection: ConnectionState;

  setActiveTool: (tool: ToolId) => void;
  setViewport: (viewport: Viewport) => void;
  setSelection: (ids: string[]) => void;
  setEditingId: (id: string | null) => void;
  setConnecting: (connecting: { from: string; fromSide?: Side; point: Point } | null) => void;
  setMarquee: (marquee: Rect | null) => void;
  setGuides: (guides: SnapGuide[]) => void;
  setConnection: (state: ConnectionState) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTool: "select",
  viewport: createViewport(),
  selection: [],
  editingId: null,
  connecting: null,
  marquee: null,
  guides: [],
  connection: "connecting",

  setActiveTool: (activeTool) => set({ activeTool }),
  setViewport: (viewport) => set({ viewport }),
  setSelection: (selection) => set({ selection }),
  setEditingId: (editingId) => set({ editingId }),
  setConnecting: (connecting) => set({ connecting }),
  setMarquee: (marquee) => set({ marquee }),
  setGuides: (guides) => set({ guides }),
  setConnection: (connection) => set({ connection }),
}));
