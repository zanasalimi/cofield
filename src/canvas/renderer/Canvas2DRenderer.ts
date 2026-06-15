/**
 * Canvas2D implementation of Renderer. Draws the culled shape set under the
 * world→device transform (DPR folded in for retina crispness), then overlays a
 * Miro-style selection: a thin accent box with eight resize handles and a
 * rotation handle, drawn in screen space so they stay a constant size at any
 * zoom. The dotted background is a CSS layer on the canvas wrapper, not painted
 * here — cheaper and buttery during pan/zoom.
 */
import type { Renderer, RenderScene } from "./Renderer";
import type { Shape } from "@/collab/types";

const SELECT = "#4262FF"; // Miro-like selection blue
const HANDLE = 8; // handle box size, screen px
const ROT_OFFSET = 22; // rotation handle distance above the top edge, screen px

export class Canvas2DRenderer implements Renderer {
  private ctx: CanvasRenderingContext2D | null = null;
  private canvas: HTMLCanvasElement | null = null;
  private dpr = 1;

  mount(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
  }

  resize(_width: number, _height: number, dpr: number): void {
    this.dpr = dpr;
    if (this.canvas && _width > 0) {
      this.canvas.width = Math.max(1, Math.round(_width * dpr));
      this.canvas.height = Math.max(1, Math.round(_height * dpr));
    }
  }

  render(scene: RenderScene): void {
    const ctx = this.ctx;
    const canvas = this.canvas;
    if (!ctx || !canvas) return;

    const { viewport: vp, shapes, selection } = scene;
    const dpr = this.dpr;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height); // transparent — the CSS grid shows through

    // World → device.
    const s = vp.zoom * dpr;
    ctx.setTransform(s, 0, 0, s, -vp.x * s, -vp.y * s);
    for (const shape of shapes) drawShape(ctx, shape);

    // Selection overlay in screen space (constant-size handles).
    if (selection.length === 1) {
      const shape = shapes.find((sh) => sh.id === selection[0]);
      if (shape) drawSelection(ctx, shape, vp.x, vp.y, vp.zoom, dpr);
    } else if (selection.length > 1) {
      ctx.lineWidth = 1.5 / vp.zoom;
      ctx.strokeStyle = SELECT;
      const sel = new Set(selection);
      for (const shape of shapes) if (sel.has(shape.id)) ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
    }
  }

  destroy(): void {
    this.ctx = null;
    this.canvas = null;
  }
}

function drawSelection(
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  vx: number,
  vy: number,
  zoom: number,
  dpr: number,
): void {
  // Work in CSS px (device = css * dpr).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const x = (shape.x - vx) * zoom;
  const y = (shape.y - vy) * zoom;
  const w = shape.w * zoom;
  const h = shape.h * zoom;

  ctx.strokeStyle = SELECT;
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x, y, w, h);

  // Rotation handle: a stem up from the top-center to a circle.
  const cx = x + w / 2;
  ctx.beginPath();
  ctx.moveTo(cx, y);
  ctx.lineTo(cx, y - ROT_OFFSET);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(cx, y - ROT_OFFSET, HANDLE / 2, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.fill();
  ctx.stroke();

  // Eight resize handles: corners + edge midpoints.
  const pts: [number, number][] = [
    [x, y],
    [x + w / 2, y],
    [x + w, y],
    [x + w, y + h / 2],
    [x + w, y + h],
    [x + w / 2, y + h],
    [x, y + h],
    [x, y + h / 2],
  ];
  ctx.fillStyle = "#ffffff";
  for (const [px, py] of pts) {
    ctx.beginPath();
    ctx.rect(px - HANDLE / 2, py - HANDLE / 2, HANDLE, HANDLE);
    ctx.fill();
    ctx.stroke();
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
        ctx.save();
        ctx.shadowColor = "rgba(26,26,26,0.18)";
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 3;
        ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
        ctx.restore();
        if (shape.content) {
          ctx.fillStyle = "#1A1A1A";
          ctx.font = "14px ui-sans-serif, system-ui, sans-serif";
          ctx.textBaseline = "top";
          wrapText(ctx, shape.content, shape.x + 10, shape.y + 10, shape.w - 20, 17);
        }
        break;
      }
      case "ellipse":
        ctx.beginPath();
        ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, Math.abs(shape.w / 2), Math.abs(shape.h / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        if (style.strokeWidth > 0) ctx.stroke();
        break;
      case "text":
        ctx.fillStyle = style.stroke;
        ctx.font = "16px ui-sans-serif, system-ui, sans-serif";
        ctx.textBaseline = "top";
        if (shape.content) wrapText(ctx, shape.content, shape.x, shape.y, shape.w, 19);
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
          for (let i = 2; i < shape.points.length; i += 2) ctx.lineTo(shape.points[i]!, shape.points[i + 1]!);
          ctx.lineJoin = "round";
          ctx.lineCap = "round";
          ctx.stroke();
        }
        break;
    }
  });
}

function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxW: number, lineH: number): void {
  let line = "";
  let cy = y;
  for (const word of text.split(/(\s+)/)) {
    const test = line + word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trimEnd(), x, cy);
      line = word.trimStart();
      cy += lineH;
    } else {
      line = test;
    }
    if (word.includes("\n")) {
      ctx.fillText(line, x, cy);
      line = "";
      cy += lineH;
    }
  }
  if (line) ctx.fillText(line, x, cy);
}
