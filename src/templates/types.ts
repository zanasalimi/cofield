/**
 * Template model — a reusable diagram (nodes + connectors) that can be dropped
 * onto a board. Nodes carry template-local refs; connectors reference those
 * refs and are re-linked to fresh shape ids at import time (see
 * board-store.importTemplate).
 */
import type { ShapeType, ShapeStyle, Side, ComponentKind } from "@/collab/types";

export type TemplateCategory = "uiux" | "flow" | "uml" | "cloud";

export interface TemplateNode {
  /** template-local id, referenced by edges */
  ref: string;
  type: ShapeType;
  x: number;
  y: number;
  w: number;
  h: number;
  /** centred label (rect/ellipse/diamond/…) or sticky/text body */
  content?: string;
  style?: Partial<ShapeStyle>;
  /** component kind + props (when type === "component") */
  kind?: ComponentKind;
  props?: Record<string, unknown>;
}

export interface TemplateEdge {
  from: string;
  to: string;
  fromSide?: Side;
  toSide?: Side;
  style?: Partial<ShapeStyle>;
}

/** The importable payload (board-store.importTemplate consumes this). */
export interface TemplateData {
  nodes: TemplateNode[];
  edges?: TemplateEdge[];
}

/** A gallery entry: metadata + its importable payload. */
export interface Template extends TemplateData {
  id: string;
  name: string;
  description: string;
  category: TemplateCategory;
}

export const CATEGORY_LABEL: Record<TemplateCategory, string> = {
  uiux: "UI / UX",
  flow: "Flowchart",
  uml: "UML & ER",
  cloud: "Cloud & System",
};
