/**
 * Tool registry + keyboard-shortcut map. The active tool is held in the UI
 * store (src/store); this module just constructs tools and maps keys to ToolId.
 */
import type { Tool, ToolId } from "./types";
import { createSelectTool } from "./select-tool";
import { createPanTool } from "./pan-tool";
import { createShapeTool } from "./shape-tool";
import { createDrawTool } from "./draw-tool";
import { createTextTool } from "./text-tool";

/** Single-key shortcuts → tool. See docs/FEATURES.md §9. */
export const TOOL_SHORTCUTS: Record<string, ToolId> = {
  v: "select",
  h: "pan",
  r: "rect",
  o: "ellipse",
  l: "arrow",
  p: "draw",
  s: "sticky",
  t: "text",
};

export function createTool(id: ToolId): Tool {
  switch (id) {
    case "select":
      return createSelectTool();
    case "pan":
      return createPanTool();
    case "rect":
    case "ellipse":
    case "arrow":
      return createShapeTool(id);
    case "draw":
      return createDrawTool();
    case "text":
    case "sticky":
      return createTextTool(id);
    default: {
      // exhaustiveness guard
      const _never: never = id;
      throw new Error(`unknown tool: ${String(_never)}`);
    }
  }
}

export type { Tool, ToolId } from "./types";
