/**
 * Pan/hand tool. Also reachable transiently by holding Space from any tool;
 * releasing Space restores the previous tool. Pan never starts a stroke or
 * deselects.
 */
import type { Tool, ToolContext, ToolEvent } from "./types";

export function createPanTool(): Tool {
  return {
    id: "pan",
    handle(_event: ToolEvent, _ctx: ToolContext): void {
      // TODO(M1): drag updates the viewport (owned by the viewport store), not the doc.
      throw new Error("not implemented");
    },
    cancel(_ctx: ToolContext): void {
      // no-op: pan never leaves partial state.
    },
  };
}
