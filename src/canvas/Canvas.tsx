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
import type { Point, Shape, ShapeType } from "@/collab/types";

const CURSOR_FOR_TOOL: Record<string, string> = {
  select: "default",
  pan: "grab",
  text: "text",
  sticky: "copy",
};

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

  const viewport = useUiStore((s) => s.viewport);
  const selection = useUiStore((s) => s.selection);
  const activeTool = useUiStore((s) => s.activeTool);
  const shapes = useBoardStore((s) => s.shapes);

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
      updateShape: (id, patch) => useBoardStore.getState().updateShape(id, patch as Partial<Shape>),
      removeShape: (id) => useBoardStore.getState().removeShape(id),
      getShape: (id) => useBoardStore.getState().getShape(id),
      hitTest: (world: Point) => hitTestTopmost(useBoardStore.getState().shapes, world),
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
      const visible = visibleWorldRect(vp, el.clientWidth, el.clientHeight);
      const culled = cullToViewport(useBoardStore.getState().shapes, visible);
      r.render({ shapes: culled, viewport: vp, selection: useUiStore.getState().selection });
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
    const onPointerLeave = () => pubCursor.current(null);

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
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerLeave);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      renderer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  useEffect(scheduleRender, [viewport, selection, shapes, activeTool]);

  return (
    <div className="absolute inset-0">
      <canvas ref={canvasRef} className="block h-full w-full touch-none bg-paper" aria-label="Collaborative canvas" />
      <CursorsLayer presences={presences} viewport={viewport} />
    </div>
  );
}
