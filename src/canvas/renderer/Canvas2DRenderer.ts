/**
 * Canvas2D implementation of Renderer (MVP). Draws the culled shape set with
 * the viewport transform applied here — never in geometry or tools. The world→
 * device transform folds in DPR so the backing store stays crisp on retina.
 */
import type { Renderer, RenderScene } from "./Renderer";
import type { Shape } from "@/collab/types";

const SELECTION_COLOR = "#2D9CDB"; // brand sky

export class Canvas2DRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private dpr = 1;

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  resize(width: number, height: number, dpr: number): void {
    this.dpr = dpr;
    if (this.canvas) {
      this.canvas.width = Math.max(1, Math.round(width * dpr));
      this.canvas.height = Math.max(1, Math.round(height * dpr));
    }
  }

  render(scene: RenderScene): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    const { viewport: vp, shapes, selection } = scene;

    // Clear in device space.
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // World → device: device = (world - vp.xy) * zoom * dpr.
    const s = vp.zoom * this.dpr;
    ctx.setTransform(s, 0, 0, s, -vp.x * s, -vp.y * s);

    for (const shape of shapes) drawShape(ctx, shape);

    if (selection.length) {
      const sel = new Set(selection);
      ctx.lineWidth = 1.5 / vp.zoom; // screen-constant outline
      ctx.strokeStyle = SELECTION_COLOR;
      for (const shape of shapes) {
        if (sel.has(shape.id)) ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
      }
    }
  }

  destroy(): void {
    this.ctx = null;
    this.canvas = null;
  }
}

function withRotation(ctx: CanvasRenderingContext2D, shape: Shape, draw: () => void): void {
  if (!shape.rotation) {
    draw();
    return;
  }
  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(shape.rotation);
  ctx.translate(-cx, -cy);
  draw();
  ctx.restore();
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  const { style } = shape;
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.strokeWidth;

  withRotation(ctx, shape, () => {
    switch (shape.type) {
      case "rect":
        ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
        if (style.strokeWidth > 0) ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
        break;
      case "sticky": {
        ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
        if (shape.content) {
          ctx.fillStyle = "#1A1A1A";
          ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
          ctx.textBaseline = "top";
          ctx.fillText(shape.content, shape.x + 10, shape.y + 10, shape.w - 20);
        }
        break;
      }
      case "ellipse":
        ctx.beginPath();
        ctx.ellipse(
          shape.x + shape.w / 2,
          shape.y + shape.h / 2,
          Math.abs(shape.w / 2),
          Math.abs(shape.h / 2),
          0,
          0,
          Math.PI * 2,
        );
        ctx.fill();
        if (style.strokeWidth > 0) ctx.stroke();
        break;
      case "text":
        ctx.fillStyle = style.stroke;
        ctx.font = "16px ui-sans-serif, system-ui, sans-serif";
        ctx.textBaseline = "top";
        if (shape.content) ctx.fillText(shape.content, shape.x, shape.y, shape.w);
        break;
      case "arrow":
        ctx.beginPath();
        ctx.moveTo(shape.x, shape.y);
        ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
        ctx.stroke();
        break;
      case "draw":
        if (shape.points && shape.points.length >= 4) {
          ctx.beginPath();
          ctx.moveTo(shape.points[0]!, shape.points[1]!);
          for (let i = 2; i < shape.points.length; i += 2) {
            ctx.lineTo(shape.points[i]!, shape.points[i + 1]!);
          }
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.stroke();
        }
        break;
    }
  });
}
