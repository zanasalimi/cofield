/**
 * Renders remote multiplayer cursors over the canvas. Driven by Awareness, not
 * the document. Positions are interpolated between throttled samples; a user
 * with cursor: null shows nothing; a disconnected user's cursor disappears via
 * Awareness timeout.
 */
"use client";

import type { Presence } from "@/collab/types";

export interface CursorsLayerProps {
  presences: Presence[];
}

export function CursorsLayer({ presences: _presences }: CursorsLayerProps) {
  // TODO(M4): map each presence to a colored pointer + name label in screen
  // space; interpolate motion; respect prefers-reduced-motion.
  return null;
}
