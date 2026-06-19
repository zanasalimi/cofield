/**
 * Freehand (pencil) tool. Captures points during a stroke and keeps the shape's
 * bounds in sync so selection + culling work. Point simplification on commit is
 * an M6 perf concern; for now points are capped to bound document growth.
 */
import type { Point, ShapeStyle } from "@/collab/types";
import type { Tool, ToolContext, ToolEvent } from "./types";
import { useUiStore } from "@/store/ui-store";

/** The brush style for the current pen mode. */
function brushStyle(): ShapeStyle {
  const { penMode, penColor, penSize } = useUiStore.getState();
  if (penMode === "highlighter") {
    return { fill: "transparent", stroke: penColor, strokeWidth: Math.max(8, penSize * 5), opacity: 0.32 };
  }
  return { fill: "transparent", stroke: penColor, strokeWidth: penSize, opacity: 1 };
}

/** Max retained points (guards document growth). */
export const MAX_STROKE_POINTS = 512;

function bounds(points: number[]): { x: number; y: number; w: number; h: number } {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]!);
    maxX = Math.max(maxX, points[i]!);
    minY = Math.min(minY, points[i + 1]!);
    maxY = Math.max(maxY, points[i + 1]!);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function createDrawTool(): Tool {
  let id: string | null = null;
  let points: number[] = [];
  let erasing = false;

  function reset(): void {
    id = null;
    points = [];
    erasing = false;
  }

  function push(world: Point, ctx: ToolContext): void {
    if (!id) return;
    if (points.length < MAX_STROKE_POINTS * 2) points.push(world.x, world.y);
    ctx.updateShape(id, { points: [...points], ...bounds(points) });
  }

  /** Erase any freehand stroke under the cursor. */
  function eraseAt(world: Point, ctx: ToolContext): void {
    const hit = ctx.hitTest(world);
    if (hit && ctx.getShape(hit)?.type === "draw") ctx.removeShape(hit);
  }

  return {
    id: "draw",
    handle(event: ToolEvent, ctx: ToolContext): void {
      if (event.kind === "pointerdown") {
        if (useUiStore.getState().penMode === "eraser") {
          erasing = true;
          eraseAt(event.world, ctx);
          return;
        }
        id = ctx.addShape("draw", { x: event.world.x, y: event.world.y, w: 0, h: 0 });
        points = [event.world.x, event.world.y];
        ctx.updateShape(id, { points: [...points], style: brushStyle() });
      } else if (event.kind === "pointermove") {
        if (erasing) eraseAt(event.world, ctx);
        else push(event.world, ctx);
      } else if (event.kind === "pointerup") {
        if (id && points.length < 4) ctx.removeShape(id); // a dot, not a stroke
        reset();
      } else if (event.kind === "cancel") {
        if (id) ctx.removeShape(id);
        reset();
      }
    },
    cancel(ctx: ToolContext): void {
      if (id) ctx.removeShape(id);
      reset();
    },
  };
}
