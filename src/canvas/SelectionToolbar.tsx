/**
 * Floating context toolbar above a single selected shape (Miro convention).
 * Adapts to the shape: colour swatches for everything, font size / bold / align
 * for text & stickies, and line colour + width for connectors. Hidden while
 * editing text. Positioned in screen space.
 */
"use client";

import { Bold, AlignLeft, AlignCenter, AlignRight, Trash2 } from "lucide-react";
import type { ShapeStyle } from "@/collab/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

const FILL_SWATCHES = ["#FFE8A3", "#FF9F1C", "#BBE5B3", "#BFE3FF", "#FFC2D1", "#D9C2FF", "#A7E8E0", "#FFFFFF"];
const LINE_SWATCHES = ["#37352F", "#1A1A1A", "#4262FF", "#E03E3E", "#0F9D58", "#F59E0B", "#9333EA", "#6B6B66"];
const FONT_SIZES = [14, 20, 28];
const WIDTHS = [2, 3.5, 5];

function btnClass(active = false): string {
  return `grid size-7 place-items-center rounded-lg text-sm transition-transform active:scale-90 ${
    active ? "bg-ink/10 text-ink" : "text-ink-soft hover:bg-ink/5 hover:text-ink"
  }`;
}

export function SelectionToolbar() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);

  if (selection.length !== 1 || editingId) return null;
  const shape = shapes.find((s) => s.id === selection[0]);
  if (!shape) return null;

  const set = (patch: Partial<ShapeStyle>) =>
    useBoardStore.getState().updateShape(shape.id, { style: { ...shape.style, ...patch } });
  const del = () => {
    useBoardStore.getState().removeShape(shape.id);
    useUiStore.getState().setSelection([]);
  };

  const isConnector = shape.type === "connector";
  const isImage = shape.type === "image";
  const isText = shape.type === "text" || shape.type === "sticky";
  const colorKey: keyof ShapeStyle = isText || isConnector || shape.type === "arrow" || shape.type === "draw" ? "stroke" : "fill";
  const swatches = isConnector ? LINE_SWATCHES : FILL_SWATCHES;

  // Anchor: a connector has no body box, so sit above the midpoint of its ends.
  let anchorWorld = { x: shape.x + shape.w / 2, y: shape.y };
  if (isConnector) {
    const a = shapes.find((s) => s.id === shape.from);
    const b = shapes.find((s) => s.id === shape.to);
    if (a && b) {
      anchorWorld = { x: (a.x + a.w / 2 + b.x + b.w / 2) / 2, y: Math.min(a.y, b.y) };
    }
  }
  const anchor = worldToScreen(viewport, anchorWorld);
  const top = Math.max(8, anchor.y - 52);

  return (
    <div
      className="pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-1 rounded-xl border border-hairline bg-chrome px-2 py-1.5 shadow-toolbar"
      style={{ left: anchor.x, top }}
    >
      {isImage
        ? null
        : swatches.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => set({ [colorKey]: c })}
              className="size-5 rounded-full border border-black/10 transition-transform active:scale-90"
              style={{ background: c }}
              aria-label={`Set colour ${c}`}
            />
          ))}

      {isText ? (
        <>
          <div className="mx-1 h-5 w-px bg-hairline" />
          <button
            type="button"
            title="Text size"
            onClick={() => {
              const cur = shape.style.fontSize ?? (shape.type === "text" ? 16 : 14);
              const next = FONT_SIZES[(FONT_SIZES.findIndex((s) => s >= cur) + 1) % FONT_SIZES.length]!;
              set({ fontSize: next });
            }}
            className={btnClass()}
          >
            <span className="text-[13px] font-medium">A</span>
          </button>
          <button type="button" title="Bold" onClick={() => set({ bold: !shape.style.bold })} className={btnClass(shape.style.bold)}>
            <Bold className="size-4" />
          </button>
          <button
            type="button"
            title="Align"
            onClick={() => {
              const order = ["left", "center", "right"] as const;
              const cur = shape.style.align ?? "left";
              set({ align: order[(order.indexOf(cur) + 1) % order.length] });
            }}
            className={btnClass()}
          >
            {shape.style.align === "center" ? (
              <AlignCenter className="size-4" />
            ) : shape.style.align === "right" ? (
              <AlignRight className="size-4" />
            ) : (
              <AlignLeft className="size-4" />
            )}
          </button>
        </>
      ) : null}

      {isConnector ? (
        <>
          <div className="mx-1 h-5 w-px bg-hairline" />
          {WIDTHS.map((w, i) => (
            <button
              key={w}
              type="button"
              title={`Line ${["thin", "medium", "thick"][i]}`}
              onClick={() => set({ strokeWidth: w })}
              className={btnClass(Math.abs((shape.style.strokeWidth ?? 2) - w) < 0.6)}
            >
              <span className="rounded-full bg-current" style={{ width: 14, height: 1 + i * 1.5 }} />
            </button>
          ))}
        </>
      ) : null}

      <div className="mx-1 h-5 w-px bg-hairline" />
      <button type="button" onClick={del} className={btnClass()} aria-label="Delete">
        <Trash2 className="size-4" />
      </button>
    </div>
  );
}
