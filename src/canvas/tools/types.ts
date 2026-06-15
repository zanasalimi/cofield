/**
 * Tool layer types. A tool is a small reducer over pointer/keyboard events.
 * Exactly one tool is active; switching tools cancels any in-progress op so no
 * partial/orphan shape is ever left in the document.
 */
import type { Point } from "@/collab/types";

export type ToolId =
  | "select"
  | "pan"
  | "rect"
  | "ellipse"
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
  updateShape: (id: string, patch: Record<string, unknown>) => void;
  setSelection: (ids: string[]) => void;
  getSelection: () => string[];
}

export interface Tool {
  readonly id: ToolId;
  /** Handle one event; return the next tool state (tools are stateful objects). */
  handle(event: ToolEvent, ctx: ToolContext): void;
  /** Called when switching away — must leave no partial shape. */
  cancel(ctx: ToolContext): void;
}
