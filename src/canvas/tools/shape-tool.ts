/**
 * Shape tool: drag-to-create rect / ellipse / arrow. Shift constrains,
 * Alt draws from center. A zero-area drag drops a default-sized shape;
 * a degenerate line is discarded on release.
 */
import type { Tool, ToolContext, ToolEvent, ToolId } from "./types";

export function createShapeTool(kind: Extract<ToolId, "rect" | "ellipse" | "arrow">): Tool {
  return {
    id: kind,
    handle(_event: ToolEvent, _ctx: ToolContext): void {
      // TODO(M2): begin on pointerdown, live-size on move, commit on up.
      throw new Error("not implemented");
    },
    cancel(_ctx: ToolContext): void {
      // TODO(M2): discard the in-progress shape (never commit a partial).
    },
  };
}
