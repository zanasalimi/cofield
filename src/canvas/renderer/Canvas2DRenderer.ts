/**
 * Canvas2D implementation of Renderer (MVP). Draws the culled shape set with
 * the viewport transform applied here — never in geometry or tools.
 * Dirty-rect repaint keeps cursor moves and single-shape nudges cheap.
 */
import type { Renderer, RenderScene } from "./Renderer";

export class Canvas2DRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null;

  mount(_canvas: HTMLCanvasElement): void {
    // TODO(M1): get 2d context, store DPR, set initial transform.
    throw new Error("not implemented");
  }

  resize(_width: number, _height: number, _dpr: number): void {
    // TODO(M1)
    throw new Error("not implemented");
  }

  render(_scene: RenderScene): void {
    // TODO(M1): apply viewport transform, draw each shape by type,
    // then overlay selection box + handles. Dirty-rect in M4.
    throw new Error("not implemented");
  }

  destroy(): void {
    this.ctx = null;
  }
}
