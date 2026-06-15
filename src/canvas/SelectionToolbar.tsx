/**
 * The floating context toolbar above a selected shape (Miro convention): swatch
 * colors and delete. Positioned in screen space from the shape's top edge and
 * hidden while editing text or during multi-select.
 */
"use client";

import { Trash2 } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

const SWATCHES = ["#FFE8A3", "#FF9F1C", "#BBE5B3", "#BFE3FF", "#FFC2D1", "#D9C2FF", "#A7E8E0", "#FFFFFF"];

export function SelectionToolbar() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);

  if (selection.length !== 1 || editingId) return null;
  const shape = shapes.find((s) => s.id === selection[0]);
  if (!shape || shape.type === "connector") return null;

  const anchor = worldToScreen(viewport, { x: shape.x + shape.w / 2, y: shape.y });
  const top = Math.max(8, anchor.y - 52);
  const colorKey = shape.type === "text" || shape.type === "arrow" || shape.type === "draw" ? "stroke" : "fill";

  return (
    <div
      className="pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-hairline bg-chrome px-2 py-1.5 shadow-toolbar"
      style={{ left: anchor.x, top }}
    >
      {SWATCHES.map((c) => (
        <button
          key={c}
          type="button"
          onClick={() => useBoardStore.getState().updateShape(shape.id, { style: { ...shape.style, [colorKey]: c } })}
          className="size-5 rounded-full border border-black/10 transition-transform active:scale-90"
          style={{ background: c }}
          aria-label={`Set color ${c}`}
        />
      ))}
      <div className="mx-1 h-5 w-px bg-hairline" />
      <button
        type="button"
        onClick={() => {
          useBoardStore.getState().removeShape(shape.id);
          useUiStore.getState().setSelection([]);
        }}
        className="grid size-7 place-items-center rounded-lg text-ink-soft transition-transform hover:text-ink active:scale-90"
        aria-label="Delete"
      >
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
