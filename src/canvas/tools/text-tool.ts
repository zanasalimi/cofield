/**
 * Text + sticky tools. Click to place, then enter edit mode. Empty content on
 * blur removes the shape (no orphan empty notes). Concurrent text edits merge
 * character-wise via the CRDT, not last-write-wins.
 */
import type { Tool, ToolContext, ToolEvent, ToolId } from "./types";

export function createTextTool(kind: Extract<ToolId, "text" | "sticky">): Tool {
  return {
    id: kind,
    handle(_event: ToolEvent, _ctx: ToolContext): void {
      // TODO(M2): place on pointerdown, hand off to the editing overlay.
      throw new Error("not implemented");
    },
    cancel(_ctx: ToolContext): void {
      // TODO(M2): if the just-placed shape is still empty, remove it.
    },
  };
}
