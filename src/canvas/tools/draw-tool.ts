/**
 * Freehand (pencil) tool. Captures points during a stroke; simplifies the
 * point array on commit to bound document growth. Live stroke renders raw for
 * responsiveness.
 */
import type { Tool, ToolContext, ToolEvent } from "./types";

/** Max retained points after simplification (guards document growth). */
export const MAX_STROKE_POINTS = 512;

export function createDrawTool(): Tool {
  return {
    id: "draw",
    handle(_event: ToolEvent, _ctx: ToolContext): void {
      // TODO(M2): accumulate points on move; simplify + commit on up.
      throw new Error("not implemented");
    },
    cancel(_ctx: ToolContext): void {
      // TODO(M2): drop the in-progress stroke.
    },
  };
}
