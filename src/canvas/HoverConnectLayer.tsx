/**
 * Animated connection points for the hovered shape (DOM, so they can animate).
 * Hovering a point shows a low-opacity ghost of the node a click would create;
 * clicking quick-creates a connected node (and opens it for a label); dragging
 * draws a connector to whatever shape you release on. Replaces the old static
 * canvas-drawn dots.
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, ArrowRight, ArrowDown, ArrowLeft } from "lucide-react";
import type { Shape, ShapeType, Side } from "@/collab/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen, screenToWorld } from "./viewport/viewport";
import { hitTestTopmost } from "./geometry/hit-test";

const ARROW = { top: ArrowUp, right: ArrowRight, bottom: ArrowDown, left: ArrowLeft } as const;

const GAP = 56; // world-space gap to a quick-created node
const SIDES: { side: Side; ux: number; uy: number; ax: number; ay: number }[] = [
  { side: "top", ux: 0, uy: -1, ax: 0.5, ay: 0 },
  { side: "right", ux: 1, uy: 0, ax: 1, ay: 0.5 },
  { side: "bottom", ux: 0, uy: 1, ax: 0.5, ay: 1 },
  { side: "left", ux: -1, uy: 0, ax: 0, ay: 0.5 },
];
function nearestSide(s: Shape, p: { x: number; y: number }): Side {
  const mids: [Side, number, number][] = [
    ["top", s.x + s.w / 2, s.y],
    ["right", s.x + s.w, s.y + s.h / 2],
    ["bottom", s.x + s.w / 2, s.y + s.h],
    ["left", s.x, s.y + s.h / 2],
  ];
  let best: Side = "top";
  let bd = Infinity;
  for (const [side, mx, my] of mids) {
    const d = Math.hypot(p.x - mx, p.y - my);
    if (d < bd) {
      bd = d;
      best = side;
    }
  }
  return best;
}

/** World top-left of the node a quick-create on `side` would produce. */
function ghostRect(shape: Shape, side: Side): { x: number; y: number; w: number; h: number } {
  const w = shape.w;
  const h = shape.h;
  if (side === "right") return { x: shape.x + shape.w + GAP, y: shape.y, w, h };
  if (side === "left") return { x: shape.x - shape.w - GAP, y: shape.y, w, h };
  if (side === "bottom") return { x: shape.x, y: shape.y + shape.h + GAP, w, h };
  return { x: shape.x, y: shape.y - shape.h - GAP, w, h };
}

export function HoverConnectLayer() {
  const hoveredId = useUiStore((s) => s.hoveredId);
  const selection = useUiStore((s) => s.selection);
  const dragging = useUiStore((s) => s.dragging);
  const editingId = useUiStore((s) => s.editingId);
  const activeTool = useUiStore((s) => s.activeTool);
  const viewport = useUiStore((s) => s.viewport);
  const shapes = useBoardStore((s) => s.shapes);
  const [over, setOver] = useState<Side | null>(null);

  // Prefer the selected shape (stable points that don't vanish as you reach for
  // them); otherwise the hovered shape. Hidden during a move/resize/pan drag.
  const targetId = (selection.length === 1 ? selection[0] : null) ?? hoveredId;
  useEffect(() => setOver(null), [targetId]);

  if (activeTool !== "select" || dragging || editingId || !targetId) return null;
  const shape = shapes.find((s) => s.id === targetId);
  if (!shape || shape.type === "connector" || shape.type === "image" || shape.locked) return null;

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {over ? <Ghost shape={shape} side={over} viewport={viewport} /> : null}
      {SIDES.map((s) => {
        const off = 14 / viewport.zoom;
        const pt = worldToScreen(viewport, {
          x: shape.x + shape.w * s.ax + s.ux * off,
          y: shape.y + shape.h * s.ay + s.uy * off,
        });
        return (
          <ConnectPoint
            key={s.side}
            shape={shape}
            side={s.side}
            x={pt.x}
            y={pt.y}
            active={over === s.side}
            onOver={() => setOver(s.side)}
            onOut={() => setOver((o) => (o === s.side ? null : o))}
          />
        );
      })}
    </div>
  );
}

function Ghost({ shape, side, viewport }: { shape: Shape; side: Side; viewport: { x: number; y: number; zoom: number } }) {
  const r = ghostRect(shape, side);
  const tl = worldToScreen(viewport, { x: r.x, y: r.y });
  const w = r.w * viewport.zoom;
  const h = r.h * viewport.zoom;
  return (
    <svg className="animate-pop pointer-events-none absolute" style={{ left: tl.x, top: tl.y }} width={w} height={h} aria-hidden>
      <ShapeOutline type={shape.type} w={w} h={h} />
    </svg>
  );
}

/** A low-opacity dashed outline of a shape type — the clone you'd create. */
function ShapeOutline({ type, w, h }: { type: ShapeType; w: number; h: number }) {
  const props = {
    fill: "rgba(66,98,255,0.08)",
    stroke: "rgba(66,98,255,0.55)",
    strokeWidth: 2,
    strokeDasharray: "5 4",
  };
  const m = 2;
  if (type === "ellipse") return <ellipse cx={w / 2} cy={h / 2} rx={w / 2 - m} ry={h / 2 - m} {...props} />;
  if (type === "triangle") return <polygon points={`${w / 2},${m} ${w - m},${h - m} ${m},${h - m}`} {...props} />;
  if (type === "diamond") return <polygon points={`${w / 2},${m} ${w - m},${h / 2} ${w / 2},${h - m} ${m},${h / 2}`} {...props} />;
  if (type === "star") {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const ang = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? 1 : 0.4;
      pts.push(`${w / 2 + Math.cos(ang) * (w / 2 - m) * rr},${h / 2 + Math.sin(ang) * (h / 2 - m) * rr}`);
    }
    return <polygon points={pts.join(" ")} {...props} />;
  }
  return <rect x={m} y={m} width={w - 2 * m} height={h - 2 * m} rx={8} {...props} />;
}

function ConnectPoint({
  shape,
  side,
  x,
  y,
  active,
  onOver,
  onOut,
}: {
  shape: Shape;
  side: Side;
  x: number;
  y: number;
  active: boolean;
  onOver: () => void;
  onOut: () => void;
}) {
  const start = useRef<{ x: number; y: number } | null>(null);
  const dragging = useRef(false);

  const worldAt = (e: React.PointerEvent) =>
    screenToWorld(useUiStore.getState().viewport, { x: e.clientX, y: e.clientY });

  const onDown = (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      (e.currentTarget as Element).setPointerCapture(e.pointerId);
    } catch {
      /* capture is best-effort */
    }
    start.current = { x: e.clientX, y: e.clientY };
    dragging.current = false;
    useUiStore.getState().setConnecting({ from: shape.id, fromSide: side, point: worldAt(e) });
  };
  const onMove = (e: React.PointerEvent) => {
    if (!start.current) return;
    if (Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > 4) dragging.current = true;
    useUiStore.getState().setConnecting({ from: shape.id, fromSide: side, point: worldAt(e) });
  };
  const onUp = (e: React.PointerEvent) => {
    if (!start.current) return;
    const board = useBoardStore.getState();
    if (dragging.current) {
      const world = worldAt(e);
      const targetId = hitTestTopmost(board.shapes, world);
      const target = targetId && targetId !== shape.id ? board.getShape(targetId) : undefined;
      if (target) board.addConnector(shape.id, target.id, side, nearestSide(target, world));
    } else {
      // Click → create a connected duplicate of the same kind. Text-editable
      // types enter edit mode immediately; components just select (they edit
      // through their own interior, not the text overlay).
      const id = board.quickConnect(shape.id, side);
      if (id) {
        useUiStore.getState().setSelection([id]);
        if (shape.type !== "component" && shape.type !== "image") useUiStore.getState().setEditingId(id);
      }
    }
    board.commitHistory();
    useUiStore.getState().setConnecting(null);
    start.current = null;
    dragging.current = false;
  };

  const handlers = {
    onPointerDown: onDown,
    onPointerMove: onMove,
    onPointerUp: onUp,
    onPointerEnter: onOver,
    onPointerLeave: onOut,
  };

  // Hovered point becomes a prominent blue directional button (click = create a
  // connected copy that way); otherwise a small connection dot (drag = connector).
  if (active) {
    const Arrow = ARROW[side];
    return (
      <button
        type="button"
        aria-label={`Create ${side}`}
        {...handlers}
        className="animate-pop pointer-events-auto absolute grid size-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-[#4262FF] text-white shadow-md transition-transform duration-100 hover:scale-110 active:scale-95"
        style={{ left: x, top: y }}
      >
        <Arrow className="size-5" strokeWidth={2.5} />
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-label={`Connect ${side}`}
      {...handlers}
      className="animate-pop pointer-events-auto absolute size-4 -translate-x-1/2 -translate-y-1/2 cursor-crosshair rounded-full border-2 border-[#4262FF] bg-white shadow-sm transition-transform duration-100 hover:scale-[1.6]"
      style={{ left: x, top: y }}
    />
  );
}
