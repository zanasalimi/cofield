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
  connection: ConnectionState;

  setActiveTool: (tool: ToolId) => void;
  setViewport: (viewport: Viewport) => void;
  setSelection: (ids: string[]) => void;
  setConnection: (state: ConnectionState) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTool: "select",
  viewport: createViewport(),
  selection: [],
  connection: "connecting",

  setActiveTool: (activeTool) => set({ activeTool }),
  setViewport: (viewport) => set({ viewport }),
  setSelection: (selection) => set({ selection }),
  setConnection: (connection) => set({ connection }),
}));
