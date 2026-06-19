/**
 * In-place text editor. While a sticky/text shape is being edited, a textarea
 * is positioned over it (world→screen) and each keystroke writes to the shape's
 * content — so edits sync to other clients live, character by character, through
 * the CRDT. Blur or Escape ends editing.
 */
"use client";

import { useEffect, useRef } from "react";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

export function TextOverlay() {
  const editingId = useUiStore((s) => s.editingId);
  const setEditingId = useUiStore((s) => s.setEditingId);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);
  const ref = useRef<HTMLTextAreaElement>(null);

  const shape = editingId ? shapes.find((s) => s.id === editingId) : undefined;

  useEffect(() => {
    if (editingId && ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, [editingId]);

  if (!shape) return null;

  const pos = worldToScreen(viewport, { x: shape.x, y: shape.y });
  const isSticky = shape.type === "sticky";
  const isText = shape.type === "text";
  const isDiagram = !isSticky && !isText; // rect / ellipse / triangle / diamond / star
  const z = viewport.zoom;
  const fs = (shape.style.fontSize ?? (isText ? 16 : 14)) * z;
  const hpad = (isSticky ? 10 : isDiagram ? 8 : 0) * z;
  // Vertically centre the label inside diagram nodes (single-line baseline).
  const vpad = isDiagram ? Math.max(0, (shape.h * z - fs * 1.25) / 2) : isSticky ? 10 * z : 0;

  return (
    <textarea
      ref={ref}
      value={shape.content ?? ""}
      onChange={(e) => useBoardStore.getState().updateShape(shape.id, { content: e.target.value })}
      onBlur={() => setEditingId(null)}
      onKeyDown={(e) => {
        if (e.key === "Escape") setEditingId(null);
        e.stopPropagation();
      }}
      spellCheck={false}
      className="pointer-events-auto absolute resize-none overflow-hidden border-none bg-transparent outline-none"
      style={{
        left: pos.x,
        top: pos.y,
        width: shape.w * z,
        height: shape.h * z,
        paddingTop: vpad,
        paddingLeft: hpad,
        paddingRight: hpad,
        background: isSticky ? shape.style.fill : "transparent",
        color: isText ? shape.style.stroke || "#1A1A1A" : "#1A1A1A",
        fontSize: fs,
        fontWeight: shape.style.bold ? 600 : 400,
        textAlign: isDiagram ? "center" : shape.style.align ?? "left",
        fontFamily: "ui-sans-serif, system-ui, sans-serif",
        lineHeight: 1.25,
      }}
    />
  );
}
