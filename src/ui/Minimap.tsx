/**
 * Bottom-right minimap: a scaled overview of every shape with a draggable
 * viewport indicator, plus a Fit-to-View / zoom-preset dropdown. Click or drag
 * inside the map to recentre the canvas there. Shapes render as their real
 * outlines with crisp (non-scaling) hairlines so the map reads cleanly at any
 * world scale.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronDown, Maximize } from "lucide-react";
import type { Shape } from "@/collab/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { shapeBounds } from "@/canvas/geometry/hit-test";

const MAP_W = 224;
const MAP_H = 132;

function fillFor(fill: string): string {
  return fill && fill !== "transparent" ? fill : "#E9E9F1";
}

/** One shape drawn as its true outline; hairline stroke stays 1px on screen. */
function MiniShape({ s }: { s: Shape }) {
  const { x, y, w, h } = s;
  const common = {
    fill: fillFor(s.style.fill),
    fillOpacity: 0.92,
    stroke: s.style.stroke,
    strokeWidth: 1,
    vectorEffect: "non-scaling-stroke" as const,
    strokeOpacity: 0.55,
  };
  if (s.type === "ellipse") return <ellipse cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} {...common} />;
  if (s.type === "triangle") return <polygon points={`${x + w / 2},${y} ${x + w},${y + h} ${x},${y + h}`} {...common} />;
  if (s.type === "diamond")
    return <polygon points={`${x + w / 2},${y} ${x + w},${y + h / 2} ${x + w / 2},${y + h} ${x},${y + h / 2}`} {...common} />;
  if (s.type === "star") {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const r = i % 2 === 0 ? 1 : 0.42;
      pts.push(`${x + w / 2 + Math.cos(a) * (w / 2) * r},${y + h / 2 + Math.sin(a) * (h / 2) * r}`);
    }
    return <polygon points={pts.join(" ")} {...common} />;
  }
  return <rect x={x} y={y} width={w} height={h} rx={Math.min(w, h) * 0.14} {...common} />;
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

  // Frame the CONTENT (so shapes fill the map, BrainScape-style); the viewport
  // indicator rides on top and is clipped by the svg if it spills past the edge.
  // With nothing on the board yet, frame the current view instead.
  let minX: number, minY: number, maxX: number, maxY: number;
  if (nodes.length > 0) {
    minX = minY = Infinity;
    maxX = maxY = -Infinity;
    for (const s of nodes) {
      const b = shapeBounds(s);
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.w);
      maxY = Math.max(maxY, b.y + b.h);
    }
  } else {
    minX = viewport.x;
    minY = viewport.y;
    maxX = viewport.x + area.w / viewport.zoom;
    maxY = viewport.y + area.h / viewport.zoom;
  }
  const pad = Math.max((maxX - minX) * 0.12, (maxY - minY) * 0.12, 40);
  minX -= pad;
  minY -= pad;
  maxX += pad;
  maxY += pad;
  let bw = Math.max(1, maxX - minX);
  let bh = Math.max(1, maxY - minY);
  // Match the map's aspect so shapes aren't distorted and clicks map linearly.
  const mapAspect = MAP_W / MAP_H;
  if (bw / bh > mapAspect) {
    const nbh = bw / mapAspect;
    minY -= (nbh - bh) / 2;
    bh = nbh;
  } else {
    const nbw = bh * mapAspect;
    minX -= (nbw - bw) / 2;
    bw = nbw;
  }

  const recenter = (clientX: number, clientY: number) => {
    const svg = svgRef.current;
    if (!svg) return;
    const r = svg.getBoundingClientRect();
    const wx = minX + ((clientX - r.left) / r.width) * bw;
    const wy = minY + ((clientY - r.top) / r.height) * bh;
    setViewport({ ...viewport, x: wx - area.w / (2 * viewport.zoom), y: wy - area.h / (2 * viewport.zoom) });
  };

  const presets: { label: string; run: () => void }[] = [
    { label: "Fit to view", run: () => window.dispatchEvent(new Event("cofield:zoomfit")) },
    { label: "Zoom to 50%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 0.5 }) },
    { label: "Zoom to 100%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 1 }) },
    { label: "Zoom to 200%", run: () => setViewport({ ...useUiStore.getState().viewport, zoom: 2 }) },
  ];

  return (
    <div className="pointer-events-auto relative w-56">
      {/* Dropdown floats above the whole card so it is never clipped. */}
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
        <svg
          ref={svgRef}
          width={MAP_W}
          height={MAP_H}
          viewBox={`${minX} ${minY} ${bw} ${bh}`}
          preserveAspectRatio="xMidYMid meet"
          className="block w-full cursor-pointer bg-[#FBFBFA]"
          onPointerDown={(e) => {
            dragging.current = true;
            (e.currentTarget as Element).setPointerCapture(e.pointerId);
            recenter(e.clientX, e.clientY);
          }}
          onPointerMove={(e) => dragging.current && recenter(e.clientX, e.clientY)}
          onPointerUp={() => (dragging.current = false)}
        >
          {nodes.map((s) => (
            <MiniShape key={s.id} s={s} />
          ))}
          <rect
            x={viewport.x}
            y={viewport.y}
            width={area.w / viewport.zoom}
            height={area.h / viewport.zoom}
            fill="var(--color-primary)"
            fillOpacity={0.07}
            stroke="var(--color-primary)"
            strokeWidth={1.5}
            vectorEffect="non-scaling-stroke"
            rx={4}
          />
        </svg>

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
