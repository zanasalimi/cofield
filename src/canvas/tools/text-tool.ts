/**
 * Text + sticky tools. Click to place a default-sized shape, select it, and drop
 * straight into editing so you can type immediately (an empty one is removed on
 * blur — see TextOverlay).
 */
import type { Tool, ToolContext, ToolEvent, ToolId } from "./types";

const SIZE: Record<"text" | "sticky", { w: number; h: number }> = {
  sticky: { w: 180, h: 180 },
  text: { w: 220, h: 44 },
};

export function createTextTool(kind: Extract<ToolId, "text" | "sticky">): Tool {
  let placedId: string | null = null;
  return {
    id: kind,
    handle(event: ToolEvent, ctx: ToolContext): void {
      if (event.kind === "pointerdown") {
        const { w, h } = SIZE[kind];
        // Place anchored at the click point (centred for text feels natural).
        const x = kind === "text" ? event.world.x - w / 2 : event.world.x;
        placedId = ctx.addShape(kind, { x, y: event.world.y, w, h });
        ctx.setSelection([placedId]);
      } else if (event.kind === "pointerup" && placedId) {
        // Enter editing after the click finishes, so the textarea takes focus.
        ctx.setEditing(placedId);
        placedId = null;
      }
    },
    cancel(): void {
      placedId = null;
    },
  };
}
