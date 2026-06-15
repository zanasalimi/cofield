/**
 * The canvas surface. Owns the <canvas> element, wires the Renderer, and routes
 * pointer/keyboard events to the active tool. Holds no document data itself —
 * shapes come from the Yjs doc, presence from Awareness, tool/UI from Zustand.
 */
"use client";

import { useEffect, useRef } from "react";
import { Canvas2DRenderer } from "./renderer/Canvas2DRenderer";
import type { Renderer } from "./renderer/Renderer";

export interface CanvasProps {
  boardId: string;
}

export function Canvas({ boardId }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;
    const renderer = new Canvas2DRenderer();
    renderer.mount(el);
    rendererRef.current = renderer;
    // TODO(M1): subscribe to doc + viewport, cull, and drive render frames.
    // TODO(M3): bind the SyncProvider for room `boardId`.
    // TODO(M4): bind Awareness and render the presence layer.
    return () => renderer.destroy();
  }, [boardId]);

  // TODO(M1): pointer/keyboard handlers → active tool (from the UI store).
  return (
    <canvas
      ref={canvasRef}
      className="block h-full w-full touch-none bg-paper"
      aria-label="Collaborative canvas"
    />
  );
}
