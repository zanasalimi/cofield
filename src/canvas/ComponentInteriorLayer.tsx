// src/canvas/ComponentInteriorLayer.tsx
"use client";

import { getComponentDef } from "@/canvas/components/registry";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

export function ComponentInteriorLayer() {
  const viewport = useUiStore((s) => s.viewport);
  const selection = useUiStore((s) => s.selection);
  const shapes = useBoardStore((s) => s.shapes);
  const id = selection.length === 1 ? selection[0] : null;
  const shape = id ? shapes.find((s) => s.id === id) : null;
  if (!shape || shape.type !== "component" || !shape.kind) return null;
  const def = getComponentDef(shape.kind);
  if (!def.Interior) return null;

  const tl = worldToScreen(viewport, { x: shape.x, y: shape.y });
  const Interior = def.Interior;
  return (
    <div
      className="pointer-events-auto absolute origin-top-left"
      style={{
        left: tl.x,
        top: tl.y,
        width: shape.w * viewport.zoom,
        height: shape.h * viewport.zoom,
        transform: `scale(${viewport.zoom})`,
        transformOrigin: "top left",
      }}
    >
      <div style={{ width: shape.w, height: shape.h }}>
        <Interior shape={shape} />
      </div>
    </div>
  );
}
