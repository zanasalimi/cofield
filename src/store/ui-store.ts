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
  /** open right-click menu position (screen coords in the canvas wrapper), or null */
  contextMenu: { x: number; y: number } | null;
  /** userId of the presence whose viewport we are following, or null */
  followingId: string | null;
  /** shape currently hovered (drives the DOM connection-point affordance) */
  hoveredId: string | null;
  /** true while a move/resize/pan drag is in progress (hides hover affordances) */
  dragging: boolean;
  connection: ConnectionState;
  /** the local user's identity, mirrored from presence so comments can attribute authors */
  me: { userId: string; name: string; color: string } | null;
  /** true while the comment tool is armed — the next canvas click drops a pin */
  commentMode: boolean;
  /** id of the comment thread currently open, or null */
  openCommentId: string | null;

  setActiveTool: (tool: ToolId) => void;
  setViewport: (viewport: Viewport) => void;
  setSelection: (ids: string[]) => void;
  setEditingId: (id: string | null) => void;
  setConnecting: (connecting: { from: string; fromSide?: Side; point: Point } | null) => void;
  setMarquee: (marquee: Rect | null) => void;
  setGuides: (guides: SnapGuide[]) => void;
  setContextMenu: (menu: { x: number; y: number } | null) => void;
  setFollowing: (userId: string | null) => void;
  setHoveredId: (id: string | null) => void;
  setDragging: (dragging: boolean) => void;
  setConnection: (state: ConnectionState) => void;
  setMe: (me: { userId: string; name: string; color: string } | null) => void;
  setCommentMode: (commentMode: boolean) => void;
  setOpenCommentId: (id: string | null) => void;
}

export const useUiStore = create<UiState>((set) => ({
  activeTool: "select",
  viewport: createViewport(),
  selection: [],
  editingId: null,
  connecting: null,
  marquee: null,
  guides: [],
  contextMenu: null,
  followingId: null,
  hoveredId: null,
  dragging: false,
  connection: "connecting",
  me: null,
  commentMode: false,
  openCommentId: null,

  setActiveTool: (activeTool) => set({ activeTool, commentMode: false }),
  setViewport: (viewport) => set({ viewport }),
  setSelection: (selection) => set({ selection }),
  setEditingId: (editingId) => set({ editingId }),
  setConnecting: (connecting) => set({ connecting }),
  setMarquee: (marquee) => set({ marquee }),
  setGuides: (guides) => set({ guides }),
  setContextMenu: (contextMenu) => set({ contextMenu }),
  setFollowing: (followingId) => set({ followingId }),
  setHoveredId: (hoveredId) => set({ hoveredId }),
  setDragging: (dragging) => set({ dragging }),
  setConnection: (connection) => set({ connection }),
  setMe: (me) => set({ me }),
  setCommentMode: (commentMode) => set({ commentMode }),
  setOpenCommentId: (openCommentId) => set({ openCommentId }),
}));
