/**
 * Canvas2D implementation of Renderer. Draws the culled shape set under the
 * world→device transform (DPR folded in for retina crispness), then overlays a
 * Miro-style selection: a thin accent box with eight resize handles and a
 * rotation handle, drawn in screen space so they stay a constant size at any
 * zoom. The dotted background is a CSS layer on the canvas wrapper, not painted
 * here — cheaper and buttery during pan/zoom.
 */
import type { Renderer, RenderScene } from "./Renderer";
import type { Shape, ShapeStyle } from "@/collab/types";
import { fontStack } from "@/canvas/fonts";
import { getComponentDef } from "@/canvas/components/registry";
import { roundRectPath } from "./shapes-util";

const SELECT = "#4262FF"; // Miro-like selection blue
const HANDLE = 9; // handle box size, screen px

// Images decode asynchronously; cache the elements and repaint once each loads.
const imageCache = new Map<string, HTMLImageElement>();
let onImageLoad: (() => void) | null = null;

// Dev-only: warn once per component kind when drawChrome throws, so genuinely
// broken components surface without spamming every animation frame.
const _warnedKinds = new Set<string>();

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
      drawMarker(ctx, scene.connecting.from.x, scene.connecting.from.y, scene.connecting.to.x, scene.connecting.to.y, "arrow", SELECT);
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
      // Distance pills: the empty px gap to the aligned neighbour (Figma-style).
      for (const g of scene.guides) {
        if (!g.gap) continue;
        const label = `${g.gap.px} px`;
        const gx = (g.gap.x - vp.x) * vp.zoom;
        const gy = (g.gap.y - vp.y) * vp.zoom;
        ctx.font = "600 11px ui-sans-serif, system-ui, sans-serif";
        const tw = ctx.measureText(label).width;
        const padX = 6;
        const w = tw + padX * 2;
        const h = 18;
        ctx.fillStyle = "#F24E9C";
        roundRectPath(ctx, gx - w / 2, gy - h / 2, w, h, 5);
        ctx.fill();
        ctx.fillStyle = "#FFFFFF";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(label, gx, gy + 0.5);
        ctx.textAlign = "left";
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
      if (shape) drawSelection(ctx, shape, vp.x, vp.y, vp.zoom, dpr, scene.editing ?? false);
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
  editing: boolean,
): void {
  // Work in CSS px (device = css * dpr).
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  // While editing text, show only a calm box — no handles or rotation cluttering
  // the shape you're typing in.
  if (editing && shape.type !== "connector") {
    ctx.strokeStyle = SELECT;
    ctx.lineWidth = 1.5;
    ctx.strokeRect((shape.x - vx) * zoom, (shape.y - vy) * zoom, shape.w * zoom, shape.h * zoom);
    return;
  }

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
    if (pts.length >= 8) {
      ctx.bezierCurveTo(
        (pts[2]! - vx) * zoom, (pts[3]! - vy) * zoom,
        (pts[4]! - vx) * zoom, (pts[5]! - vy) * zoom,
        (pts[6]! - vx) * zoom, (pts[7]! - vy) * zoom,
      );
    } else {
      for (let i = 2; i < pts.length; i += 2) ctx.lineTo((pts[i]! - vx) * zoom, (pts[i + 1]! - vy) * zoom);
    }
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

  // The rotation handle is a DOM icon (RotateHandle), drawn elsewhere.

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

/** Canvas dash array for a stroke style, scaled to the line width. */
function dashArray(style: ShapeStyle): number[] {
  const w = Math.max(1, style.strokeWidth || 1);
  if (style.strokeDash === "dashed") return [w * 3, w * 2.2];
  if (style.strokeDash === "dotted") return [0.1, w * 2];
  return [];
}

function drawShape(ctx: CanvasRenderingContext2D, shape: Shape): void {
  const { style } = shape;
  ctx.fillStyle = style.fill;
  ctx.strokeStyle = style.stroke;
  ctx.lineWidth = style.strokeWidth;
  ctx.setLineDash(dashArray(style));
  ctx.lineCap = style.strokeDash === "dotted" ? "round" : "butt";
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
        if (shape.content) drawLabel(ctx, shape.content, shape.x, shape.y, shape.w, shape.h, style, 14, "#1A1A1A", false, 10);
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
        if (shape.content) drawLabel(ctx, shape.content, shape.x, shape.y, shape.w, shape.h, style, 16, style.stroke, false, 0);
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
      case "connector": {
        const p = shape.points;
        if (p && p.length >= 4) {
          const curved = (style.routing ?? "curved") === "curved" && p.length >= 8;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";
          ctx.beginPath();
          ctx.moveTo(p[0]!, p[1]!);
          if (curved) ctx.bezierCurveTo(p[2]!, p[3]!, p[4]!, p[5]!, p[6]!, p[7]!);
          else for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i]!, p[i + 1]!);
          ctx.stroke();
          // Endpoint markers. Default: a plain arrow at the end, none at the start.
          const n = p.length;
          drawMarker(ctx, p[2]!, p[3]!, p[0]!, p[1]!, style.startArrow ?? "none", style.stroke);
          drawMarker(ctx, p[n - 4]!, p[n - 3]!, p[n - 2]!, p[n - 1]!, style.endArrow ?? "arrow", style.stroke);
        }
        break;
      }
        break;
      case "component": {
        try {
          getComponentDef(shape.kind!).drawChrome(ctx, shape, { x: 0, y: 0, zoom: 1 });
        } catch (err) {
          ctx.strokeStyle = shape.style.stroke;
          ctx.lineWidth = shape.style.strokeWidth || 1;
          ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
          if (process.env.NODE_ENV !== "production") {
            const kind = String(shape.kind ?? "unknown");
            if (!_warnedKinds.has(kind)) {
              _warnedKinds.add(kind);
              console.warn(`[Canvas2DRenderer] drawChrome failed for component kind "${kind}":`, err);
            }
          }
        }
        break;
      }
    }

    // Centred text label for diagram nodes (diagrams.net style) — every box,
    // ellipse, triangle, diamond and star can hold a label in its middle. Reset
    // the dash so underline/strike text never inherits the border pattern.
    ctx.setLineDash([]);
    if (shape.content && LABELLED.has(shape.type))
      drawLabel(ctx, shape.content, shape.x, shape.y, shape.w, shape.h, style, 14, "#1A1A1A", true, 8);
  });
  ctx.globalAlpha = prevAlpha;
  ctx.setLineDash([]);
}

/** Shape types that carry a centred label. */
const LABELLED = new Set<Shape["type"]>(["rect", "ellipse", "triangle", "diamond", "star"]);

/** Wrap text to lines that fit `maxW`, honouring explicit newlines. */
function wrapLines(ctx: CanvasRenderingContext2D, content: string, maxW: number): string[] {
  const lines: string[] = [];
  for (const para of content.split("\n")) {
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
  return lines;
}

/**
 * Draw a shape's text label with full typography: font family, bold/italic,
 * colour, horizontal + vertical alignment, and underline/strikethrough. `centred`
 * nodes default to centre/middle; text/sticky default to left/top.
 */
function drawLabel(
  ctx: CanvasRenderingContext2D,
  content: string,
  x: number,
  y: number,
  w: number,
  h: number,
  style: ShapeStyle,
  defaultSize: number,
  defaultColor: string,
  centred: boolean,
  pad: number,
): void {
  const fs = style.fontSize ?? defaultSize;
  const lineH = fs * 1.3;
  const color = style.textColor ?? defaultColor;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1, fs / 14);
  ctx.font = `${style.italic ? "italic " : ""}${style.bold ? "600 " : ""}${fs}px ${fontStack(style.fontFamily)}`;
  ctx.textBaseline = "top";
  const align = style.align ?? (centred ? "center" : "left");
  ctx.textAlign = align;
  const maxW = Math.max(4, w - pad * 2);
  const lines = wrapLines(ctx, content, maxW);
  const totalH = lines.length * lineH;
  const valign = style.valign ?? (centred ? "middle" : "top");
  const startY = valign === "middle" ? y + (h - totalH) / 2 : valign === "bottom" ? y + h - totalH - pad : y + pad;
  const anchorX = align === "center" ? x + w / 2 : align === "right" ? x + w - pad : x + pad;
  for (let i = 0; i < lines.length; i++) {
    const ly = startY + i * lineH;
    ctx.fillText(lines[i]!, anchorX, ly);
    if (style.underline || style.strike) {
      const tw = ctx.measureText(lines[i]!).width;
      const lx = align === "center" ? anchorX - tw / 2 : align === "right" ? anchorX - tw : anchorX;
      if (style.underline) {
        ctx.beginPath();
        ctx.moveTo(lx, ly + fs * 1.04);
        ctx.lineTo(lx + tw, ly + fs * 1.04);
        ctx.stroke();
      }
      if (style.strike) {
        ctx.beginPath();
        ctx.moveTo(lx, ly + fs * 0.58);
        ctx.lineTo(lx + tw, ly + fs * 0.58);
        ctx.stroke();
      }
    }
  }
  ctx.textAlign = "left";
}

/** Draw a connector endpoint marker at (tx,ty), pointing along (fx,fy)→(tx,ty). */
function drawMarker(
  ctx: CanvasRenderingContext2D,
  fx: number,
  fy: number,
  tx: number,
  ty: number,
  kind: NonNullable<ShapeStyle["endArrow"]>,
  color: string,
): void {
  if (kind === "none") return;
  const angle = Math.atan2(ty - fy, tx - fx);
  const ux = Math.cos(angle);
  const uy = Math.sin(angle);
  const px = -uy;
  const py = ux;
  const size = 12;
  ctx.save();
  ctx.setLineDash([]);
  ctx.fillStyle = color;
  ctx.strokeStyle = color;
  if (kind === "arrow") {
    ctx.beginPath();
    ctx.moveTo(tx, ty);
    ctx.lineTo(tx - size * Math.cos(angle - 0.42), ty - size * Math.sin(angle - 0.42));
    ctx.lineTo(tx - size * Math.cos(angle + 0.42), ty - size * Math.sin(angle + 0.42));
    ctx.closePath();
    ctx.fill();
  } else if (kind === "open") {
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.beginPath();
    ctx.moveTo(tx - size * Math.cos(angle - 0.5), ty - size * Math.sin(angle - 0.5));
    ctx.lineTo(tx, ty);
    ctx.lineTo(tx - size * Math.cos(angle + 0.5), ty - size * Math.sin(angle + 0.5));
    ctx.stroke();
  } else if (kind === "circle") {
    ctx.beginPath();
    ctx.arc(tx - ux * size * 0.35, ty - uy * size * 0.35, size * 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "diamond") {
    const d = size * 0.5;
    const cx = tx - ux * d;
    const cy = ty - uy * d;
    ctx.beginPath();
    ctx.moveTo(cx + ux * d, cy + uy * d);
    ctx.lineTo(cx + px * d, cy + py * d);
    ctx.lineTo(cx - ux * d, cy - uy * d);
    ctx.lineTo(cx - px * d, cy - py * d);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

