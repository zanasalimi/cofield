/**
 * Select tool: click-select (topmost-wins), additive Shift-select, and move by
 * drag. All math is world-space. Marquee + handle resize/rotate land in M6.
 */
import type { Point } from "@/collab/types";
import type { Tool, ToolContext, ToolEvent } from "./types";

export function createSelectTool(): Tool {
  // In-progress move: the world point where the drag began + each moved shape's
  // origin. Null when not dragging.
  let startWorld: Point | null = null;
  let origins: Map<string, Point> | null = null;

  function beginMove(ids: string[], world: Point, ctx: ToolContext): void {
    startWorld = world;
    origins = new Map();
    for (const id of ids) {
      const s = ctx.getShape(id);
      if (s) origins.set(id, { x: s.x, y: s.y });
    }
  }

  function end(): void {
    startWorld = null;
    origins = null;
  }

  return {
    id: "select",
    handle(event: ToolEvent, ctx: ToolContext): void {
      if (event.kind === "pointerdown") {
        const hit = ctx.hitTest(event.world);
        if (!hit) {
          if (!event.mods.shift) ctx.setSelection([]);
          return;
        }
        const current = ctx.getSelection();
        let next: string[];
        if (event.mods.shift) {
          next = current.includes(hit) ? current.filter((id) => id !== hit) : [...current, hit];
        } else {
          next = current.includes(hit) ? current : [hit];
        }
        ctx.setSelection(next);
        beginMove(next, event.world, ctx);
      } else if (event.kind === "pointermove") {
        if (!startWorld || !origins) return;
        const dx = event.world.x - startWorld.x;
        const dy = event.world.y - startWorld.y;
        for (const [id, origin] of origins) {
          ctx.updateShape(id, { x: origin.x + dx, y: origin.y + dy });
        }
      } else if (event.kind === "pointerup" || event.kind === "cancel") {
        end();
      }
    },
    cancel(): void {
      end();
    },
  };
}
