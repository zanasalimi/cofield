/**
 * Renders remote multiplayer cursors over the canvas. Driven by Awareness, not
 * the document. Positions glide between throttled samples via a short CSS
 * transition; a user with cursor: null shows nothing; a disconnected user's
 * cursor disappears via Awareness timeout.
 */
"use client";

import { useUiStore } from "@/store/ui-store";
import { worldToScreen } from "@/canvas/viewport/viewport";

/** Subscribes to presence + viewport directly, so remote cursor frames re-render
 *  only this layer — not the whole canvas tree. */
export function CursorsLayer() {
  const presences = useUiStore((s) => s.presences);
  const viewport = useUiStore((s) => s.viewport);
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {presences.map((p) => {
        if (!p.cursor) return null;
        const s = worldToScreen(viewport, p.cursor);
        return (
          <div
            key={p.userId}
            className="absolute left-0 top-0 will-change-transform"
            style={{ transform: `translate(${s.x}px, ${s.y}px)`, transition: "transform 80ms linear" }}
          >
            <svg width="28" height="28" viewBox="0 0 24 24" className="drop-shadow-sm" style={{ color: p.color }} aria-hidden>
              <path
                d="M5.5 3.2 L5.5 18.5 L9.4 14.6 L12.2 20.8 L14.6 19.8 L11.8 13.8 L17.4 13.8 Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.6"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ml-4 -mt-2 inline-block whitespace-nowrap rounded-lg px-2 py-1 text-sm font-semibold text-white shadow-md"
              style={{ backgroundColor: p.color }}
            >
              {p.name}
            </span>
          </div>
        );
      })}
    </div>
  );
}
