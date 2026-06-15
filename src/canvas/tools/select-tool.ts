/**
 * Select tool: click-select (topmost-wins), additive Shift-select, move by drag,
 * handle-based resize/rotate, and connector creation. When a single shape is
 * selected, pointerdowns near its handles resize/rotate it, near its connection
 * dots start a connector drag, and elsewhere select + move. All math world-space.
 */
import type { Point, Rect } from "@/collab/types";
import type { Tool, ToolContext, ToolEvent } from "./types";
import { handlePoints, applyResize, applyRotation, type ResizeHandle } from "@/canvas/geometry/transform";

const HANDLE_HIT_PX = 11;
const ROT_OFFSET_PX = 22;
const DOT_OFFSET_PX = 14;

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function createSelectTool(): Tool {
  let mode: "move" | "resize" | "rotate" | "connect" | null = null;
  let startWorld: Point | null = null;
  let origins: Map<string, Point> | null = null;
  let resizeHandle: ResizeHandle | null = null;
  let origRect: Rect | null = null;
  let activeId: string | null = null;

  function reset(): void {
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

        // 1) Resize/rotate the selected shape via its handles.
        if (selected.length === 1) {
          const shape = ctx.getShape(selected[0]!);
          if (shape && shape.type !== "connector") {
            const cx = shape.x + shape.w / 2;
            if (dist(event.world, { x: cx, y: shape.y - ROT_OFFSET_PX / vp.zoom }) <= tol) {
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

        // 2) Start a connector from a hovered shape's connection dot — works
        //    whether or not the shape is selected, like Miro.
        const hoveredId = ctx.getHovered();
        if (hoveredId) {
          const hs = ctx.getShape(hoveredId);
          if (hs && hs.type !== "connector") {
            const off = DOT_OFFSET_PX / vp.zoom;
            const hcx = hs.x + hs.w / 2;
            const dots: Point[] = [
              { x: hcx, y: hs.y - off },
              { x: hs.x + hs.w + off, y: hs.y + hs.h / 2 },
              { x: hcx, y: hs.y + hs.h + off },
              { x: hs.x - off, y: hs.y + hs.h / 2 },
            ];
            if (dots.some((d) => dist(event.world, d) <= tol)) {
              mode = "connect";
              activeId = hs.id;
              ctx.setConnecting({ from: hs.id, point: event.world });
              return;
            }
          }
        }

        // 3) Otherwise: select + begin move.
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
        } else if (mode === "connect" && activeId) {
          ctx.setConnecting({ from: activeId, point: event.world });
        }
      } else if (event.kind === "pointerup") {
        if (mode === "connect" && activeId) {
          const target = ctx.hitTest(event.world);
          if (target && target !== activeId) ctx.addConnector(activeId, target);
          ctx.setConnecting(null);
        }
        reset();
      } else if (event.kind === "cancel") {
        ctx.setConnecting(null);
        reset();
      }
    },
    cancel(ctx: ToolContext): void {
      ctx.setConnecting(null);
      reset();
    },
  };
}
