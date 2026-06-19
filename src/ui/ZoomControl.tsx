/**
 * Bottom-right zoom controls (Miro convention): a fit-to-content button and a
 * percentage readout that resets to 100% on click.
 */
"use client";

import { Maximize, Download } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { fitRect } from "@/canvas/viewport/viewport";
import { shapeBounds } from "@/canvas/geometry/hit-test";

export function ZoomControl() {
  const zoom = useUiStore((s) => s.viewport.zoom);
  const setViewport = useUiStore((s) => s.setViewport);

  const fitAll = () => {
    const shapes = useBoardStore.getState().shapes.filter((s) => s.type !== "connector");
    if (shapes.length === 0) return;
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const s of shapes) {
      const b = shapeBounds(s);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
    setViewport(fitRect({ x: minX, y: minY, w: maxX - minX, h: maxY - minY }, window.innerWidth, window.innerHeight));
  };

  return (
    <div className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-hairline bg-chrome px-1.5 py-1.5 shadow-toolbar">
      <button
        type="button"
        onClick={() => window.dispatchEvent(new Event("cofield:export"))}
        title="Export PNG (⌘⇧E)"
        className="grid size-11 place-items-center rounded-xl text-ink-soft transition-transform duration-100 hover:bg-ink/5 hover:text-ink active:scale-90"
        aria-label="Export board as PNG"
      >
        <Download className="size-5" />
      </button>
      <button
        type="button"
        onClick={fitAll}
        title="Zoom to fit (Shift+1)"
        className="grid size-11 place-items-center rounded-xl text-ink-soft transition-transform duration-100 hover:bg-ink/5 hover:text-ink active:scale-90"
        aria-label="Zoom to fit"
      >
        <Maximize className="size-5" />
      </button>
      <button
        type="button"
        onClick={() => setViewport({ ...useUiStore.getState().viewport, zoom: 1 })}
        className="rounded-xl px-3 py-1.5 text-base tabular-nums text-ink-soft transition-transform duration-100 hover:bg-ink/5 hover:text-ink active:scale-95"
        aria-label="Reset zoom to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
    </div>
  );
}
