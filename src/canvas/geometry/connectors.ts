/**
 * Connector geometry (pure, world coords). A connector is stored only as a pair
 * of shape ids + sides; its live curve is resolved from the current positions of
 * the shapes it links. Shared by the canvas paint loop, hit-testing, and the
 * minimap so they all draw identical relations.
 */
import type { Point, Shape, Side } from "@/collab/types";

/** The edge-midpoint anchor of a shape's side, plus that side's outward normal. */
export function sideAnchor(s: Shape, side: Side): { p: Point; dir: Point } {
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
export function geoAnchor(s: Shape, other: Shape): { p: Point; dir: Point } {
  const dx = other.x + other.w / 2 - (s.x + s.w / 2);
  const dy = other.y + other.h / 2 - (s.y + s.h / 2);
  const side: Side = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? "right" : "left") : dy >= 0 ? "bottom" : "top";
  return sideAnchor(s, side);
}

export type Routing = "straight" | "elbow" | "curved";

/**
 * How far an elbow travels straight out of a shape before it is allowed to
 * turn. Without it the first segment can run flush along the very edge it just
 * left, which reads as the line being stuck to the box rather than leaving it.
 */
const ELBOW_STUB = 20;

/**
 * Drop points that add nothing: an exact repeat of the previous one, or a turn
 * that does not turn. Anchors that already line up would otherwise produce a
 * straight run described by five points, and zero-length segments confuse
 * hit-testing and the direction the arrowhead is derived from.
 */
function simplify(points: number[]): number[] {
  const out: number[] = [];
  const push = (x: number, y: number) => {
    if (out.length >= 2 && out[out.length - 2] === x && out[out.length - 1] === y) return;
    if (out.length >= 4) {
      const [px, py] = [out[out.length - 2]!, out[out.length - 1]!];
      const [qx, qy] = [out[out.length - 4]!, out[out.length - 3]!];
      // Every elbow segment is axis-aligned, so collinear means a shared x or y
      // across all three points.
      if ((qx === px && px === x) || (qy === py && py === y)) {
        out.length -= 2;
      }
    }
    out.push(x, y);
  };
  for (let i = 0; i < points.length; i += 2) push(points[i]!, points[i + 1]!);
  return out;
}

/**
 * Resolve the flat point list for a connector under a routing mode. `curved`
 * returns a cubic bezier [A, cp1, cp2, B] (each shape left perpendicular to its
 * side); `straight` a 2-point line [A, B]; `elbow` an orthogonal path that
 * leaves and arrives perpendicular to the sides it is anchored to.
 */
export function connectorPath(
  from: Shape,
  fromSide: Side | undefined,
  to: Shape,
  toSide: Side | undefined,
  routing: Routing = "curved",
): number[] {
  const a = fromSide ? sideAnchor(from, fromSide) : geoAnchor(from, to);
  const b = toSide ? sideAnchor(to, toSide) : geoAnchor(to, from);
  if (routing === "straight") return [a.p.x, a.p.y, b.p.x, b.p.y];
  if (routing === "elbow") {
    // Route between the stub ends, not the anchors: which axis to turn on is
    // decided by the sides the connector is attached to, never by whichever
    // delta happens to be larger.
    const s = { x: a.p.x + a.dir.x * ELBOW_STUB, y: a.p.y + a.dir.y * ELBOW_STUB };
    const e = { x: b.p.x + b.dir.x * ELBOW_STUB, y: b.p.y + b.dir.y * ELBOW_STUB };
    const aHorizontal = a.dir.x !== 0;
    const bHorizontal = b.dir.x !== 0;

    let mid: number[];
    if (aHorizontal && bHorizontal) {
      const mx = (s.x + e.x) / 2;
      mid = [mx, s.y, mx, e.y];
    } else if (!aHorizontal && !bHorizontal) {
      const my = (s.y + e.y) / 2;
      mid = [s.x, my, e.x, my];
    } else if (aHorizontal) {
      mid = [e.x, s.y];
    } else {
      mid = [s.x, e.y];
    }
    return simplify([a.p.x, a.p.y, s.x, s.y, ...mid, e.x, e.y, b.p.x, b.p.y]);
  }
  const k = Math.max(40, Math.min(160, Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y) * 0.45));
  return [a.p.x, a.p.y, a.p.x + a.dir.x * k, a.p.y + a.dir.y * k, b.p.x + b.dir.x * k, b.p.y + b.dir.y * k, b.p.x, b.p.y];
}

/** Flatten a connector to on-curve points for hit-testing. Only a *curved*
 *  connector is a cubic bezier ([A,cp1,cp2,B]) that needs sampling; straight and
 *  elbow paths are already polylines and pass through unchanged. This mirrors the
 *  renderer's draw branch exactly, so the clickable line matches the drawn line. */
export function sampleConnector(p: number[], n: number, routing?: Routing): number[] {
  const curved = (routing ?? "curved") === "curved" && p.length >= 8;
  if (!curved) return p;
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

/** Resolve a connector's live curve from its linked shapes; null if dangling. */
export function resolveConnector(conn: Shape, byId: Map<string, Shape>): Shape | null {
  if (!conn.from || !conn.to) return null;
  const from = byId.get(conn.from);
  const to = byId.get(conn.to);
  if (!from || !to) return null;
  const points = connectorPath(from, conn.fromSide, to, conn.toSide, (conn.style?.routing as Routing) ?? "curved");
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

/** Resolve every connector in `shapes` (others pass through unchanged). */
export function resolveScene(shapes: Shape[]): Shape[] {
  const byId = new Map(shapes.map((s) => [s.id, s]));
  const out: Shape[] = [];
  for (const s of shapes) {
    if (s.type === "connector") {
      const rc = resolveConnector(s, byId);
      if (rc) out.push(rc);
    } else {
      out.push(s);
    }
  }
  return out;
}
