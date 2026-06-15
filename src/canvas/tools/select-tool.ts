/**
 * Select tool: click-select (topmost-wins), marquee multi-select, additive
 * Shift-select, move, and handle-based resize/rotate. All math is world-space
 * and delegated to src/canvas/geometry.
 */
import type { Tool, ToolContext, ToolEvent } from "./types";

export function createSelectTool(): Tool {
  return {
    id: "select",
    handle(_event: ToolEvent, _ctx: ToolContext): void {
      // TODO(M2): hit-test on pointerdown; marquee on empty drag;
      // move/resize/rotate based on what's under the pointer.
      throw new Error("not implemented");
    },
    cancel(_ctx: ToolContext): void {
      // TODO(M2): abandon an in-progress marquee/move without mutating the doc.
    },
  };
}
