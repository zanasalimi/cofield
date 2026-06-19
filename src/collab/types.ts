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
  | "triangle"
  | "diamond"
  | "star"
  | "arrow"
  | "draw"
  | "sticky"
  | "text"
  | "image"
  | "connector"
  | "component";

/** Rich, data-bearing element kinds rendered via the component registry. */
export type ComponentKind = "frame" | "table" | "code";

export interface ShapeStyle {
  fill: string;
  stroke: string;
  strokeWidth: number;
  /** border / connector dash pattern */
  strokeDash?: "solid" | "dashed" | "dotted";
  /** text/sticky typography */
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strike?: boolean;
  align?: "left" | "center" | "right";
  /** vertical alignment of a node's label */
  valign?: "top" | "middle" | "bottom";
  /** named font family (key into FONT_STACKS) */
  fontFamily?: string;
  /** label / text colour (falls back to ink) */
  textColor?: string;
  /** 0..1 shape opacity */
  opacity?: number;
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
  /** image source (data URL or remote URL) for image shapes */
  src?: string;
  /** connector endpoints — the ids of the shapes it links (re-routes as they move) */
  from?: ShapeId;
  to?: ShapeId;
  /** the edge each connector endpoint is anchored to (which dot was grabbed/dropped) */
  fromSide?: Side;
  toSide?: Side;
  /** a locked shape cannot be moved, resized or rotated until unlocked */
  locked?: boolean;
  /** optional hyperlink attached to the shape */
  link?: string;
  /** component family discriminator (only when type === "component") */
  kind?: ComponentKind;
  /** component data, persisted as a nested Y.Map so concurrent field edits merge */
  props?: Record<string, unknown>;
  /** reserved: ids of child shapes for container components (not yet persisted) */
  children?: ShapeId[];
  createdBy: UserId;
}

/** One message in a comment thread. */
export interface CommentMessage {
  id: string;
  author: string;
  color: string;
  text: string;
  ts: number;
}

/** A comment pin anchored on the board, with a thread of messages. */
export interface Comment {
  id: string;
  x: number;
  y: number;
  resolved: boolean;
  /** pin / thread theme colour */
  color: string;
  messages: CommentMessage[];
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
  /** the user's current viewport, broadcast so others can follow it */
  viewport?: { x: number; y: number; zoom: number };
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
