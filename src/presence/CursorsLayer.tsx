/**
 * Renders remote multiplayer cursors over the canvas. Driven by Awareness, not
 * the document. Positions glide between throttled samples via a short CSS
 * transition; a user with cursor: null shows nothing; a disconnected user's
 * cursor disappears via Awareness timeout.
 */
"use client";

import type { Presence } from "@/collab/types";
import type { Viewport } from "@/canvas/viewport/viewport";
import { worldToScreen } from "@/canvas/viewport/viewport";

export interface CursorsLayerProps {
  presences: Presence[];
  viewport: Viewport;
}

export function CursorsLayer({ presences, viewport }: CursorsLayerProps) {
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
            <svg width="20" height="20" viewBox="0 0 24 24" style={{ color: p.color }} aria-hidden>
              <path
                d="M5.5 3.2 L5.5 18.5 L9.4 14.6 L12.2 20.8 L14.6 19.8 L11.8 13.8 L17.4 13.8 Z"
                fill="currentColor"
                stroke="white"
                strokeWidth="1.4"
                strokeLinejoin="round"
              />
            </svg>
            <span
              className="ml-3 -mt-1 inline-block whitespace-nowrap rounded-md px-1.5 py-0.5 text-[11px] font-medium text-white shadow-sm"
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
