/**
 * The canvas surface. Owns the <canvas> element, wires the Renderer, and routes
 * pointer/keyboard events to pan/zoom. Holds no document data of its own — in M2
 * the local demo shapes are replaced by the Yjs doc, presence by Awareness.
 */
"use client";

import { useEffect, useRef } from "react";
import { Canvas2DRenderer } from "./renderer/Canvas2DRenderer";
import type { Renderer } from "./renderer/Renderer";
import { pan, zoomAt, visibleWorldRect } from "./viewport/viewport";
import { cullToViewport } from "./viewport/culling";
import { useUiStore } from "@/store/ui-store";
import type { Shape } from "@/collab/types";

// M1 placeholder content so pan/zoom has something to move over. Removed in M2
// when shapes come from the Yjs document.
const DEMO_SHAPES: Shape[] = [
  { id: "r1", type: "rect", x: 80, y: 80, w: 220, h: 140, rotation: 0, style: { fill: "#FFE8A3", stroke: "#1A1A1A", strokeWidth: 2 }, createdBy: "seed" },
  { id: "s1", type: "sticky", x: 360, y: 120, w: 180, h: 180, rotation: 0, style: { fill: "#FF9F1C", stroke: "#1A1A1A", strokeWidth: 0 }, content: "drag space to pan,\nctrl+scroll to zoom", createdBy: "seed" },
  { id: "e1", type: "ellipse", x: 120, y: 300, w: 200, h: 120, rotation: 0, style: { fill: "#1FB3A3", stroke: "#0E5750", strokeWidth: 3 }, createdBy: "seed" },
  { id: "t1", type: "text", x: 380, y: 360, w: 320, h: 40, rotation: 0, style: { fill: "#1A1A1A", stroke: "#1A1A1A", strokeWidth: 0 }, content: "Cofield — infinite canvas", createdBy: "seed" },
];

export interface CanvasProps {
  boardId: string;
}

export function Canvas({ boardId }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const spaceDown = useRef(false);
  const panning = useRef(false);

  // Subscribe so the render loop re-runs when the viewport changes.
  const viewport = useUiStore((s) => s.viewport);
  const selection = useUiStore((s) => s.selection);

  // Single rAF-coalesced paint of the culled scene.
  function scheduleRender() {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const r = rendererRef.current;
      const el = canvasRef.current;
      if (!r || !el) return;
      const vp = useUiStore.getState().viewport;
      const visible = visibleWorldRect(vp, el.clientWidth, el.clientHeight);
      const culled = cullToViewport(DEMO_SHAPES, visible);
      r.render({ shapes: culled, viewport: vp, selection: useUiStore.getState().selection });
    });
  }

  // Mount: renderer + resize observer + input listeners (wheel/pointer/keys).
  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const renderer = new Canvas2DRenderer();
    renderer.mount(el);
    rendererRef.current = renderer;

    const { setViewport } = useUiStore.getState();

    const resize = () => {
      renderer.resize(el.clientWidth, el.clientHeight, window.devicePixelRatio || 1);
      scheduleRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const vp = useUiStore.getState().viewport;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        setViewport(zoomAt(vp, anchor, Math.exp(-e.deltaY * 0.0015)));
      } else {
        setViewport({ ...vp, x: vp.x + e.deltaX / vp.zoom, y: vp.y + e.deltaY / vp.zoom });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      if (spaceDown.current || e.button === 1) {
        panning.current = true;
        el.setPointerCapture(e.pointerId);
        el.style.cursor = "grabbing";
      }
    };
    const onPointerMove = (e: PointerEvent) => {
      if (!panning.current) return;
      const vp = useUiStore.getState().viewport;
      setViewport(pan(vp, { x: e.movementX, y: e.movementY }));
    };
    const onPointerUp = (e: PointerEvent) => {
      if (!panning.current) return;
      panning.current = false;
      el.releasePointerCapture(e.pointerId);
      el.style.cursor = spaceDown.current ? "grab" : "default";
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !spaceDown.current) {
        spaceDown.current = true;
        if (!panning.current) el.style.cursor = "grab";
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDown.current = false;
        if (!panning.current) el.style.cursor = "default";
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      ro.disconnect();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      renderer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  // Repaint whenever the observed viewport/selection change.
  useEffect(scheduleRender, [viewport, selection]);

  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none bg-paper"
      aria-label="Collaborative canvas"
    />
  );
}
