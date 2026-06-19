import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import type { Shape, ComponentKind } from "@/collab/types";
import type { Viewport } from "@/canvas/viewport/viewport";

export type CustomField =
  | { kind: "color"; key: string; label: string; allowNone?: boolean }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "number"; key: string; label: string; min?: number; max?: number; step?: number }
  | { kind: "slider"; key: string; label: string; min?: number; max?: number; step?: number }
  | { kind: "toggle"; key: string; label: string }
  | { kind: "text"; key: string; label: string; multiline?: boolean };

export interface ComponentDef<P = Record<string, unknown>> {
  kind: ComponentKind;
  label: string;
  icon: LucideIcon;
  group: "structural" | "wireframe" | "software" | "flow";
  defaults(): { props: P; w: number; h: number };
  drawChrome(ctx: CanvasRenderingContext2D, shape: Shape, vp: Viewport): void;
  Interior?: React.FC<{ shape: Shape }>;
  customSchema: CustomField[];
  measure?(props: P): { w: number; h: number };
  /** Called by the store when inspector edits arrive; merges the patch and rebuilds any derived fields (e.g. colW/rowH/cells for a table). Returns the fully-reconciled props. */
  reconcile?(props: P, patch: Partial<P>): P;
}

/** Pure: return a new props object with one key replaced. */
export function applyCustomField(
  props: Record<string, unknown>,
  key: string,
  value: unknown,
): Record<string, unknown> {
  return { ...props, [key]: value };
}

const registry = new Map<ComponentKind, ComponentDef>();

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- P is invariant (it appears in both defaults() return and measure(props) arg), so per-kind ComponentDef<P> can't unify; the registry stores mixed-P defs behind a type-erased Map
export function registerComponent(def: ComponentDef<any>): void {
  registry.set(def.kind, def);
}

export function getComponentDef(kind: ComponentKind): ComponentDef {
  const def = registry.get(kind);
  if (!def) throw new Error(`unknown component kind: ${String(kind)}`);
  return def;
}

export function componentList(): ComponentDef[] {
  return [...registry.values()];
}
