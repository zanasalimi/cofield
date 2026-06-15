/**
 * Select tool: click-select (topmost-wins), additive Shift-select, move by drag,
 * handle-based resize/rotate, and connector creation. When a single shape is
 * selected, pointerdowns near its handles resize/rotate it, near its connection
 * dots start a connector drag, and elsewhere select + move. All math world-space.
 */
import type { Point, Rect, Shape, Side } from "@/collab/types";
import type { Tool, ToolContext, ToolEvent } from "./types";
import { handlePoints, applyResize, applyRotation, type ResizeHandle } from "@/canvas/geometry/transform";

const HANDLE_HIT_PX = 11;
const ROT_OFFSET_PX = 22;
const DOT_OFFSET_PX = 14;
/** Connection-dot order, matching the four edges checked below. */
const DOT_SIDES: Side[] = ["top", "right", "bottom", "left"];

function dist(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Side of a shape whose edge midpoint is nearest a world point — the side a user
 *  "selects" by dropping a connector onto it. */
function nearestSide(s: Shape, p: Point): Side {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  const mids: [Side, Point][] = [
    ["top", { x: cx, y: s.y }],
    ["right", { x: s.x + s.w, y: cy }],
    ["bottom", { x: cx, y: s.y + s.h }],
    ["left", { x: s.x, y: cy }],
  ];
  let best: Side = "top";
  let bd = Infinity;
  for (const [side, m] of mids) {
    const d = dist(p, m);
    if (d < bd) {
      bd = d;
      best = side;
    }
  }
  return best;
}

export function createSelectTool(): Tool {
  let mode: "move" | "resize" | "rotate" | "connect" | null = null;
  let startWorld: Point | null = null;
  let origins: Map<string, Point> | null = null;
  let resizeHandle: ResizeHandle | null = null;
  let origRect: Rect | null = null;
  let activeId: string | null = null;
  let connectFromSide: Side | null = null;

  function reset(): void {
    mode = null;
    startWorld = null;
    origins = null;
    resizeHandle = null;
    origRect = null;
    activeId = null;
    connectFromSide = null;
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
            const grabbed = dots.findIndex((d) => dist(event.world, d) <= tol);
            if (grabbed >= 0) {
              mode = "connect";
              activeId = hs.id;
              connectFromSide = DOT_SIDES[grabbed]!;
              ctx.setConnecting({ from: hs.id, fromSide: connectFromSide, point: event.world });
              return;
            }
          }
        }

        // 3) Otherwise: select + begin move.
        const hit = ctx.hitTest(event.world);
        if (!hit) {
          // A bare connector line is selectable (to delete/restyle); it follows
          // its shapes, so there is nothing to move.
          const conn = ctx.hitTestConnector(event.world);
          if (conn) {
            const cur = ctx.getSelection();
            ctx.setSelection(
              event.mods.shift
                ? cur.includes(conn)
                  ? cur.filter((id) => id !== conn)
                  : [...cur, conn]
                : [conn],
            );
          } else if (!event.mods.shift) {
            ctx.setSelection([]);
          }
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
          ctx.setConnecting({ from: activeId, fromSide: connectFromSide ?? undefined, point: event.world });
        }
      } else if (event.kind === "pointerup") {
        if (mode === "connect" && activeId) {
          const target = ctx.hitTest(event.world);
          if (target && target !== activeId) {
            const t = ctx.getShape(target);
            const toSide = t ? nearestSide(t, event.world) : undefined;
            ctx.addConnector(activeId, target, connectFromSide ?? undefined, toSide);
          }
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
