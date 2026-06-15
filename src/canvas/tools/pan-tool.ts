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
      // No-op: when the pan tool is active the Canvas drives the viewport
      // directly on drag (same path as holding Space), never the document.
    },
    cancel(_ctx: ToolContext): void {
      // no-op: pan never leaves partial state.
    },
  };
}
