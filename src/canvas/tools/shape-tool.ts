/**
 * Shape tool: drag-to-create rect / ellipse / arrow. A zero-area drag drops a
 * default-sized shape; rect/ellipse normalize to positive extent on release.
 * Shift-constrain + Alt-from-center land in M6.
 */
import type { Point } from "@/collab/types";
import type { Tool, ToolContext, ToolEvent, ToolId } from "./types";

const DEFAULT_W = 120;
const DEFAULT_H = 80;
const CLICK_EPS = 4;

export function createShapeTool(kind: Extract<ToolId, "rect" | "ellipse" | "arrow">): Tool {
  let id: string | null = null;
  let start: Point | null = null;

  function discard(ctx: ToolContext): void {
    if (id) ctx.removeShape(id);
    id = null;
    start = null;
  }

  return {
    id: kind,
    handle(event: ToolEvent, ctx: ToolContext): void {
      if (event.kind === "pointerdown") {
        start = event.world;
        id = ctx.addShape(kind, { x: event.world.x, y: event.world.y, w: 0, h: 0 });
        ctx.setSelection([id]);
      } else if (event.kind === "pointermove") {
        if (!id || !start) return;
        ctx.updateShape(id, { x: start.x, y: start.y, w: event.world.x - start.x, h: event.world.y - start.y });
      } else if (event.kind === "pointerup") {
        if (!id || !start) return;
        const w = event.world.x - start.x;
        const h = event.world.y - start.y;
        if (Math.abs(w) < CLICK_EPS && Math.abs(h) < CLICK_EPS) {
          ctx.updateShape(id, kind === "arrow" ? { w: DEFAULT_W, h: 0 } : { w: DEFAULT_W, h: DEFAULT_H });
        } else if (kind !== "arrow") {
          ctx.updateShape(id, {
            x: Math.min(start.x, event.world.x),
            y: Math.min(start.y, event.world.y),
            w: Math.abs(w),
            h: Math.abs(h),
          });
        }
        id = null;
        start = null;
      } else if (event.kind === "cancel") {
        discard(ctx);
      }
    },
    cancel(ctx: ToolContext): void {
      discard(ctx);
    },
  };
}
