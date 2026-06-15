/**
 * Shared types for the document and presence layers.
 * Imported by both the client (src/) and the sync server (server/), so this
 * module must stay free of browser- and node-only dependencies.
 */

export type ShapeId = string;
export type UserId = string;
export type BoardId = string;

export type ShapeType =
  | "rect"
  | "ellipse"
  | "arrow"
  | "draw"
  | "sticky"
  | "text"
  | "connector";

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
}

/** A shape edge a connector can anchor to. */
export type Side = "top" | "right" | "bottom" | "left";

/**
 * The persistent shape record. In the Yjs document each shape is a nested
 * Y.Map keyed by these fields, so concurrent edits to different fields merge
 * instead of clobbering. This interface is the plain-object projection.
 */
export interface Shape {
  id: ShapeId;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  rotation: number;
  style: ShapeStyle;
  /** sticky / text content */
  content?: string;
  /** freehand point pairs [x0, y0, x1, y1, ...] in world coords */
  points?: number[];
  /** connector endpoints — the ids of the shapes it links (re-routes as they move) */
  from?: ShapeId;
  to?: ShapeId;
  /** the edge each connector endpoint is anchored to (which dot was grabbed/dropped) */
  fromSide?: Side;
  toSide?: Side;
  createdBy: UserId;
}

/** A point in world coordinates. */
export interface Point {
  x: number;
  y: number;
}

/** An axis-aligned rectangle in world coordinates. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * Ephemeral per-user presence carried on the Awareness channel.
 * Never written to the document or to leveldb.
 */
export interface Presence {
  userId: UserId;
  name: string;
  /** one of the eight stable brand hues; drives cursor + selection tint */
  color: string;
  /** world coords, or null when the pointer is off the canvas */
  cursor: Point | null;
  /** selected shape ids */
  selection: ShapeId[];
}

/** The eight curated multiplayer hues — order is the stable assignment order. */
export const CURSOR_COLORS = [
  "#FF5C5C", // coral
  "#FF9F1C", // amber
  "#E8C547", // citrus
  "#3FA34D", // fern
  "#1FB3A3", // teal
  "#2D9CDB", // sky
  "#5B5BD6", // indigo
  "#C44CD9", // orchid
] as const;

export type CursorColor = (typeof CURSOR_COLORS)[number];

/** Connection lifecycle as surfaced to the UI. */
export type ConnectionState =
  | "connecting"
  | "connected"
  | "disconnected"
  | "reconnecting"
  | "error";
