/**
 * Text + sticky tools. Click to place a default-sized shape and select it. The
 * editing overlay (type into it, remove-if-empty-on-blur) lands in M6; for now
 * placement seeds default content from the board store.
 */
import type { Tool, ToolContext, ToolEvent, ToolId } from "./types";

const SIZE: Record<"text" | "sticky", { w: number; h: number }> = {
  sticky: { w: 180, h: 180 },
  text: { w: 240, h: 40 },
};

export function createTextTool(kind: Extract<ToolId, "text" | "sticky">): Tool {
  return {
    id: kind,
    handle(event: ToolEvent, ctx: ToolContext): void {
      if (event.kind !== "pointerdown") return;
      const { w, h } = SIZE[kind];
      const id = ctx.addShape(kind, { x: event.world.x, y: event.world.y, w, h });
      ctx.setSelection([id]);
    },
    cancel(): void {
      // No partial state to discard — placement is atomic.
    },
  };
}
