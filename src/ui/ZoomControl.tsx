/**
 * Bottom-right zoom controls (Miro convention): a fit-to-content button and a
 * percentage readout that resets to 100% on click.
 */
"use client";

import { Maximize } from "lucide-react";
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
    <div className="pointer-events-auto flex items-center gap-1 rounded-lg border border-hairline bg-chrome px-1 py-1 shadow-toolbar">
      <button
        type="button"
        onClick={fitAll}
        title="Zoom to fit (Shift+1)"
        className="grid size-7 place-items-center rounded-md text-ink-soft transition-transform duration-100 hover:text-ink active:scale-90"
        aria-label="Zoom to fit"
      >
        <Maximize className="size-4" />
      </button>
      <button
        type="button"
        onClick={() => setViewport({ ...useUiStore.getState().viewport, zoom: 1 })}
        className="rounded-md px-2 py-0.5 text-xs tabular-nums text-ink-soft transition-transform duration-100 hover:text-ink active:scale-95"
        aria-label="Reset zoom to 100%"
      >
        {Math.round(zoom * 100)}%
      </button>
    </div>
  );
}
