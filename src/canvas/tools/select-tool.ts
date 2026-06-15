/**
 * Select tool: click-select (topmost-wins), additive Shift-select, move by drag,
 * and handle-based resize/rotate. When a single shape is selected, pointerdowns
 * near its handles begin a resize (corner/edge) or rotation instead of a move.
 * All math is world-space.
 */
import type { Point, Rect } from "@/collab/types";
import type { Tool, ToolContext, ToolEvent } from "./types";
import { handlePoints, applyResize, applyRotation, type ResizeHandle } from "@/canvas/geometry/transform";

const HANDLE_HIT_PX = 11; // screen-space grab radius for a handle
const ROT_OFFSET_PX = 22; // matches the renderer's rotation-handle distance

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createSelectTool(): Tool {
  let mode: "move" | "resize" | "rotate" | null = null;
  let startWorld: Point | null = null;
  let origins: Map<string, Point> | null = null; // move
  let resizeHandle: ResizeHandle | null = null;
  let origRect: Rect | null = null;
  let activeId: string | null = null;

  function end(): void {
    mode = null;
    startWorld = null;
    origins = null;
    resizeHandle = null;
    origRect = null;
    activeId = null;
  }

  return {
    id: "select",
    handle(event: ToolEvent, ctx: ToolContext): void {
      if (event.kind === "pointerdown") {
        const vp = ctx.getViewport();
        const tol = HANDLE_HIT_PX / vp.zoom;
        const selected = ctx.getSelection();

        // Handle/rotation grab on a single selected shape.
        if (selected.length === 1) {
          const shape = ctx.getShape(selected[0]!);
          if (shape) {
            const cx = shape.x + shape.w / 2;
            const rotPt = { x: cx, y: shape.y - ROT_OFFSET_PX / vp.zoom };
            if (dist(event.world, rotPt) <= tol) {
              mode = "rotate";
              activeId = shape.id;
              return;
            }
            const rect: Rect = { x: shape.x, y: shape.y, w: shape.w, h: shape.h };
            const pts = handlePoints(rect);
            for (const h of Object.keys(pts) as ResizeHandle[]) {
              if (dist(event.world, pts[h]) <= tol) {
                mode = "resize";
                resizeHandle = h;
                activeId = shape.id;
                origRect = rect;
                startWorld = event.world;
                return;
              }
            }
          }
        }

        // Otherwise: select + begin move.
        const hit = ctx.hitTest(event.world);
        if (!hit) {
          if (!event.mods.shift) ctx.setSelection([]);
          return;
        }
        const current = ctx.getSelection();
        const next = event.mods.shift
          ? current.includes(hit)
            ? current.filter((id) => id !== hit)
            : [...current, hit]
          : current.includes(hit)
            ? current
            : [hit];
        ctx.setSelection(next);
        mode = "move";
        startWorld = event.world;
        origins = new Map();
        for (const id of next) {
          const s = ctx.getShape(id);
          if (s) origins.set(id, { x: s.x, y: s.y });
        }
      } else if (event.kind === "pointermove") {
        if (mode === "move" && startWorld && origins) {
          const dx = event.world.x - startWorld.x;
          const dy = event.world.y - startWorld.y;
          for (const [id, origin] of origins) ctx.updateShape(id, { x: origin.x + dx, y: origin.y + dy });
        } else if (mode === "resize" && startWorld && origRect && resizeHandle && activeId) {
          const delta = { x: event.world.x - startWorld.x, y: event.world.y - startWorld.y };
          const r = applyResize(origRect, resizeHandle, delta);
          ctx.updateShape(activeId, { x: r.x, y: r.y, w: r.w, h: r.h });
        } else if (mode === "rotate" && activeId) {
          const shape = ctx.getShape(activeId);
          if (shape) ctx.updateShape(activeId, { rotation: applyRotation(shape, event.world, event.mods.shift ? 15 : undefined) });
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
