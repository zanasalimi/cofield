/**
 * Zustand store for LOCAL UI/tool state only. It never holds shape/document
 * data (that's the Yjs doc) and never holds presence (that's Awareness).
 */
import { create } from "zustand";
import type { ToolId } from "@/canvas/tools/types";
import type { Viewport } from "@/canvas/viewport/viewport";
import { createViewport } from "@/canvas/viewport/viewport";
import type { ConnectionState } from "@/collab/types";

export interface UiState {
  activeTool: ToolId;
  viewport: Viewport;
  /** local selection (the shared selection tint is published via Awareness) */
  selection: string[];
  /** id of the shape currently being text-edited, or null */
  editingId: string | null;
  connection: ConnectionState;

  setActiveTool: (tool: ToolId) => void;
  setViewport: (viewport: Viewport) => void;
  setSelection: (ids: string[]) => void;
  setEditingId: (id: string | null) => void;
  setConnection: (state: ConnectionState) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTool: "select",
  viewport: createViewport(),
  selection: [],
  editingId: null,
  connection: "connecting",

  setActiveTool: (activeTool) => set({ activeTool }),
  setViewport: (viewport) => set({ viewport }),
  setSelection: (selection) => set({ selection }),
  setEditingId: (editingId) => set({ editingId }),
  setConnection: (connection) => set({ connection }),
}));
