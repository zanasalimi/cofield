/**
 * Freehand (pencil) tool. Captures points during a stroke and keeps the shape's
 * bounds in sync so selection + culling work. Point simplification on commit is
 * an M6 perf concern; for now points are capped to bound document growth.
 */
import type { Point } from "@/collab/types";
import type { Tool, ToolContext, ToolEvent } from "./types";

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

  function reset(): void {
    id = null;
    points = [];
  }

  function push(world: Point, ctx: ToolContext): void {
    if (!id) return;
    if (points.length < MAX_STROKE_POINTS * 2) points.push(world.x, world.y);
    ctx.updateShape(id, { points: [...points], ...bounds(points) });
  }

  return {
    id: "draw",
    handle(event: ToolEvent, ctx: ToolContext): void {
      if (event.kind === "pointerdown") {
        id = ctx.addShape("draw", { x: event.world.x, y: event.world.y, w: 0, h: 0 });
        points = [event.world.x, event.world.y];
        ctx.updateShape(id, { points: [...points] });
      } else if (event.kind === "pointermove") {
        push(event.world, ctx);
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
