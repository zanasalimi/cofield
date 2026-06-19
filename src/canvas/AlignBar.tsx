/**
 * Floating align / distribute bar shown above a multi-selection (Miro shows
 * these when 2+ objects are selected). Align needs ≥2 shapes, distribute ≥3.
 */
"use client";

import {
  AlignStartVertical,
  AlignCenterVertical,
  AlignEndVertical,
  AlignStartHorizontal,
  AlignCenterHorizontal,
  AlignEndHorizontal,
  AlignHorizontalDistributeCenter,
  AlignVerticalDistributeCenter,
} from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

function Btn({ title, onClick, children }: { title: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="grid size-7 place-items-center rounded-md text-ink-soft transition-transform hover:bg-ink/5 hover:text-ink active:scale-90"
    >
      {children}
    </button>
  );
}

export function AlignBar() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);

  if (editingId || selection.length < 2) return null;
  const sel = new Set(selection);
  const items = shapes.filter((s) => sel.has(s.id) && s.type !== "connector");
  if (items.length < 2) return null;

  const minX = Math.min(...items.map((s) => s.x));
  const maxX = Math.max(...items.map((s) => s.x + s.w));
  const minY = Math.min(...items.map((s) => s.y));
  const anchor = worldToScreen(viewport, { x: (minX + maxX) / 2, y: minY });
  const board = useBoardStore.getState();
  const canDistribute = items.length >= 3;

  return (
    <div
      className="pointer-events-auto absolute z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-xl border border-hairline bg-chrome px-1.5 py-1 shadow-toolbar"
      style={{ left: anchor.x, top: Math.max(8, anchor.y - 48) }}
    >
      <Btn title="Align left" onClick={() => board.align(selection, "left")}><AlignStartVertical className="size-4" /></Btn>
      <Btn title="Align centre" onClick={() => board.align(selection, "centerH")}><AlignCenterVertical className="size-4" /></Btn>
      <Btn title="Align right" onClick={() => board.align(selection, "right")}><AlignEndVertical className="size-4" /></Btn>
      <div className="mx-0.5 h-5 w-px bg-hairline" />
      <Btn title="Align top" onClick={() => board.align(selection, "top")}><AlignStartHorizontal className="size-4" /></Btn>
      <Btn title="Align middle" onClick={() => board.align(selection, "middleV")}><AlignCenterHorizontal className="size-4" /></Btn>
      <Btn title="Align bottom" onClick={() => board.align(selection, "bottom")}><AlignEndHorizontal className="size-4" /></Btn>
      {canDistribute ? (
        <>
          <div className="mx-0.5 h-5 w-px bg-hairline" />
          <Btn title="Distribute horizontally" onClick={() => board.distribute(selection, "h")}>
            <AlignHorizontalDistributeCenter className="size-4" />
          </Btn>
          <Btn title="Distribute vertically" onClick={() => board.distribute(selection, "v")}>
            <AlignVerticalDistributeCenter className="size-4" />
          </Btn>
        </>
      ) : null}
    </div>
  );
}
