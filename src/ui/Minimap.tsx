/**
 * Bottom-right minimap: a scaled overview of every shape with a draggable
 * viewport indicator, plus a Fit-to-View / zoom-preset dropdown. Click or drag
 * inside the map to recentre the canvas there.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Maximize } from "lucide-react";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { shapeBounds } from "@/canvas/geometry/hit-test";
import { fitRect } from "@/canvas/viewport/viewport";

const MAP_W = 224;
const MAP_H = 132;

function fillFor(fill: string): string {
  return fill && fill !== "transparent" ? fill : "#FFFFFF";
}

export function Minimap() {
  const viewport = useUiStore((s) => s.viewport);
  const setViewport = useUiStore((s) => s.setViewport);
  const shapes = useBoardStore((s) => s.shapes);
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragging = useRef(false);
  const [open, setOpen] = useState(false);
  const [area, setArea] = useState({ w: 1280, h: 720 });

  useEffect(() => {
    const measure = () => setArea({ w: window.innerWidth, h: window.innerHeight - 64 });
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  const nodes = shapes.filter((s) => s.type !== "connector");

  // World bounds = union of shapes and the current viewport, so the indicator is
  // always framed even on an empty area.
  let minX = viewport.x;
  let minY = viewport.y;
  let maxX = viewport.x + area.w / viewport.zoom;
  let maxY = viewport.y + area.h / viewport.zoom;
  for (const s of nodes) {
    const b = shapeBounds(s);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  const pad = Math.max((maxX - minX) * 0.08, 40);
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  const bw = Math.max(1, maxX - minX);
  const bh = Math.max(1, maxY - minY);

  const recenter = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const wx = minX + ((clientX - r.left) / r.width) * bw;
    const wy = minY + ((clientY - r.top) / r.height) * bh;
    setViewport({ ...viewport, x: wx - area.w / (2 * viewport.zoom), y: wy - area.h / (2 * viewport.zoom) });
  };

  const presets: { label: string; run: () => void }[] = [
    {
      label: "Fit to view",
      run: () => {
        if (nodes.length === 0) return;
        setViewport(fitRect({ x: minX + pad, y: minY + pad, w: bw - 2 * pad, h: bh - 2 * pad }, area.w, area.h));
      },
    },
    { label: "Zoom to 50%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 0.5 }) },
    { label: "Zoom to 100%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 1 }) },
    { label: "Zoom to 200%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 2 }) },
  ];

  return (
    <div className="pointer-events-auto w-56 overflow-hidden rounded-2xl border border-hairline bg-chrome shadow-toolbar">
      <svg
        ref={svgRef}
        width={MAP_W}
        height={MAP_H}
        viewBox={`${minX} ${minY} ${bw} ${bh}`}
        preserveAspectRatio="xMidYMid meet"
        className="block w-full cursor-pointer bg-[#FCFCFB]"
        onPointerDown={(e) => {
          dragging.current = true;
          (e.currentTarget as Element).setPointerCapture(e.pointerId);
          recenter(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => dragging.current && recenter(e.clientX, e.clientY)}
        onPointerUp={() => (dragging.current = false)}
      >
        {nodes.map((s) => {
          const b = shapeBounds(s);
          return (
            <rect
              key={s.id}
              x={b.x}
              y={b.y}
              width={b.w}
              height={b.h}
              rx={Math.min(b.w, b.h) * 0.12}
              fill={fillFor(s.style.fill)}
              stroke={s.style.stroke}
              strokeWidth={bw / MAP_W}
            />
          );
        })}
        <rect
          x={viewport.x}
          y={viewport.y}
          width={area.w / viewport.zoom}
          height={area.h / viewport.zoom}
          fill="var(--color-primary)"
          fillOpacity={0.08}
          stroke="var(--color-primary)"
          strokeWidth={(bw / MAP_W) * 1.5}
          rx={(bw / MAP_W) * 2}
        />
      </svg>

      <div className="relative border-t border-hairline">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-ink transition-colors hover:bg-ink/5"
        >
          <span className="flex items-center gap-2">
            <Maximize className="size-4 text-ink-soft" />
            Fit to View
          </span>
          <ChevronDown className={`size-4 text-ink-soft transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
        {open ? (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="animate-pop-up absolute bottom-full left-0 right-0 z-20 mb-1 rounded-xl border border-hairline bg-chrome p-1 shadow-toolbar">
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
      </div>
    </div>
  );
}
