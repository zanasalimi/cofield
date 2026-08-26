/**
 * A small snapshot of the board for the dashboard.
 *
 * The shapes live in the Yjs document on the sync server, whose LevelDB store
 * only opens in one process, so the web app cannot render a board it does not
 * have open. Clients that do have it open produce the picture instead, and it
 * is stored next to the board row.
 *
 * Uses the real renderer, so a thumbnail is the board rather than an impression
 * of it.
 */
import { Canvas2DRenderer } from "./renderer/Canvas2DRenderer";
import { resolveScene } from "./geometry/connectors";
import { unionBounds } from "./geometry/hit-test";
import { fitRect } from "./viewport/viewport";
import type { Shape } from "@/collab/types";

/** Matches the card's aspect ratio, at 2x for retina. */
const WIDTH = 384;
const HEIGHT = 240;
const PADDING = 24;

/**
 * WebP at this quality lands around 6-15KB for a typical board, which is small
 * enough to sit in SQLite and ship inside the dashboard's HTML. Returns null for
 * an empty board so the card can show its placeholder instead of a blank frame.
 */
export function renderBoardThumbnail(shapes: Shape[]): string | null {
  const resolved = resolveScene(shapes);
  const bounds = unionBounds(resolved);
  if (!bounds) return null;

  const board = document.createElement("canvas");
  const renderer = new Canvas2DRenderer();
  renderer.mount(board);
  renderer.resize(WIDTH, HEIGHT, 1);
  renderer.render({
    shapes: resolved,
    viewport: fitRect(bounds, WIDTH, HEIGHT, PADDING),
    selection: [],
  });

  // render() clears to transparent so the page's grid shows through the live
  // canvas. A thumbnail has no page behind it, so composite onto paper.
  const out = document.createElement("canvas");
  out.width = WIDTH;
  out.height = HEIGHT;
  const ctx = out.getContext("2d");
  if (!ctx) return null;
  ctx.fillStyle = "#FAFAF7";
  ctx.fillRect(0, 0, WIDTH, HEIGHT);
  ctx.drawImage(board, 0, 0);

  return out.toDataURL("image/webp", 0.72);
}
