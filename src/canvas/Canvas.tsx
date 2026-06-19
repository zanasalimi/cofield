/**
 * The canvas surface. Owns the <canvas> element, wires the Renderer, routes
 * pan/zoom, and dispatches pointer/keyboard events to the active tool through a
 * ToolContext. Shapes come from the board store (Yjs-backed via useBoard);
 * presence cursors ride Awareness. Tool/UI state from Zustand.
 */
"use client";

import { useEffect, useRef } from "react";
import { Canvas2DRenderer, setImageLoadCallback } from "./renderer/Canvas2DRenderer";
import type { Renderer } from "./renderer/Renderer";
import { pan, zoomAt, screenToWorld, visibleWorldRect, fitRect } from "./viewport/viewport";
import { cullToViewport } from "./viewport/culling";
import { hitTestTopmost, shapeBounds, rectsIntersect } from "./geometry/hit-test";
import { computeSnap, SNAP_THRESHOLD } from "./geometry/snapping";
import { handlePoints, type ResizeHandle } from "./geometry/transform";
import { createTool, TOOL_SHORTCUTS } from "./tools";
import type { Tool, ToolContext, ToolModifiers } from "./tools/types";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { useBoard } from "@/collab/use-board";
import { CursorsLayer } from "@/presence/CursorsLayer";
import { AvatarStack } from "@/presence/AvatarStack";
import { TextOverlay } from "./TextOverlay";
import { SelectionToolbar } from "./SelectionToolbar";
import { AlignBar } from "./AlignBar";
import { ContextMenu } from "./ContextMenu";
import { HoverConnectLayer } from "./HoverConnectLayer";
import type { Point, Shape, ShapeType, Side } from "@/collab/types";

const CURSOR_FOR_TOOL: Record<string, string> = {
  select: "default",
  pan: "grab",
  text: "text",
  sticky: "copy",
};

function center(s: Shape): Point {
  return { x: s.x + s.w / 2, y: s.y + s.h / 2 };
}

const RESIZE_CURSOR: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  se: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  n: "ns-resize",
  s: "ns-resize",
  e: "ew-resize",
  w: "ew-resize",
};

/** The cursor for a point over the selected shape: rotate / resize / connect /
 *  move, or null if not over any affordance. World coords. */
function cursorForSelected(shape: Shape, world: Point, zoom: number): string | null {
  if (shape.type === "connector" || shape.locked) return null;
  const tol = 11 / zoom;
  const cx = shape.x + shape.w / 2;
  if (Math.hypot(world.x - cx, world.y - (shape.y - 30 / zoom)) <= tol) return "grab"; // rotate
  const off = 14 / zoom;
  const dots: Point[] = [
    { x: cx, y: shape.y - off },
    { x: shape.x + shape.w + off, y: shape.y + shape.h / 2 },
    { x: cx, y: shape.y + shape.h + off },
    { x: shape.x - off, y: shape.y + shape.h / 2 },
  ];
  if (dots.some((d) => Math.hypot(world.x - d.x, world.y - d.y) <= tol)) return "crosshair";
  const pts = handlePoints({ x: shape.x, y: shape.y, w: shape.w, h: shape.h });
  for (const h of ["nw", "ne", "se", "sw"] as ResizeHandle[]) {
    if (Math.hypot(world.x - pts[h].x, world.y - pts[h].y) <= tol) return RESIZE_CURSOR[h];
  }
  return null;
}

/** Axis-aligned union of the shapes' world bounds, or null if empty. */
function unionBounds(shapes: Shape[]): { x: number; y: number; w: number; h: number } | null {
  if (shapes.length === 0) return null;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const s of shapes) {
    const b = shapeBounds(s);
    minX = Math.min(minX, b.x);
    minY = Math.min(minY, b.y);
    maxX = Math.max(maxX, b.x + b.w);
    maxY = Math.max(maxY, b.y + b.h);
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

/** Topmost non-connector shape whose body — expanded to include its connection
 *  dots — contains the world point. Drives the hover-to-connect affordance. */
function hoverTest(shapes: Shape[], world: Point, margin: number): string | null {
  for (let i = shapes.length - 1; i >= 0; i--) {
    const s = shapes[i]!;
    if (s.type === "connector") continue;
    if (
      world.x >= s.x - margin &&
      world.x <= s.x + s.w + margin &&
      world.y >= s.y - margin &&
      world.y <= s.y + s.h + margin
    ) {
      return s.id;
    }
  }
  return null;
}

/** The edge-midpoint anchor of a shape's side, plus that side's outward normal. */
function sideAnchor(s: Shape, side: Side): { p: Point; dir: Point } {
  const cx = s.x + s.w / 2;
  const cy = s.y + s.h / 2;
  switch (side) {
    case "top":
      return { p: { x: cx, y: s.y }, dir: { x: 0, y: -1 } };
    case "right":
      return { p: { x: s.x + s.w, y: cy }, dir: { x: 1, y: 0 } };
    case "bottom":
      return { p: { x: cx, y: s.y + s.h }, dir: { x: 0, y: 1 } };
    case "left":
      return { p: { x: s.x, y: cy }, dir: { x: -1, y: 0 } };
  }
}

/** The anchor + outward direction on the side of `s` that faces `other`. */
function geoAnchor(s: Shape, other: Shape): { p: Point; dir: Point } {
  const dx = other.x + other.w / 2 - (s.x + s.w / 2);
  const dy = other.y + other.h / 2 - (s.y + s.h / 2);
  const side: Side = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";
  return sideAnchor(s, side);
}

/** A smooth cubic-bezier connector between two shapes: it leaves each shape
 *  perpendicular to its anchored (or facing) side and curves to the other, the
 *  way Miro and diagrams.net draw relations. Returns [A, cp1, cp2, B] flat. */
function connectorCurve(from: Shape, fromSide: Side | undefined, to: Shape, toSide: Side | undefined): number[] {
  const a = fromSide ? sideAnchor(from, fromSide) : geoAnchor(from, to);
  const b = toSide ? sideAnchor(to, toSide) : geoAnchor(to, from);
  const k = Math.max(40, Math.min(160, Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y) * 0.45));
  return [a.p.x, a.p.y, a.p.x + a.dir.x * k, a.p.y + a.dir.y * k, b.p.x + b.dir.x * k, b.p.y + b.dir.y * k, b.p.x, b.p.y];
}

/** Flatten a connector to on-curve points: sample the bezier ([A,cp1,cp2,B]) or
 *  pass through a straight [A,B]. Used for hit-testing along the actual curve. */
function sampleConnector(p: number[], n: number): number[] {
  if (p.length < 8) return p;
  const out: number[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const mt = 1 - t;
    out.push(
      mt * mt * mt * p[0]! + 3 * mt * mt * t * p[2]! + 3 * mt * t * t * p[4]! + t * t * t * p[6]!,
      mt * mt * mt * p[1]! + 3 * mt * mt * t * p[3]! + 3 * mt * t * t * p[5]! + t * t * t * p[7]!,
    );
  }
  return out;
}

/** Shortest distance from point p to the segment a–b. */
function distToSegment(p: Point, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax;
  const dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((p.x - ax) * dx + (p.y - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (ax + t * dx), p.y - (ay + t * dy));
}

/** Resolve a connector's live curve from its linked shapes; null if dangling. */
function resolveConnector(conn: Shape, byId: Map<string, Shape>): Shape | null {
  if (!conn.from || !conn.to) return null;
  const from = byId.get(conn.from);
  const to = byId.get(conn.to);
  if (!from || !to) return null;
  const points = connectorCurve(from, conn.fromSide, to, conn.toSide);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i < points.length; i += 2) {
    minX = Math.min(minX, points[i]!);
    maxX = Math.max(maxX, points[i]!);
    minY = Math.min(minY, points[i + 1]!);
    maxY = Math.max(maxY, points[i + 1]!);
  }
  return { ...conn, points, x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export interface CanvasProps {
  boardId: string;
}

export function Canvas({ boardId }: CanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const rafRef = useRef<number | null>(null);
  const toolRef = useRef<Tool | null>(null);
  const spaceDown = useRef(false);
  const dragMode = useRef<"pan" | "tool" | null>(null);
  const exportRef = useRef<(() => void) | null>(null);

  // Only the chrome that is React-rendered subscribes here (grid, cursors,
  // tool wiring). The canvas itself paints imperatively from store subscriptions
  // below, so dragging a shape/connector never re-renders the React tree.
  const viewport = useUiStore((s) => s.viewport);
  const selection = useUiStore((s) => s.selection);
  const activeTool = useUiStore((s) => s.activeTool);
  const followingId = useUiStore((s) => s.followingId);

  // Realtime: doc binding + presence + throttled publishers.
  const { presences, me, publishCursor, publishSelection, publishViewport } = useBoard(boardId);
  const pubCursor = useRef(publishCursor);
  pubCursor.current = publishCursor;

  // Broadcast selection changes to other clients.
  useEffect(() => {
    publishSelection(selection);
  }, [selection, publishSelection]);

  // Broadcast our viewport so others can follow it.
  useEffect(() => {
    publishViewport(viewport);
  }, [viewport, publishViewport]);

  // Follow a user: mirror their viewport whenever their presence updates.
  useEffect(() => {
    if (!followingId) return;
    const target = presences.find((p) => p.userId === followingId);
    if (!target?.viewport) return;
    const t = target.viewport;
    const vp = useUiStore.getState().viewport;
    if (vp.x !== t.x || vp.y !== t.y || vp.zoom !== t.zoom) useUiStore.getState().setViewport({ ...t });
  }, [followingId, presences]);

  const ctxRef = useRef<ToolContext>(null as unknown as ToolContext);
  if (!ctxRef.current) {
    ctxRef.current = {
      addShape: (type, rect) => useBoardStore.getState().addShape(type as ShapeType, rect),
      addConnector: (from, to, fromSide, toSide) => useBoardStore.getState().addConnector(from, to, fromSide, toSide),
      updateShape: (id, patch) => useBoardStore.getState().updateShape(id, patch as Partial<Shape>),
      removeShape: (id) => useBoardStore.getState().removeShape(id),
      getShape: (id) => useBoardStore.getState().getShape(id),
      hitTest: (world: Point) => hitTestTopmost(useBoardStore.getState().shapes, world),
      hitTestConnector: (world: Point) => {
        const all = useBoardStore.getState().shapes;
        const byId = new Map(all.map((sh) => [sh.id, sh]));
        const tol = 7 / useUiStore.getState().viewport.zoom;
        for (let i = all.length - 1; i >= 0; i--) {
          const sh = all[i]!;
          if (sh.type !== "connector") continue;
          const rc = resolveConnector(sh, byId);
          const p = rc?.points;
          if (!p) continue;
          // Sample the bezier (or use the 2-point line) and test each segment.
          const poly = sampleConnector(p, 18);
          for (let j = 0; j < poly.length - 2; j += 2) {
            if (distToSegment(world, poly[j]!, poly[j + 1]!, poly[j + 2]!, poly[j + 3]!) <= tol) return sh.id;
          }
        }
        return null;
      },
      getHovered: () => useUiStore.getState().hoveredId,
      getViewport: () => useUiStore.getState().viewport,
      setConnecting: (c) => useUiStore.getState().setConnecting(c),
      setMarquee: (rect) => useUiStore.getState().setMarquee(rect),
      selectInMarquee: (rect, base, additive) => {
        const ids: string[] = [];
        for (const s of useBoardStore.getState().shapes) {
          if (s.type === "connector") continue;
          if (rectsIntersect(rect, shapeBounds(s))) ids.push(s.id);
        }
        const next = additive ? Array.from(new Set([...base, ...ids])) : ids;
        useUiStore.getState().setSelection(next);
      },
      snapMove: (box, excludeIds) => {
        const exclude = new Set(excludeIds);
        const others = [];
        for (const s of useBoardStore.getState().shapes) {
          if (s.type === "connector" || exclude.has(s.id)) continue;
          others.push(shapeBounds(s));
        }
        const threshold = SNAP_THRESHOLD / useUiStore.getState().viewport.zoom;
        return computeSnap(box, others, threshold);
      },
      setGuides: (guides) => useUiStore.getState().setGuides(guides),
      setSelection: (ids) => useUiStore.getState().setSelection(ids),
      getSelection: () => useUiStore.getState().selection,
      setEditing: (id) => useUiStore.getState().setEditingId(id),
    };
  }

  function scheduleRender() {
    if (rafRef.current != null) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const r = rendererRef.current;
      const el = canvasRef.current;
      if (!r || !el) return;
      const vp = useUiStore.getState().viewport;
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
      const visible = visibleWorldRect(vp, el.clientWidth, el.clientHeight);
      const culled = cullToViewport(resolved, visible);

      const connecting = useUiStore.getState().connecting;
      let ghost: { from: Point; to: Point } | null = null;
      let dropTarget: string | null = null;
      if (connecting) {
        const from = byId.get(connecting.from);
        if (from) {
          const anchor = connecting.fromSide ? sideAnchor(from, connecting.fromSide).p : center(from);
          ghost = { from: anchor, to: connecting.point };
        }
        const t = hitTestTopmost(all, connecting.point);
        if (t && t !== connecting.from) dropTarget = t;
      }
      // Hover dots only when idle with the select tool (not mid-drag).
      const hovered =
        !dragMode.current && useUiStore.getState().activeTool === "select" ? useUiStore.getState().hoveredId : null;
      r.render({
        shapes: culled,
        viewport: vp,
        selection: useUiStore.getState().selection,
        editing: !!useUiStore.getState().editingId,
        hovered,
        connecting: ghost,
        dropTarget,
        marquee: useUiStore.getState().marquee,
        guides: useUiStore.getState().guides,
      });
    });
  }

  function exportPng() {
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
    const pad = 40;
    const scale = 2;
    const wCss = b.w + pad * 2;
    const hCss = b.h + pad * 2;
    const off = document.createElement("canvas");
    const r = new Canvas2DRenderer();
    r.mount(off);
    r.resize(wCss, hCss, scale);
    r.render({ shapes: resolved, viewport: { x: b.x - pad, y: b.y - pad, zoom: 1 }, selection: [] });
    // Composite onto the paper background and download.
    const final = document.createElement("canvas");
    final.width = Math.ceil(wCss * scale);
    final.height = Math.ceil(hCss * scale);
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
  exportRef.current = exportPng;

  useEffect(() => {
    toolRef.current?.cancel(ctxRef.current);
    toolRef.current = createTool(activeTool);
    const el = canvasRef.current;
    if (el) el.style.cursor = CURSOR_FOR_TOOL[activeTool] ?? "crosshair";
  }, [activeTool]);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const renderer = new Canvas2DRenderer();
    renderer.mount(el);
    rendererRef.current = renderer;
    setImageLoadCallback(() => scheduleRender()); // repaint when an image decodes

    // Place an image file on the board at a world point (drop or paste).
    const placeImage = (file: File, world: Point) => {
      const reader = new FileReader();
      reader.onload = () => {
        const src = reader.result as string;
        const probe = new Image();
        probe.onload = () => {
          const scale = Math.min(1, 360 / probe.naturalWidth);
          const w = probe.naturalWidth * scale;
          const h = probe.naturalHeight * scale;
          const id = useBoardStore.getState().addImage(src, { x: world.x - w / 2, y: world.y - h / 2, w, h });
          ui().setSelection([id]);
          useBoardStore.getState().commitHistory();
        };
        probe.src = src;
      };
      reader.readAsDataURL(file);
    };

    const ctx = ctxRef.current;
    const ui = useUiStore.getState;

    const worldAt = (e: PointerEvent): Point => {
      const rect = el.getBoundingClientRect();
      return screenToWorld(ui().viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });
    };
    const modsOf = (e: PointerEvent): ToolModifiers => ({ shift: e.shiftKey, alt: e.altKey, meta: e.metaKey || e.ctrlKey });

    const resize = () => {
      renderer.resize(el.clientWidth, el.clientHeight, window.devicePixelRatio || 1);
      scheduleRender();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(el);
    resize();

    // Paint imperatively: any document or UI change schedules a single rAF
    // repaint. This keeps drags (move/resize/connect) off the React render path.
    const unsubBoard = useBoardStore.subscribe(scheduleRender);
    const unsubUi = useUiStore.subscribe(scheduleRender);

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (ui().followingId) ui().setFollowing(null); // manual nav breaks follow
      const vp = ui().viewport;
      if (e.ctrlKey || e.metaKey) {
        const rect = el.getBoundingClientRect();
        const anchor = { x: e.clientX - rect.left, y: e.clientY - rect.top };
        ui().setViewport(zoomAt(vp, anchor, Math.exp(-e.deltaY * 0.0015)));
      } else {
        ui().setViewport({ ...vp, x: vp.x + e.deltaX / vp.zoom, y: vp.y + e.deltaY / vp.zoom });
      }
    };

    const onPointerDown = (e: PointerEvent) => {
      el.setPointerCapture(e.pointerId);
      const panRequested = spaceDown.current || e.button === 1 || ui().activeTool === "pan";
      if (panRequested) {
        if (ui().followingId) ui().setFollowing(null);
        ui().setDragging(true);
        dragMode.current = "pan";
        el.style.cursor = "grabbing";
        return;
      }
      dragMode.current = "tool";
      ui().setDragging(true);
      if (ui().hoveredId) ui().setHoveredId(null);
      toolRef.current?.handle({ kind: "pointerdown", world: worldAt(e), mods: modsOf(e) }, ctx);
    };
    const onPointerMove = (e: PointerEvent) => {
      pubCursor.current(worldAt(e)); // always broadcast the cursor
      if (dragMode.current === "pan") {
        ui().setViewport(pan(ui().viewport, { x: e.movementX, y: e.movementY }));
      } else if (dragMode.current === "tool") {
        toolRef.current?.handle({ kind: "pointermove", world: worldAt(e), mods: modsOf(e) }, ctx);
      } else if (ui().activeTool === "select" && !ui().connecting) {
        // Idle: update the hover affordance (connection points on the shape under
        // the cursor) and the cursor (resize / rotate / connect / move). Frozen
        // while a connector is being dragged so the active point stays mounted.
        const w = worldAt(e);
        const next = hoverTest(useBoardStore.getState().shapes, w, 18 / ui().viewport.zoom);
        if (next !== ui().hoveredId) {
          ui().setHoveredId(next);
          scheduleRender();
        }
        let cursor = "default";
        const sel = ui().selection;
        if (sel.length === 1) {
          const s = useBoardStore.getState().getShape(sel[0]!);
          if (s) cursor = cursorForSelected(s, w, ui().viewport.zoom) ?? cursor;
        }
        if (cursor === "default" && next) cursor = "move";
        el.style.cursor = cursor;
      } else if (ui().hoveredId && !ui().connecting) {
        ui().setHoveredId(null);
        scheduleRender();
      }
    };
    const onPointerUp = (e: PointerEvent) => {
      el.releasePointerCapture(e.pointerId);
      if (dragMode.current === "pan") {
        el.style.cursor = spaceDown.current || ui().activeTool === "pan" ? "grab" : CURSOR_FOR_TOOL[ui().activeTool] ?? "crosshair";
      } else if (dragMode.current === "tool") {
        toolRef.current?.handle({ kind: "pointerup", world: worldAt(e), mods: modsOf(e) }, ctx);
        useBoardStore.getState().commitHistory(); // each completed gesture = one undo step
      }
      ui().setDragging(false);
      dragMode.current = null;
    };
    const onDragOver = (e: DragEvent) => e.preventDefault();
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      const file = Array.from(e.dataTransfer?.files ?? []).find((f) => f.type.startsWith("image/"));
      if (!file) return;
      const rect = el.getBoundingClientRect();
      placeImage(file, screenToWorld(ui().viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top }));
    };
    const onPaste = (e: ClipboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const item = Array.from(e.clipboardData?.items ?? []).find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      placeImage(file, screenToWorld(ui().viewport, { x: el.clientWidth / 2, y: el.clientHeight / 2 }));
    };
    const onContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const world = screenToWorld(ui().viewport, { x: sx, y: sy });
      const hit = ctx.hitTest(world) ?? ctx.hitTestConnector(world);
      if (!hit) {
        ui().setContextMenu(null);
        return;
      }
      if (!ui().selection.includes(hit)) ui().setSelection([hit]);
      ui().setContextMenu({ x: sx, y: sy });
    };
    const onPointerLeave = () => {
      pubCursor.current(null);
      if (ui().hoveredId && !ui().connecting) {
        ui().setHoveredId(null);
        scheduleRender();
      }
    };
    const onDblClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const world = screenToWorld(ui().viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      const hit = ctx.hitTest(world);
      if (!hit) return;
      const shape = useBoardStore.getState().getShape(hit);
      // Any node with a text body is double-click editable (diagrams.net style).
      const editable = shape && shape.type !== "connector" && shape.type !== "image" && shape.type !== "draw" && shape.type !== "arrow";
      if (editable) {
        ui().setSelection([hit]);
        ui().setEditingId(hit);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      // Undo / redo.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) useBoardStore.getState().redo();
        else useBoardStore.getState().undo();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "y") {
        e.preventDefault();
        useBoardStore.getState().redo();
        return;
      }
      // Export the board as a PNG.
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === "e") {
        e.preventDefault();
        exportRef.current?.();
        return;
      }
      // Copy / paste / duplicate.
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "c") {
        const sel = useUiStore.getState().selection;
        if (sel.length) {
          useBoardStore.getState().copy(sel);
          e.preventDefault();
        }
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "v") {
        const ids = useBoardStore.getState().paste();
        if (ids.length) useUiStore.getState().setSelection(ids);
        e.preventDefault();
        return;
      }
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        const sel = useUiStore.getState().selection;
        if (sel.length) useUiStore.getState().setSelection(useBoardStore.getState().duplicate(sel));
        return;
      }
      // Zoom to fit all (Shift+1) / to selection (Shift+2).
      if (e.shiftKey && (e.code === "Digit1" || e.code === "Digit2")) {
        e.preventDefault();
        const all = useBoardStore.getState().shapes.filter((s) => s.type !== "connector");
        const target =
          e.code === "Digit2"
            ? all.filter((s) => useUiStore.getState().selection.includes(s.id))
            : all;
        const b = unionBounds(target);
        if (b) ui().setViewport(fitRect(b, el.clientWidth, el.clientHeight));
        return;
      }
      // Z-order: Cmd/Ctrl + ] / [ (Shift = all the way to front/back).
      if ((e.metaKey || e.ctrlKey) && (e.key === "]" || e.key === "[")) {
        e.preventDefault();
        const sel = useUiStore.getState().selection;
        if (sel.length) {
          const fwd = e.key === "]";
          useBoardStore.getState().reorder(sel, e.shiftKey ? (fwd ? "front" : "back") : fwd ? "forward" : "backward");
        }
        return;
      }
      // Alt + arrow: create a connected duplicate in that direction (like Miro).
      if (e.altKey && e.key.startsWith("Arrow")) {
        const sel = ui().selection;
        if (sel.length === 1) {
          e.preventDefault();
          const side: Side =
            e.key === "ArrowLeft" ? "left" : e.key === "ArrowRight" ? "right" : e.key === "ArrowUp" ? "top" : "bottom";
          const id = useBoardStore.getState().quickConnect(sel[0]!, side);
          if (id) {
            ui().setSelection([id]);
            ui().setEditingId(id);
            useBoardStore.getState().commitHistory();
          }
        }
        return;
      }
      if (e.code === "Space" && !spaceDown.current) {
        spaceDown.current = true;
        if (!dragMode.current) el.style.cursor = "grab";
        return;
      }
      if (e.key === "Escape") {
        toolRef.current?.cancel(ctx);
        ui().setSelection([]);
        ui().setContextMenu(null);
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        for (const id of ui().selection) ctx.removeShape(id);
        ui().setSelection([]);
        return;
      }
      const tool = TOOL_SHORTCUTS[e.key.toLowerCase()];
      if (tool && !e.metaKey && !e.ctrlKey) ui().setActiveTool(tool);
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        spaceDown.current = false;
        if (!dragMode.current) el.style.cursor = CURSOR_FOR_TOOL[ui().activeTool] ?? "crosshair";
      }
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", onPointerUp);
    el.addEventListener("pointerleave", onPointerLeave);
    el.addEventListener("dblclick", onDblClick);
    el.addEventListener("contextmenu", onContextMenu);
    const onExportEvt = () => exportRef.current?.();
    const onZoomFitEvt = () => {
      const all = useBoardStore.getState().shapes.filter((s) => s.type !== "connector");
      const b = unionBounds(all);
      if (b) ui().setViewport(fitRect(b, el.clientWidth, el.clientHeight));
    };
    el.addEventListener("dragover", onDragOver);
    el.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    window.addEventListener("cofield:export", onExportEvt);
    window.addEventListener("cofield:zoomfit", onZoomFitEvt);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    return () => {
      ro.disconnect();
      unsubBoard();
      unsubUi();
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("pointerdown", onPointerDown);
      el.removeEventListener("pointermove", onPointerMove);
      el.removeEventListener("pointerup", onPointerUp);
      el.removeEventListener("pointerleave", onPointerLeave);
      el.removeEventListener("dblclick", onDblClick);
      el.removeEventListener("contextmenu", onContextMenu);
      el.removeEventListener("dragover", onDragOver);
      el.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("cofield:export", onExportEvt);
      window.removeEventListener("cofield:zoomfit", onZoomFitEvt);
      setImageLoadCallback(null);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      renderer.destroy();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [boardId]);

  const dot = 24 * viewport.zoom;
  return (
    <div
      className="absolute inset-0"
      style={{
        backgroundColor: "#FFFFFF",
        backgroundImage: "radial-gradient(circle, #D6D6D1 0.8px, transparent 0.9px)",
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${-viewport.x * viewport.zoom}px ${-viewport.y * viewport.zoom}px`,
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none" aria-label="Collaborative canvas" />
      <CursorsLayer presences={presences} viewport={viewport} />
      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <AvatarStack presences={presences} me={me} />
      </div>
      <HoverConnectLayer />
      <TextOverlay />
      <SelectionToolbar />
      <AlignBar />
      <ContextMenu />
    </div>
  );
}
