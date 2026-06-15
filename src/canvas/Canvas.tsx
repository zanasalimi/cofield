/**
 * The canvas surface. Owns the <canvas> element, wires the Renderer, routes
 * pan/zoom, and dispatches pointer/keyboard events to the active tool through a
 * ToolContext. Shapes come from the board store (Yjs-backed via useBoard);
 * presence cursors ride Awareness. Tool/UI state from Zustand.
 */
"use client";

import { useEffect, useRef } from "react";
import { Canvas2DRenderer } from "./renderer/Canvas2DRenderer";
import type { Renderer } from "./renderer/Renderer";
import { pan, zoomAt, screenToWorld, visibleWorldRect } from "./viewport/viewport";
import { cullToViewport } from "./viewport/culling";
import { hitTestTopmost } from "./geometry/hit-test";
import { createTool, TOOL_SHORTCUTS } from "./tools";
import type { Tool, ToolContext, ToolModifiers } from "./tools/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { useBoard } from "@/collab/use-board";
import { CursorsLayer } from "@/presence/CursorsLayer";
import { TextOverlay } from "./TextOverlay";
import { SelectionToolbar } from "./SelectionToolbar";
import type { Point, Shape, ShapeType } from "@/collab/types";

const CURSOR_FOR_TOOL: Record<string, string> = {
  select: "default",
  pan: "grab",
  text: "text",
  sticky: "copy",
};

function center(s: Shape): Point {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

/** Topmost non-connector shape whose body — expanded to include its connection
 *  dots — contains the world point. Drives the hover-to-connect affordance. */
function hoverTest(shapes: Shape[], world: Point, margin: number): string | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i]!;
    if (s.type === "connector") continue;
    if (
      world.x >= s.x - margin &&
      world.x <= s.x + s.w + margin &&
      world.y >= s.y - margin &&
      world.y <= s.y + s.h + margin
    ) {
      return s.id;
    }
  }
  return null;
}

/** Right-angle (elbow) route between two shapes — anchored at the edge midpoints
 *  of whichever sides face each other, with one orthogonal jog between them. This
 *  is how Miro draws relations; a flat [x,y,...] polyline the renderer rounds. */
const ALIGN_EPS = 8; // shapes this close to aligned get a clean straight line

function orthogonalRoute(from: Shape, to: Shape): number[] {
  const acx = from.x + from.w / 2;
  const acy = from.y + from.h / 2;
  const bcx = to.x + to.w / 2;
  const bcy = to.y + to.h / 2;
  const dx = bcx - acx;
  const dy = bcy - acy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Side-by-side: exit left/right.
    const ax = dx >= 0 ? from.x + from.w : from.x;
    const bx = dx >= 0 ? to.x : to.x + to.w;
    // Roughly level → straight line; no zero-length jog to curl.
    if (Math.abs(dy) <= ALIGN_EPS) {
      const y = (acy + bcy) / 2;
      return [ax, y, bx, y];
    }
    const midX = (ax + bx) / 2;
    return [ax, acy, midX, acy, midX, bcy, bx, bcy];
  }
  // Stacked: exit top/bottom.
  const ay = dy >= 0 ? from.y + from.h : from.y;
  const by = dy >= 0 ? to.y : to.y + to.h;
  if (Math.abs(dx) <= ALIGN_EPS) {
    const x = (acx + bcx) / 2;
    return [x, ay, x, by];
  }
  const midY = (ay + by) / 2;
  return [acx, ay, acx, midY, bcx, midY, bcx, by];
}

/** Resolve a connector's live elbow path from its linked shapes; null if dangling. */
function resolveConnector(conn: Shape, byId: Map<string, Shape>): Shape | null {
  if (!conn.from || !conn.to) return null;
  const from = byId.get(conn.from);
  const to = byId.get(conn.to);
  if (!from || !to) return null;
  const points = orthogonalRoute(from, to);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]!);
    maxX = Math.max(maxX, points[i]!);
    minY = Math.min(minY, points[i + 1]!);
    maxY = Math.max(maxY, points[i + 1]!);
  }
  return { ...conn, points, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export interface CanvasProps {
  boardId: string;
}

export function Canvas({ boardId }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const toolRef = useRef<Tool | null>(null);
  const spaceDown = useRef(false);
  const dragMode = useRef<"pan" | "tool" | null>(null);
  const hoveredIdRef = useRef<string | null>(null);

  // Only the chrome that is React-rendered subscribes here (grid, cursors,
  // tool wiring). The canvas itself paints imperatively from store subscriptions
  // below, so dragging a shape/connector never re-renders the React tree.
  const viewport = useUiStore((s) => s.viewport);
  const selection = useUiStore((s) => s.selection);
  const activeTool = useUiStore((s) => s.activeTool);

  // Realtime: doc binding + presence + throttled publishers.
  const { presences, publishCursor, publishSelection } = useBoard(boardId);
  const pubCursor = useRef(publishCursor);
  pubCursor.current = publishCursor;

  // Broadcast selection changes to other clients.
  useEffect(() => {
    publishSelection(selection);
  }, [selection, publishSelection]);

  const ctxRef = useRef<ToolContext>(null as unknown as ToolContext);
  if (!ctxRef.current) {
    ctxRef.current = {
      addShape: (type, rect) => useBoardStore.getState().addShape(type as ShapeType, rect),
      addConnector: (from, to) => useBoardStore.getState().addConnector(from, to),
      updateShape: (id, patch) => useBoardStore.getState().updateShape(id, patch as Partial<Shape>),
      removeShape: (id) => useBoardStore.getState().removeShape(id),
      getShape: (id) => useBoardStore.getState().getShape(id),
      hitTest: (world: Point) => hitTestTopmost(useBoardStore.getState().shapes, world),
      getHovered: () => hoveredIdRef.current,
      getViewport: () => useUiStore.getState().viewport,
      setConnecting: (c) => useUiStore.getState().setConnecting(c),
      setSelection: (ids) => useUiStore.getState().setSelection(ids),
      getSelection: () => useUiStore.getState().selection,
    };
  }

  function scheduleRender() {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const r = rendererRef.current;
      const el = canvasRef.current;
      if (!r || !el) return;
      const vp = useUiStore.getState().viewport;
      const all = useBoardStore.getState().shapes;
      const byId = new Map(all.map((sh) => [sh.id, sh]));
      const resolved: Shape[] = [];
      for (const sh of all) {
        if (sh.type === "connector") {
          const rc = resolveConnector(sh, byId);
          if (rc) resolved.push(rc);
        } else {
          resolved.push(sh);
        }
      }
      const visible = visibleWorldRect(vp, el.clientWidth, el.clientHeight);
      const culled = cullToViewport(resolved, visible);

      const connecting = useUiStore.getState().connecting;
      let ghost: { from: Point; to: Point } | null = null;
      let dropTarget: string | null = null;
      if (connecting) {
        const from = byId.get(connecting.from);
        if (from) ghost = { from: center(from), to: connecting.point };
        const t = hitTestTopmost(all, connecting.point);
        if (t && t !== connecting.from) dropTarget = t;
      }
      // Hover dots only when idle with the select tool (not mid-drag).
      const hovered =
        !dragMode.current && useUiStore.getState().activeTool === "select" ? hoveredIdRef.current : null;
      r.render({
        shapes: culled,
        viewport: vp,
        selection: useUiStore.getState().selection,
        hovered,
        connecting: ghost,
        dropTarget,
      });
    });
  }

  useEffect(() => {
    toolRef.current?.cancel(ctxRef.current);
    toolRef.current = createTool(activeTool);
    const el = canvasRef.current;
    if (el) el.style.cursor = CURSOR_FOR_TOOL[activeTool] ?? "crosshair";
  }, [activeTool]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const renderer = new Canvas2DRenderer();
    renderer.mount(el);
    rendererRef.current = renderer;

    const ctx = ctxRef.current;
    const ui = useUiStore.getState;

    const worldAt = (e: PointerEvent): Point => {
      const rect = el.getBoundingClientRect();
      return screenToWorld(ui().viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const modsOf = (e: PointerEvent): ToolModifiers => ({ shift: e.shiftKey, alt: e.altKey, meta: e.metaKey || e.ctrlKey });

    const resize = () => {
      renderer.resize(el.clientWidth, el.clientHeight, window.devicePixelRatio || 1);
      scheduleRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Paint imperatively: any document or UI change schedules a single rAF
    // repaint. This keeps drags (move/resize/connect) off the React render path.
    const unsubBoard = useBoardStore.subscribe(scheduleRender);
    const unsubUi = useUiStore.subscribe(scheduleRender);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = ui().viewport;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        ui().setViewport(zoomAt(vp, anchor, Math.exp(-e.deltaY * 0.0015)));
      } else {
        ui().setViewport({ ...vp, x: vp.x + e.deltaX / vp.zoom, y: vp.y + e.deltaY / vp.zoom });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      const panRequested = spaceDown.current || e.button === 1 || ui().activeTool === "pan";
      if (panRequested) {
        dragMode.current = "pan";
        el.style.cursor = "grabbing";
        return;
      }
      dragMode.current = "tool";
      toolRef.current?.handle({ kind: "pointerdown", world: worldAt(e), mods: modsOf(e) }, ctx);
    };
    const onPointerMove = (e: PointerEvent) => {
      pubCursor.current(worldAt(e)); // always broadcast the cursor
      if (dragMode.current === "pan") {
        ui().setViewport(pan(ui().viewport, { x: e.movementX, y: e.movementY }));
      } else if (dragMode.current === "tool") {
        toolRef.current?.handle({ kind: "pointermove", world: worldAt(e), mods: modsOf(e) }, ctx);
      } else if (ui().activeTool === "select") {
        // Idle: update the hover affordance (connection dots on the shape under
        // the cursor). Repaint only when the hovered shape actually changes.
        const w = worldAt(e);
        const next = hoverTest(useBoardStore.getState().shapes, w, 18 / ui().viewport.zoom);
        if (next !== hoveredIdRef.current) {
          hoveredIdRef.current = next;
          scheduleRender();
        }
      } else if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
        scheduleRender();
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      el.releasePointerCapture(e.pointerId);
      if (dragMode.current === "pan") {
        el.style.cursor = spaceDown.current || ui().activeTool === "pan" ? "grab" : CURSOR_FOR_TOOL[ui().activeTool] ?? "crosshair";
      } else if (dragMode.current === "tool") {
        toolRef.current?.handle({ kind: "pointerup", world: worldAt(e), mods: modsOf(e) }, ctx);
      }
      dragMode.current = null;
    };
    const onPointerLeave = () => {
      pubCursor.current(null);
      if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
        scheduleRender();
      }
    };
    const onDblClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const world = screenToWorld(ui().viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      const hit = ctx.hitTest(world);
      if (!hit) return;
      const shape = useBoardStore.getState().getShape(hit);
      if (shape && (shape.type === "sticky" || shape.type === "text")) {
        ui().setSelection([hit]);
        ui().setEditingId(hit);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.code === "Space" && !spaceDown.current) {
        spaceDown.current = true;
        if (!dragMode.current) el.style.cursor = "grab";
        return;
      }
      if (e.key === "Escape") {
        toolRef.current?.cancel(ctx);
        ui().setSelection([]);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        for (const id of ui().selection) ctx.removeShape(id);
        ui().setSelection([]);
        return;
      }
      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool && !e.metaKey && !e.ctrlKey) ui().setActiveTool(tool);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDown.current = false;
        if (!dragMode.current) el.style.cursor = CURSOR_FOR_TOOL[ui().activeTool] ?? "crosshair";
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("dblclick", onDblClick);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      ro.disconnect();
      unsubBoard();
      unsubUi();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("dblclick", onDblClick);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      renderer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const dot = 24 * viewport.zoom;
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: "#F7F7F5",
        backgroundImage: "radial-gradient(circle, #d4d3cd 1.1px, transparent 1.2px)",
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${-viewport.x * viewport.zoom}px ${-viewport.y * viewport.zoom}px`,
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none" aria-label="Collaborative canvas" />
      <CursorsLayer presences={presences} viewport={viewport} />
      <TextOverlay />
      <SelectionToolbar />
    </div>
  );
}
