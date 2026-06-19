/**
 * Bottom-right minimap: a true scaled snapshot of the whole board — the same
 * renderer paints every shape, connector and component into a small canvas — with
 * a draggable viewport indicator and a Fit-to-View / zoom-preset dropdown. Click
 * or drag inside to recentre the canvas there.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { CaretDown as ChevronDown, ArrowsOut as Maximize } from "@phosphor-icons/react";
import type { Shape } from "@/collab/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { Canvas2DRenderer } from "@/canvas/renderer/Canvas2DRenderer";
import { resolveScene } from "@/canvas/geometry/connectors";
import { shapeBounds } from "@/canvas/geometry/hit-test";
import { fitRect, worldToScreen, screenToWorld, type Viewport } from "@/canvas/viewport/viewport";
import "@/canvas/components"; // register component kinds so drawChrome works in the snapshot

const MAP_W = 224;
const MAP_H = 132;

/** A viewport that fits the board's content into the minimap (content-framed). */
function fitContent(shapes: Shape[], view: Viewport, area: { w: number; h: number }): Viewport {
  const nodes = shapes.filter((s) => s.type !== "connector");
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of nodes) {
    const b = shapeBounds(s);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  if (!Number.isFinite(minX)) {
    minX = view.x; minY = view.y; maxX = view.x + area.w / view.zoom; maxY = view.y + area.h / view.zoom;
  }
  return fitRect({ x: minX, y: minY, w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY) }, MAP_W, MAP_H, 14);
}

export function Minimap() {
  const viewport = useUiStore((s) => s.viewport);
  const setViewport = useUiStore((s) => s.setViewport);
  const shapes = useBoardStore((s) => s.shapes);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Canvas2DRenderer | null>(null);
  const dragging = useRef(false);
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const m = () => setArea({ w: window.innerWidth, h: window.innerHeight - 64 });
    m();
    window.addEventListener("resize", m);
    return () => window.removeEventListener("resize", m);
  }, []);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const r = new Canvas2DRenderer();
    r.mount(el);
    r.resize(MAP_W, MAP_H, window.devicePixelRatio || 1);
    rendererRef.current = r;
    return () => {
      r.destroy();
      rendererRef.current = null;
    };
  }, []);

  const fit = fitContent(shapes, viewport, area);

  // Repaint the snapshot whenever the board or framing changes.
  useEffect(() => {
    rendererRef.current?.render({ shapes: resolveScene(shapes), viewport: fit, selection: [] });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shapes, fit.x, fit.y, fit.zoom]);

  const recenter = (clientX: number, clientY: number) => {
    const el = canvasRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const w = screenToWorld(fit, { x: ((clientX - r.left) / r.width) * MAP_W, y: ((clientY - r.top) / r.height) * MAP_H });
    setViewport({ ...viewport, x: w.x - area.w / (2 * viewport.zoom), y: w.y - area.h / (2 * viewport.zoom) });
  };

  // Current view rectangle mapped into minimap CSS coordinates.
  const tl = worldToScreen(fit, { x: viewport.x, y: viewport.y });
  const indW = (area.w / viewport.zoom) * fit.zoom;
  const indH = (area.h / viewport.zoom) * fit.zoom;

  const presets: { label: string; run: () => void }[] = [
    { label: "Fit to view", run: () => window.dispatchEvent(new Event("cofield:zoomfit")) },
    { label: "Zoom to 50%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 0.5 }) },
    { label: "Zoom to 100%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 1 }) },
    { label: "Zoom to 200%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 2 }) },
  ];

  return (
    <div className="pointer-events-auto relative w-56">
      {open ? (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="animate-pop-up absolute bottom-full left-0 right-0 z-20 mb-2 rounded-xl border border-hairline bg-chrome p-1 shadow-toolbar">
            {presets.map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => {
                  p.run();
                  setOpen(false);
                }}
                className="w-full rounded-lg px-2.5 py-2 text-left text-sm text-ink transition-colors hover:bg-ink/5"
              >
                {p.label}
              </button>
            ))}
          </div>
        </>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-hairline bg-chrome shadow-toolbar">
        <div
          className="relative cursor-pointer bg-[#FBFBFA]"
          style={{ height: MAP_H }}
          onPointerDown={(e) => {
            dragging.current = true;
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            recenter(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => dragging.current && recenter(e.clientX, e.clientY)}
          onPointerUp={() => (dragging.current = false)}
        >
          {/* No width/height attributes: the renderer owns the DPR-scaled backing
              store; React-controlled size attrs would reset it every re-render and
              wipe the drawing (blank minimap on HiDPI displays). */}
          <canvas ref={canvasRef} className="block size-full" />
          <div
            className="pointer-events-none absolute rounded-[3px] border-2 border-primary bg-primary/10"
            style={{ left: tl.x, top: tl.y, width: indW, height: indH }}
          />
        </div>

        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between border-t border-hairline px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          <span className="flex items-center gap-2">
            <Maximize className="size-4 text-ink-soft" />
            Fit to View
          </span>
          <ChevronDown className={`size-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
