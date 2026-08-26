/**
 * Overlay layers sit inside the canvas surface, not the page, so a pointer
 * event's client coordinates have to lose the surface's own offset before the
 * viewport transform means anything. Skipping that shifts every point down by
 * the height of the app header, which is enough to miss the shape under the
 * cursor entirely.
 */
import type { Point } from "@/collab/types";
import { useUiStore } from "@/store/ui-store";
import { screenToWorld } from "./viewport/viewport";

export function worldAtPointer(surface: Element | null, clientX: number, clientY: number): Point {
  const r = surface?.getBoundingClientRect();
  return screenToWorld(useUiStore.getState().viewport, {
    x: clientX - (r?.left ?? 0),
    y: clientY - (r?.top ?? 0),
  });
}
