// src/canvas/ComponentInteriorLayer.tsx
"use client";

import { useEffect } from "react";
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

  const hasInterior =
    shape?.type === "component" &&
    !!shape.kind &&
    !!getComponentDef(shape.kind)?.Interior;

  // Register the active interior id so scheduleRender can blank canvas text.
  // Effect runs unconditionally (hooks must not be conditional); the value it
  // sets is either the shape id (when an interior is visible) or null.
  const activeId = hasInterior && shape ? shape.id : null;
  useEffect(() => {
    useUiStore.getState().setInteriorId(activeId);
    return () => {
      useUiStore.getState().setInteriorId(null);
    };
  }, [activeId]);

  if (!hasInterior || !shape) return null;

  const def = getComponentDef(shape.kind!);
  const Interior = def.Interior!;
  const tl = worldToScreen(viewport, { x: shape.x, y: shape.y });

  // FIX: the outer div's width/height must be the UNSCALED shape dimensions.
  // transform: scale(zoom) then brings the rendered size up to shape.w*zoom
  // visually. Previously both were set, making the pointer-capture region
  // shape.w * zoom² — at zoom 2 a 360px shape would eat a 720px hit area.
  return (
    <div
      className="pointer-events-auto absolute origin-top-left"
      style={{
        left: tl.x,
        top: tl.y,
        width: shape.w,
        height: shape.h,
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
