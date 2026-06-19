/**
 * The rotation handle — a small rotate icon above the selected shape (Miro/
 * diagrams.net convention), not a bare circle. Dragging it spins the shape
 * about its centre; Shift snaps to 15°. It follows the shape as it rotates.
 */
"use client";

import { useRef } from "react";
import { RotateCw } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen, screenToWorld } from "./viewport/viewport";
import { applyRotation } from "./geometry/transform";

export function RotateHandle() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const dragging = useUiStore((s) => s.dragging);
  const activeTool = useUiStore((s) => s.activeTool);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);
  const rotating = useRef(false);

  if (activeTool !== "select" || editingId || (dragging && !rotating.current) || selection.length !== 1) return null;
  const shape = shapes.find((s) => s.id === selection[0]);
  if (!shape || shape.type === "connector" || shape.type === "image" || shape.locked) return null;

  // Place below the bottom edge in the shape's rotated frame (clear of the
  // context toolbar, which sits above) so it follows rotation.
  const rot = shape.rotation || 0;
  const off = shape.h / 2 + 40 / viewport.zoom;
  const p = worldToScreen(viewport, {
    x: shape.x + shape.w / 2 - Math.sin(rot) * off,
    y: shape.y + shape.h / 2 + Math.cos(rot) * off,
  });

  const worldAt = (e: React.PointerEvent) => screenToWorld(useUiStore.getState().viewport, { x: e.clientX, y: e.clientY });

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* best-effort */
    }
    rotating.current = true;
    useUiStore.getState().setDragging(true);
  };
  const onMove = (e: React.PointerEvent) => {
    if (!rotating.current) return;
    const s = useBoardStore.getState().getShape(shape.id);
    if (s) useBoardStore.getState().updateShape(shape.id, { rotation: applyRotation(s, worldAt(e), e.shiftKey ? 15 : undefined) });
  };
  const onUp = () => {
    if (!rotating.current) return;
    rotating.current = false;
    useUiStore.getState().setDragging(false);
    useBoardStore.getState().commitHistory();
  };

  return (
    <button
      type="button"
      aria-label="Rotate"
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      className="pointer-events-auto absolute grid size-7 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border border-hairline bg-chrome text-ink-soft shadow-sm transition-transform duration-100 hover:text-ink active:scale-90"
      style={{ left: p.x, top: p.y }}
    >
      <RotateCw className="size-3.5" />
    </button>
  );
}
