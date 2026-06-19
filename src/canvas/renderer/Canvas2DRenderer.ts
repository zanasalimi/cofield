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
import { fontStack } from "@/canvas/fonts";

const SELECT = "#4262FF"; // Miro-like selection blue
const HANDLE = 9; // handle box size, screen px
const ROT_OFFSET = 30; // rotation handle distance above the top edge, screen px (clears the connection point)

// Images decode asynchronously; cache the elements and repaint once each loads.
const imageCache = new Map<string, HTMLImageElement>();
let onImageLoad: (() => void) | null = null;

/** Register a callback fired when a lazily-loaded image finishes decoding. */
export function setImageLoadCallback(cb: (() => void) | null): void {
  onImageLoad = cb;
}

function getImage(src: string): HTMLImageElement {
  let img = imageCache.get(src);
  if (!img) {
    img = new Image();
    img.onload = () => onImageLoad?.();
    img.src = src;
    imageCache.set(src, img);
  }
  return img;
}

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

    // Drop-target highlight: the shape a dragged connector would attach to.
    if (scene.dropTarget) {
      const t = shapes.find((sh) => sh.id === scene.dropTarget);
      if (t) {
        const m = 2.5 / vp.zoom;
        ctx.strokeStyle = SELECT;
        ctx.lineWidth = 2.5 / vp.zoom;
        ctx.strokeRect(t.x - m, t.y - m, t.w + 2 * m, t.h + 2 * m);
      }
    }

    // Ghost connector being dragged — a solid preview of the relation it will create.
    if (scene.connecting) {
      ctx.strokeStyle = SELECT;
      ctx.lineWidth = 2;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(scene.connecting.from.x, scene.connecting.from.y);
      ctx.lineTo(scene.connecting.to.x, scene.connecting.to.y);
      ctx.stroke();
      drawArrowhead(ctx, scene.connecting.from.x, scene.connecting.from.y, scene.connecting.to.x, scene.connecting.to.y, SELECT);
    }

    // Connection points are an animated DOM layer (HoverConnectLayer), not here.

    // Alignment guides (screen space, magenta — Miro convention).
    if (scene.guides && scene.guides.length) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = "#F24E9C";
      ctx.lineWidth = 1;
      for (const g of scene.guides) {
        ctx.beginPath();
        if (g.axis === "x") {
          const x = (g.pos - vp.x) * vp.zoom;
          ctx.moveTo(x, (g.start - vp.y) * vp.zoom);
          ctx.lineTo(x, (g.end - vp.y) * vp.zoom);
        } else {
          const y = (g.pos - vp.y) * vp.zoom;
          ctx.moveTo((g.start - vp.x) * vp.zoom, y);
          ctx.lineTo((g.end - vp.x) * vp.zoom, y);
        }
        ctx.stroke();
      }
    }

    // Marquee selection rectangle (screen space).
    if (scene.marquee) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const m = scene.marquee;
      const mx = (m.x - vp.x) * vp.zoom;
      const my = (m.y - vp.y) * vp.zoom;
      const mw = m.w * vp.zoom;
      const mh = m.h * vp.zoom;
      ctx.fillStyle = "rgba(66, 98, 255, 0.08)";
      ctx.fillRect(mx, my, mw, mh);
      ctx.strokeStyle = SELECT;
      ctx.lineWidth = 1;
      ctx.strokeRect(mx, my, mw, mh);
    }

    // Selection overlay in screen space (constant-size handles).
    if (selection.length === 1) {
      const shape = shapes.find((sh) => sh.id === selection[0]);
      if (shape) drawSelection(ctx, shape, vp.x, vp.y, vp.zoom, dpr);
    } else if (selection.length > 1) {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.strokeStyle = SELECT;
      ctx.lineWidth = 1.5;
      const sel = new Set(selection);
      for (const shape of shapes) {
        if (!sel.has(shape.id) || shape.type === "connector") continue;
        ctx.strokeRect((shape.x - vp.x) * vp.zoom, (shape.y - vp.y) * vp.zoom, shape.w * vp.zoom, shape.h * vp.zoom);
      }
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

  // A connector selects as a highlighted line with endpoint handles — no box,
  // resize or rotation handles (its geometry is its two anchored shapes).
  if (shape.type === "connector") {
    const pts = shape.points;
    if (!pts || pts.length < 4) return;
    ctx.strokeStyle = SELECT;
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo((pts[0]! - vx) * zoom, (pts[1]! - vy) * zoom);
    for (let i = 2; i < pts.length; i += 2) ctx.lineTo((pts[i]! - vx) * zoom, (pts[i + 1]! - vy) * zoom);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.lineWidth = 1.5;
    const ends: [number, number][] = [
      [pts[0]!, pts[1]!],
      [pts[pts.length - 2]!, pts[pts.length - 1]!],
    ];
    for (const e of ends) {
      ctx.beginPath();
      ctx.arc((e[0] - vx) * zoom, (e[1] - vy) * zoom, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }
    return;
  }

  // A locked shape shows a muted dashed outline and no handles — it can't be
  // transformed until unlocked.
  if (shape.locked) {
    ctx.strokeStyle = "#9A9A93";
    ctx.lineWidth = 1.5;
    ctx.setLineDash([4, 3]);
    ctx.strokeRect((shape.x - vx) * zoom, (shape.y - vy) * zoom, shape.w * zoom, shape.h * zoom);
    ctx.setLineDash([]);
    return;
  }

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

  // Four corner resize handles (round, Miro-style). Edge midpoints stay free
  // for the connection points, so resizing and relating never conflict.
  const pts: [number, number][] = [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
  ctx.fillStyle = "#ffffff";
  for (const [px, py] of pts) {
    ctx.beginPath();
    ctx.arc(px, py, HANDLE / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
  // Connection points are drawn by the DOM HoverConnectLayer (animated), not here.
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
  const prevAlpha = ctx.globalAlpha;
  if (style.opacity !== undefined && style.opacity < 1) ctx.globalAlpha = Math.max(0, style.opacity);

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
          const fs = style.fontSize ?? 14;
          ctx.fillStyle = style.textColor ?? "#1A1A1A";
          ctx.font = `${style.bold ? "600 " : ""}${fs}px ${fontStack(style.fontFamily)}`;
          ctx.textBaseline = "top";
          wrapText(ctx, shape.content, shape.x + 10, shape.y + 10, shape.w - 20, fs * 1.25, style.align ?? "left");
        }
        break;
      }
      case "ellipse":
        ctx.beginPath();
        ctx.ellipse(shape.x + shape.w / 2, shape.y + shape.h / 2, Math.abs(shape.w / 2), Math.abs(shape.h / 2), 0, 0, Math.PI * 2);
        ctx.fill();
        if (style.strokeWidth > 0) ctx.stroke();
        break;
      case "triangle":
        ctx.beginPath();
        ctx.moveTo(shape.x + shape.w / 2, shape.y);
        ctx.lineTo(shape.x + shape.w, shape.y + shape.h);
        ctx.lineTo(shape.x, shape.y + shape.h);
        ctx.closePath();
        ctx.fill();
        if (style.strokeWidth > 0) ctx.stroke();
        break;
      case "diamond":
        ctx.beginPath();
        ctx.moveTo(shape.x + shape.w / 2, shape.y);
        ctx.lineTo(shape.x + shape.w, shape.y + shape.h / 2);
        ctx.lineTo(shape.x + shape.w / 2, shape.y + shape.h);
        ctx.lineTo(shape.x, shape.y + shape.h / 2);
        ctx.closePath();
        ctx.fill();
        if (style.strokeWidth > 0) ctx.stroke();
        break;
      case "star": {
        const cx = shape.x + shape.w / 2;
        const cy = shape.y + shape.h / 2;
        const outerX = shape.w / 2;
        const outerY = shape.h / 2;
        ctx.beginPath();
        for (let i = 0; i < 10; i++) {
          const ang = -Math.PI / 2 + (i * Math.PI) / 5;
          const rx = i % 2 === 0 ? outerX : outerX * 0.4;
          const ry = i % 2 === 0 ? outerY : outerY * 0.4;
          const px = cx + Math.cos(ang) * rx;
          const py = cy + Math.sin(ang) * ry;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        if (style.strokeWidth > 0) ctx.stroke();
        break;
      }
      case "image": {
        if (shape.src) {
          const img = getImage(shape.src);
          if (img.complete && img.naturalWidth > 0) {
            ctx.drawImage(img, shape.x, shape.y, shape.w, shape.h);
          } else {
            ctx.fillStyle = "#ECECE7";
            ctx.fillRect(shape.x, shape.y, shape.w, shape.h);
          }
        }
        break;
      }
      case "text": {
        const fs = style.fontSize ?? 16;
        ctx.fillStyle = style.textColor ?? style.stroke;
        ctx.font = `${style.bold ? "600 " : ""}${fs}px ${fontStack(style.fontFamily)}`;
        ctx.textBaseline = "top";
        if (shape.content) wrapText(ctx, shape.content, shape.x, shape.y, shape.w, fs * 1.2, style.align ?? "left");
        break;
      }
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
      case "connector":
        if (shape.points && shape.points.length >= 4) {
          const pts = shape.points;
          const n = pts.length;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          // Rounded elbow: line through the waypoints, each interior corner arced.
          ctx.beginPath();
          ctx.moveTo(pts[0]!, pts[1]!);
          for (let i = 2; i < n - 2; i += 2) {
            // Clamp the corner radius to half the shorter adjacent segment so a
            // short jog rounds cleanly instead of curling back on itself.
            const d1 = Math.hypot(pts[i]! - pts[i - 2]!, pts[i + 1]! - pts[i - 1]!);
            const d2 = Math.hypot(pts[i + 2]! - pts[i]!, pts[i + 3]! - pts[i + 1]!);
            const r = Math.min(12, d1 / 2, d2 / 2);
            ctx.arcTo(pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!, r);
          }
          ctx.lineTo(pts[n - 2]!, pts[n - 1]!);
          ctx.stroke();
          drawArrowhead(ctx, pts[n - 4]!, pts[n - 3]!, pts[n - 2]!, pts[n - 1]!, style.stroke);
        }
        break;
    }

    // Centred text label for diagram nodes (diagrams.net style) — every box,
    // ellipse, triangle, diamond and star can hold a label in its middle.
    if (shape.content && LABELLED.has(shape.type)) drawCenteredLabel(ctx, shape);
  });
  ctx.globalAlpha = prevAlpha;
}

/** Shape types that carry a centred label. */
const LABELLED = new Set<Shape["type"]>(["rect", "ellipse", "triangle", "diamond", "star"]);

function drawCenteredLabel(ctx: CanvasRenderingContext2D, shape: Shape): void {
  const fs = shape.style.fontSize ?? 14;
  ctx.fillStyle = shape.style.textColor ?? "#1A1A1A";
  ctx.font = `${shape.style.bold ? "600 " : ""}${fs}px ${fontStack(shape.style.fontFamily)}`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const cx = shape.x + shape.w / 2;
  const cy = shape.y + shape.h / 2;
  const maxW = Math.max(8, shape.w - 16);
  const lineH = fs * 1.25;
  const lines: string[] = [];
  for (const para of (shape.content ?? "").split("\n")) {
    let line = "";
    for (const word of para.split(/\s+/)) {
      if (!word) continue;
      const test = line ? line + " " + word : word;
      if (ctx.measureText(test).width > maxW && line) {
        lines.push(line);
        line = word;
      } else {
        line = test;
      }
    }
    lines.push(line);
  }
  const startY = cy - ((lines.length - 1) * lineH) / 2;
  lines.forEach((ln, i) => ctx.fillText(ln, cx, startY + i * lineH));
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawArrowhead(ctx: CanvasRenderingContext2D, fx: number, fy: number, tx: number, ty: number, color: string): void {
  const angle = Math.atan2(ty - fy, tx - fx);
  const size = 11;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(tx - size * Math.cos(angle - 0.42), ty - size * Math.sin(angle - 0.42));
  ctx.lineTo(tx - size * Math.cos(angle + 0.42), ty - size * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxW: number,
  lineH: number,
  align: "left" | "center" | "right" = "left",
): void {
  ctx.textAlign = align;
  const anchor = align === "center" ? x + maxW / 2 : align === "right" ? x + maxW : x;
  let line = "";
  let cy = y;
  for (const word of text.split(/(\s+)/)) {
    const test = line + word;
    if (ctx.measureText(test).width > maxW && line) {
      ctx.fillText(line.trimEnd(), anchor, cy);
      line = word.trimStart();
      cy += lineH;
    } else {
      line = test;
    }
    if (word.includes("\n")) {
      ctx.fillText(line, anchor, cy);
      line = "";
      cy += lineH;
    }
  }
  if (line) ctx.fillText(line, anchor, cy);
  ctx.textAlign = "left";
}
