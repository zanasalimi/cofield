/**
 * Renders remote selection highlights ("Sara is editing this shape") tinted in
 * each user's color. Carried on Awareness, never the document. Two users on the
 * same shape layer their tints rather than overwriting.
 */
"use client";

import type { Presence } from "@/collab/types";

export interface SelectionTintsProps {
  presences: Presence[];
}

export function SelectionTints({ presences: _presences }: SelectionTintsProps) {
  // TODO(M4): for each remote selection, outline the shapes in that user's hue.
  return null;
}
