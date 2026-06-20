/**
 * Export the board to a PNG. Renders every shape (connectors resolved to their
 * live curve) onto an offscreen canvas at 2x, composites it over the paper
 * background, and triggers a download. Self-contained — reads the current shapes
 * from the store and owns its own throwaway renderer.
 */
import type { Shape } from "@/collab/types";
import { useBoardStore } from "@/store/board-store";
import { Canvas2DRenderer } from "./renderer/Canvas2DRenderer";
import { resolveConnector } from "./geometry/connectors";
import { unionBounds } from "./geometry/hit-test";

const PADDING = 40;
const SCALE = 2;

export function exportBoardPng(boardId: string): void {
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

  const b = unionBounds(resolved);
  if (!b) return;
  const wCss = b.w + PADDING * 2;
  const hCss = b.h + PADDING * 2;

  const off = document.createElement("canvas");
  const renderer = new Canvas2DRenderer();
  renderer.mount(off);
  renderer.resize(wCss, hCss, SCALE);
  renderer.render({ shapes: resolved, viewport: { x: b.x - PADDING, y: b.y - PADDING, zoom: 1 }, selection: [] });

  // Composite onto the paper background and download.
  const final = document.createElement("canvas");
  final.width = Math.ceil(wCss * SCALE);
  final.height = Math.ceil(hCss * SCALE);
  const fctx = final.getContext("2d");
  if (!fctx) return;
  fctx.fillStyle = "#FFFFFF";
  fctx.fillRect(0, 0, final.width, final.height);
  fctx.drawImage(off, 0, 0);
  final.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `cofield-${boardId}.png`;
    a.click();
    URL.revokeObjectURL(url);
  }, "image/png");
}
