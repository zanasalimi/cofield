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
 * Resolve the flat point list for a connector under a routing mode. `curved`
 * returns a cubic bezier [A, cp1, cp2, B] (each shape left perpendicular to its
 * side); `straight` a 2-point line [A, B]; `elbow` an orthogonal 4-point path.
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
    if (Math.abs(b.p.x - a.p.x) >= Math.abs(b.p.y - a.p.y)) {
      const mx = (a.p.x + b.p.x) / 2;
      return [a.p.x, a.p.y, mx, a.p.y, mx, b.p.y, b.p.x, b.p.y];
    }
    const my = (a.p.y + b.p.y) / 2;
    return [a.p.x, a.p.y, a.p.x, my, b.p.x, my, b.p.x, b.p.y];
  }
  const k = Math.max(40, Math.min(160, Math.hypot(b.p.x - a.p.x, b.p.y - a.p.y) * 0.45));
  return [a.p.x, a.p.y, a.p.x + a.dir.x * k, a.p.y + a.dir.y * k, b.p.x + b.dir.x * k, b.p.y + b.dir.y * k, b.p.x, b.p.y];
}

/** Back-compat alias: the default (curved) connector curve. */
export function connectorCurve(from: Shape, fromSide: Side | undefined, to: Shape, toSide: Side | undefined): number[] {
  return connectorPath(from, fromSide, to, toSide, "curved");
}

/** Flatten a connector to on-curve points: sample the bezier ([A,cp1,cp2,B]) or
 *  pass through a straight [A,B]. Used for hit-testing along the actual curve. */
export function sampleConnector(p: number[], n: number): number[] {
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
