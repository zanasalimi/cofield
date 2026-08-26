/**
 * Freehand stroke growth. Every point appended becomes a document update that is
 * encoded and replicated to every peer, so the tool must stop writing once the
 * stroke hits its cap rather than re-sending an unchanged array per pointermove.
 */
import { describe, it, expect, vi } from "vitest";
import { createDrawTool, MAX_STROKE_POINTS } from "@/canvas/tools/draw-tool";
import type { ToolContext } from "@/canvas/tools/types";

function stubContext() {
  const updates: { id: string; patch: Record<string, unknown> }[] = [];
  const ctx = {
    addShape: () => "s1",
    updateShape: (id: string, patch: Record<string, unknown>) => updates.push({ id, patch }),
    removeShape: vi.fn(),
    getShape: () => undefined,
    hitTest: () => null,
  } as unknown as ToolContext;
  return { ctx, updates };
}

const move = (x: number, y: number) =>
  ({ kind: "pointermove", world: { x, y }, mods: { shift: false, alt: false, meta: false } }) as const;

describe("draw tool", () => {
  it("stops writing to the document once the stroke reaches its cap", () => {
    const { ctx, updates } = stubContext();
    const tool = createDrawTool();
    tool.handle({ kind: "pointerdown", world: { x: 0, y: 0 }, mods: { shift: false, alt: false, meta: false } }, ctx);

    const overshoot = 200;
    for (let i = 1; i <= MAX_STROKE_POINTS + overshoot; i++) tool.handle(move(i, i), ctx);

    const written = updates.filter((u) => Array.isArray(u.patch.points));
    const longest = written.at(-1)!.patch.points as number[];
    expect(longest).toHaveLength(MAX_STROKE_POINTS * 2);
    // One write for the initial style/points, then one per accepted point. The
    // overshoot must produce none.
    expect(written.length).toBeLessThanOrEqual(MAX_STROKE_POINTS + 1);
  });

  it("keeps the shape bounds around every point it accepted", () => {
    const { ctx, updates } = stubContext();
    const tool = createDrawTool();
    tool.handle({ kind: "pointerdown", world: { x: 10, y: 10 }, mods: { shift: false, alt: false, meta: false } }, ctx);
    tool.handle(move(90, 40), ctx);
    tool.handle(move(30, 70), ctx);

    const last = updates.at(-1)!.patch;
    expect(last).toMatchObject({ x: 10, y: 10, w: 80, h: 60 });
  });
});
