/**
 * The canvas surface. Owns the <canvas> element, wires the Renderer, routes
 * pan/zoom, and dispatches pointer/keyboard events to the active tool through a
 * ToolContext. Shapes come from the board store (Yjs-backed via useBoard);
 * presence cursors ride Awareness. Tool/UI state from Zustand.
 */
"use client";

import { useEffect, useRef } from "react";
import { Canvas2DRenderer } from "./renderer/Canvas2DRenderer";
import type { Renderer } from "./renderer/Renderer";
import { pan, zoomAt, screenToWorld, visibleWorldRect, fitRect } from "./viewport/viewport";
import { cullToViewport } from "./viewport/culling";
import { hitTestTopmost, shapeBounds, rectsIntersect } from "./geometry/hit-test";
import { computeSnap, SNAP_THRESHOLD } from "./geometry/snapping";
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

/** Drop consecutive-duplicate and collinear midpoints so aligned routes collapse
 *  to a clean straight line and no zero-length jog survives to curl a corner. */
function simplifyOrtho(flat: number[]): number[] {
  const pts: Point[] = [];
  for (let i = 0; i < flat.length; i += 2) {
    const p = { x: flat[i]!, y: flat[i + 1]! };
    const last = pts[pts.length - 1];
    if (!last || Math.abs(last.x - p.x) > 0.5 || Math.abs(last.y - p.y) > 0.5) pts.push(p);
  }
  const out: Point[] = [];
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i - 1];
    const b = pts[i]!;
    const c = pts[i + 1];
    if (a && c) {
      const collinearH = Math.abs(a.y - b.y) < 0.5 && Math.abs(b.y - c.y) < 0.5;
      const collinearV = Math.abs(a.x - b.x) < 0.5 && Math.abs(b.x - c.x) < 0.5;
      if (collinearH || collinearV) continue;
    }
    out.push(b);
  }
  const res: number[] = [];
  for (const p of out) res.push(p.x, p.y);
  return res;
}

/** Elbow route that EXITS the grabbed side and ENTERS the dropped side: each end
 *  leaves perpendicular to its edge (a short stub), then jogs orthogonally to meet. */
function routeSides(from: Shape, fromSide: Side, to: Shape, toSide: Side): number[] {
  const STUB = 22;
  const a = sideAnchor(from, fromSide);
  const b = sideAnchor(to, toSide);
  const ap = { x: a.p.x + a.dir.x * STUB, y: a.p.y + a.dir.y * STUB };
  const bp = { x: b.p.x + b.dir.x * STUB, y: b.p.y + b.dir.y * STUB };
  const pts = [a.p.x, a.p.y, ap.x, ap.y];
  if (a.dir.x !== 0) {
    if (b.dir.x !== 0) {
      const mx = (ap.x + bp.x) / 2;
      pts.push(mx, ap.y, mx, bp.y);
    } else {
      pts.push(bp.x, ap.y);
    }
  } else {
    if (b.dir.y !== 0) {
      const my = (ap.y + bp.y) / 2;
      pts.push(ap.x, my, bp.x, my);
    } else {
      pts.push(ap.x, bp.y);
    }
  }
  pts.push(bp.x, bp.y, b.p.x, b.p.y);
  return simplifyOrtho(pts);
}

/** Right-angle (elbow) route between two shapes — anchored at the edge midpoints
 *  of whichever sides face each other, with one orthogonal jog between them. Used
 *  when a connector carries no explicit anchor sides (legacy connectors). */
const ALIGN_EPS = 8; // shapes this close to aligned get a clean straight line

function orthogonalRoute(from: Shape, to: Shape): number[] {
  const acx = from.x + from.w / 2;
  const acy = from.y + from.h / 2;
  const bcx = to.x + to.w / 2;
  const bcy = to.y + to.h / 2;
  const dx = bcx - acx;
  const dy = bcy - acy;
  if (Math.abs(dx) >= Math.abs(dy)) {
    // Side-by-side: exit left/right.
    const ax = dx >= 0 ? from.x + from.w : from.x;
    const bx = dx >= 0 ? to.x : to.x + to.w;
    // Roughly level → straight line; no zero-length jog to curl.
    if (Math.abs(dy) <= ALIGN_EPS) {
      const y = (acy + bcy) / 2;
      return [ax, y, bx, y];
    }
    const midX = (ax + bx) / 2;
    return [ax, acy, midX, acy, midX, bcy, bx, bcy];
  }
  // Stacked: exit top/bottom.
  const ay = dy >= 0 ? from.y + from.h : from.y;
  const by = dy >= 0 ? to.y : to.y + to.h;
  if (Math.abs(dx) <= ALIGN_EPS) {
    const x = (acx + bcx) / 2;
    return [x, ay, x, by];
  }
  const midY = (ay + by) / 2;
  return [acx, ay, acx, midY, bcx, midY, bcx, by];
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

/** Resolve a connector's live elbow path from its linked shapes; null if dangling. */
function resolveConnector(conn: Shape, byId: Map<string, Shape>): Shape | null {
  if (!conn.from || !conn.to) return null;
  const from = byId.get(conn.from);
  const to = byId.get(conn.to);
  if (!from || !to) return null;
  const points =
    conn.fromSide && conn.toSide ? routeSides(from, conn.fromSide, to, conn.toSide) : orthogonalRoute(from, to);
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
  const hoveredIdRef = useRef<string | null>(null);

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
          for (let j = 0; j < p.length - 2; j += 2) {
            if (distToSegment(world, p[j]!, p[j + 1]!, p[j + 2]!, p[j + 3]!) <= tol) return sh.id;
          }
        }
        return null;
      },
      getHovered: () => hoveredIdRef.current,
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
        !dragMode.current && useUiStore.getState().activeTool === "select" ? hoveredIdRef.current : null;
      r.render({
        shapes: culled,
        viewport: vp,
        selection: useUiStore.getState().selection,
        hovered,
        connecting: ghost,
        dropTarget,
        marquee: useUiStore.getState().marquee,
        guides: useUiStore.getState().guides,
      });
    });
  }

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
        dragMode.current = "pan";
        el.style.cursor = "grabbing";
        return;
      }
      dragMode.current = "tool";
      toolRef.current?.handle({ kind: "pointerdown", world: worldAt(e), mods: modsOf(e) }, ctx);
    };
    const onPointerMove = (e: PointerEvent) => {
      pubCursor.current(worldAt(e)); // always broadcast the cursor
      if (dragMode.current === "pan") {
        ui().setViewport(pan(ui().viewport, { x: e.movementX, y: e.movementY }));
      } else if (dragMode.current === "tool") {
        toolRef.current?.handle({ kind: "pointermove", world: worldAt(e), mods: modsOf(e) }, ctx);
      } else if (ui().activeTool === "select") {
        // Idle: update the hover affordance (connection dots on the shape under
        // the cursor). Repaint only when the hovered shape actually changes.
        const w = worldAt(e);
        const next = hoverTest(useBoardStore.getState().shapes, w, 18 / ui().viewport.zoom);
        if (next !== hoveredIdRef.current) {
          hoveredIdRef.current = next;
          scheduleRender();
        }
      } else if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
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
      dragMode.current = null;
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
      if (hoveredIdRef.current) {
        hoveredIdRef.current = null;
        scheduleRender();
      }
    };
    const onDblClick = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      const world = screenToWorld(ui().viewport, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      const hit = ctx.hitTest(world);
      if (!hit) return;
      const shape = useBoardStore.getState().getShape(hit);
      if (shape && (shape.type === "sticky" || shape.type === "text")) {
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
        backgroundColor: "#F7F7F5",
        backgroundImage: "radial-gradient(circle, #d4d3cd 1.1px, transparent 1.2px)",
        backgroundSize: `${dot}px ${dot}px`,
        backgroundPosition: `${-viewport.x * viewport.zoom}px ${-viewport.y * viewport.zoom}px`,
      }}
    >
      <canvas ref={canvasRef} className="block h-full w-full touch-none" aria-label="Collaborative canvas" />
      <CursorsLayer presences={presences} viewport={viewport} />
      <div className="absolute left-1/2 top-4 -translate-x-1/2">
        <AvatarStack presences={presences} me={me} />
      </div>
      <TextOverlay />
      <SelectionToolbar />
      <AlignBar />
      <ContextMenu />
    </div>
  );
}
