/**
 * Tool layer types. A tool is a small reducer over pointer/keyboard events.
 * Exactly one tool is active; switching tools cancels any in-progress op so no
 * partial/orphan shape is ever left in the document.
 */
import type { Point, Rect, Shape, Side } from "@/collab/types";
import type { Viewport } from "@/canvas/viewport/viewport";
import type { SnapGuide } from "@/canvas/geometry/snapping";

export type ToolId =
  | "select"
  | "pan"
  | "rect"
  | "ellipse"
  | "triangle"
  | "diamond"
  | "star"
  | "arrow"
  | "draw"
  | "sticky"
  | "text";

export interface ToolModifiers {
  shift: boolean;
  alt: boolean;
  meta: boolean;
}

export type ToolEvent =
  | { kind: "pointerdown"; world: Point; mods: ToolModifiers }
  | { kind: "pointermove"; world: Point; mods: ToolModifiers }
  | { kind: "pointerup"; world: Point; mods: ToolModifiers }
  | { kind: "cancel" };

/**
 * A tool transitions its own internal state on each event and may emit document
 * commands (add/update/remove shape) and selection changes via the context.
 */
export interface ToolContext {
  addShape: (type: ToolId, rect: { x: number; y: number; w: number; h: number }) => string;
  /** Create a connector linking two shapes, anchored to the given edges. */
  addConnector: (from: string, to: string, fromSide?: Side, toSide?: Side) => string;
  updateShape: (id: string, patch: Record<string, unknown>) => void;
  removeShape: (id: string) => void;
  /** Current plain-object projection of a shape (for reading position during a drag). */
  getShape: (id: string) => Shape | undefined;
  /** Topmost shape id whose body contains the world point, or null. */
  hitTest: (world: Point) => string | null;
  /** Connector whose line passes within a few px of the world point, or null. */
  hitTestConnector: (world: Point) => string | null;
  /** Shape the pointer is hovering (drives hover-to-connect), or null. */
  getHovered: () => string | null;
  /** Current viewport. Tools need the zoom to size screen-space hit tolerances. */
  getViewport: () => Viewport;
  /** Drive the in-progress connector ghost (null clears it). */
  setConnecting: (connecting: { from: string; fromSide?: Side; point: Point } | null) => void;
  /** Drive the in-progress marquee rectangle (null clears it). */
  setMarquee: (rect: Rect | null) => void;
  /** Select every shape intersecting the marquee; unions with `base` when additive. */
  selectInMarquee: (rect: Rect, base: string[], additive: boolean) => void;
  /** Snap a moving bounds box against the other shapes; returns the delta + guides. */
  snapMove: (
    box: Rect,
    excludeIds: string[],
  ) => { dx: number; dy: number; guides: SnapGuide[] };
  /** Set the alignment guide lines to render (empty clears). */
  setGuides: (guides: SnapGuide[]) => void;
  setSelection: (ids: string[]) => void;
  getSelection: () => string[];
  /** Enter (or leave) text editing for a shape. */
  setEditing: (id: string | null) => void;
}

export interface Tool {
  readonly id: ToolId;
  /** Handle one event; return the next tool state (tools are stateful objects). */
  handle(event: ToolEvent, ctx: ToolContext): void;
  /** Called when switching away. Must leave no partial shape. */
  cancel(ctx: ToolContext): void;
}
