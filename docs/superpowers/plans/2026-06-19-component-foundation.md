# Component Foundation + Frame/Table/Code Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a generic "component" element family (registry-driven, declarative customizations, hybrid canvas+DOM render) and ship its first three kinds — Frame, Table, Code block.

**Architecture:** A component is a normal `Shape` with `type: "component"` plus `kind` and a nested `props` `Y.Map`. A registry maps each `kind` to a definition (defaults, canvas `drawChrome`, optional DOM `Interior`, declarative `customSchema`, `measure`). The canvas paints chrome + a static snapshot (export/culling stay free); a viewport-transformed DOM layer mounts the interior for editing; a generic inspector renders the `customSchema`.

**Tech Stack:** Next.js 15 App Router, TypeScript strict, Yjs, Zustand, Canvas2D, Tailwind v4, shadcn (radix-ui), Vitest (pure modules), Playwright (UI verification).

## Global Constraints

- TypeScript strict; no `any` without a written reason.
- Geometry computed in world coordinates; viewport transform applies only at render.
- Document vs presence vs UI is a hard line: shared/durable → Yjs; UI/tool → Zustand.
- `src/canvas/geometry/` and `src/collab/` stay pure (no DOM) and unit-tested.
- Commits: Conventional Commits; subject ≤ 50 chars, imperative. **No AI/tool attribution, no `Co-Authored-By`.** Author every commit `Zana Salimi <zanasalimi21@gmail.com>`.
- Run commands with the npm-global pnpm on PATH: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH"` then `pnpm test` / `pnpm typecheck` / `pnpm lint`.
- Components persist in the existing `shapes` `Y.Map` + `order` `Y.Array` (reuse z-order/selection/undo/offline).
- Frame child reparenting/clipping is OUT OF SCOPE here (the `children` field is reserved but not persisted/used yet); the foundation must not preclude it.

---

## File Structure

- `src/collab/types.ts` — add `"component"` to `ShapeType`; `ComponentKind`; `kind`/`props`/`children` on `Shape`.
- `src/collab/doc.ts` — persist component `kind` + nested `props` `Y.Map`; `updateComponentProps`.
- `src/canvas/components/registry.ts` — `ComponentDef`, `CustomField`, `applyCustomField`, registry map, `getComponentDef`.
- `src/canvas/components/frame.ts` — frame `ComponentDef`.
- `src/canvas/components/table.ts` — table `ComponentDef`.
- `src/canvas/components/code.ts` — code-block `ComponentDef`.
- `src/canvas/components/index.ts` — registers the three kinds.
- `src/store/board-store.ts` — `DEFAULT_STYLE.component`, `makeComponent`, `addComponent`, `updateComponentProps`.
- `src/canvas/renderer/Canvas2DRenderer.ts` — `drawShape` `case "component"`.
- `src/canvas/ComponentInteriorLayer.tsx` — DOM overlay mounting `Interior` for visible components.
- `src/canvas/Inspector.tsx` — generic `customSchema` panel for the selected component.
- `src/ui/Toolbar.tsx` — an "Insert" flyout to place frame/table/code.
- `src/canvas/Canvas.tsx` — render `ComponentInteriorLayer`; wire insert placement.
- `app/board/[boardId]/page.tsx` — mount `Inspector`.
- Tests: `tests/collab/component-doc.test.ts`, `tests/canvas/component-registry.test.ts`, `tests/store/component-store.test.ts`.

---

## Task 1: Component fields in the model + doc roundtrip

**Files:**
- Modify: `src/collab/types.ts`
- Modify: `src/collab/doc.ts`
- Test: `tests/collab/component-doc.test.ts`

**Interfaces:**
- Produces: `ShapeType` includes `"component"`; `ComponentKind = "frame" | "table" | "code"`; `Shape.kind?: ComponentKind`; `Shape.props?: Record<string, unknown>`; `Shape.children?: ShapeId[]`; `updateComponentProps(board: BoardDoc, id: ShapeId, patch: Record<string, unknown>): void`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/collab/component-doc.test.ts
import { describe, it, expect } from "vitest";
import { createBoardDoc, addShape, readShape, updateComponentProps } from "@/collab/doc";
import type { Shape } from "@/collab/types";

function frame(id: string): Shape {
  return {
    id, type: "component", kind: "frame",
    x: 0, y: 0, w: 200, h: 120, rotation: 0,
    style: { fill: "#fff", stroke: "#1A1A1A", strokeWidth: 1 },
    props: { title: "Screen", preset: "free", bg: "#FFFFFF", radius: 12 },
    createdBy: "u1",
  };
}

describe("component persistence", () => {
  it("round-trips kind and props", () => {
    const b = createBoardDoc();
    addShape(b, frame("c1"));
    const got = readShape(b, "c1")!;
    expect(got.type).toBe("component");
    expect(got.kind).toBe("frame");
    expect(got.props).toEqual({ title: "Screen", preset: "free", bg: "#FFFFFF", radius: 12 });
  });

  it("merges prop patches without clobbering siblings", () => {
    const b = createBoardDoc();
    addShape(b, frame("c1"));
    updateComponentProps(b, "c1", { title: "Login" });
    const got = readShape(b, "c1")!;
    expect(got.props).toEqual({ title: "Login", preset: "free", bg: "#FFFFFF", radius: 12 });
  });

  it("converges on concurrent edits to different prop keys", async () => {
    const Y = await import("yjs");
    const a = createBoardDoc(new Y.Doc());
    const b = createBoardDoc(new Y.Doc());
    addShape(a, frame("c1"));
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    updateComponentProps(a, "c1", { title: "A" });
    updateComponentProps(b, "c1", { bg: "#000000" });
    Y.applyUpdate(b.doc, Y.encodeStateAsUpdate(a.doc));
    Y.applyUpdate(a.doc, Y.encodeStateAsUpdate(b.doc));
    expect(readShape(a, "c1")!.props).toEqual(readShape(b, "c1")!.props);
    expect(readShape(a, "c1")!.props!.title).toBe("A");
    expect(readShape(a, "c1")!.props!.bg).toBe("#000000");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test -- component-doc`
Expected: FAIL (`updateComponentProps` is not exported; `"component"`/`kind`/`props` not in types).

- [ ] **Step 3: Extend the types**

In `src/collab/types.ts`, add `"component"` to the `ShapeType` union, and after it add:

```ts
/** Rich, data-bearing element kinds rendered via the component registry. */
export type ComponentKind = "frame" | "table" | "code";
```

In the `Shape` interface add (near `link`):

```ts
  /** component family discriminator (only when type === "component") */
  kind?: ComponentKind;
  /** component data, persisted as a nested Y.Map so concurrent field edits merge */
  props?: Record<string, unknown>;
  /** reserved: ids of child shapes for container components (not yet persisted) */
  children?: ShapeId[];
```

- [ ] **Step 4: Persist kind + nested props in doc.ts**

In `src/collab/doc.ts`:

Add `"kind"` to `FIELDS` (do NOT add `"props"` or `"children"`):

```ts
const FIELDS: (keyof Shape)[] = ["id", "type", "x", "y", "w", "h", "rotation", "style", "content", "points", "src", "from", "to", "fromSide", "toSide", "locked", "link", "createdBy", "kind"];
```

In `toYMap`, after the `FIELDS` loop and before `return ym`:

```ts
  if (shape.type === "component" && shape.props) {
    const p = new Y.Map<unknown>();
    for (const [k, v] of Object.entries(shape.props)) p.set(k, v);
    ym.set("props", p);
  }
```

In `fromYMap`, add to the returned object (after `createdBy`):

```ts
    kind: ym.get("kind") as Shape["kind"],
    props: (ym.get("props") as Y.Map<unknown> | undefined)?.toJSON() as Record<string, unknown> | undefined,
```

Add the exported helper (near `updateShape`):

```ts
/** Patch a component's nested props map (per-field, merge-safe). */
export function updateComponentProps(board: BoardDoc, id: ShapeId, patch: Record<string, unknown>): void {
  const ym = board.shapes.get(id);
  const props = ym?.get("props") as Y.Map<unknown> | undefined;
  if (!props) return;
  board.doc.transact(() => {
    for (const [k, v] of Object.entries(patch)) if (v !== undefined) props.set(k, v);
  });
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test -- component-doc && pnpm typecheck`
Expected: 3 passing, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/collab/types.ts src/collab/doc.ts tests/collab/component-doc.test.ts
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "feat(collab): persist component kind + props"
```

---

## Task 2: Component registry + CustomField + the three definitions (pure parts)

**Files:**
- Create: `src/canvas/components/registry.ts`
- Create: `src/canvas/components/frame.ts`
- Create: `src/canvas/components/table.ts`
- Create: `src/canvas/components/code.ts`
- Create: `src/canvas/components/index.ts`
- Test: `tests/canvas/component-registry.test.ts`

**Interfaces:**
- Consumes: `ComponentKind`, `Shape`, `Viewport`.
- Produces:
  - `interface CustomField` (union below).
  - `interface ComponentDef<P>` with `kind`, `label`, `icon`, `group`, `defaults()`, `drawChrome(ctx, shape, vp)`, `Interior?`, `customSchema`, `measure?`.
  - `applyCustomField(props, key, value): Record<string, unknown>` (pure).
  - `getComponentDef(kind): ComponentDef` (throws on unknown).
  - `registerComponent(def)`, `componentList(): ComponentDef[]`.
  - Frame/table/code default props shapes (documented in code).

- [ ] **Step 1: Write the failing test**

```ts
// tests/canvas/component-registry.test.ts
import { describe, it, expect, beforeAll } from "vitest";
import { getComponentDef, applyCustomField, componentList } from "@/canvas/components/registry";
import "@/canvas/components"; // registers frame/table/code

describe("component registry", () => {
  beforeAll(() => void 0);

  it("lists the three Phase-1 kinds", () => {
    expect(componentList().map((d) => d.kind).sort()).toEqual(["code", "frame", "table"]);
  });

  it("frame defaults carry title/preset/bg/radius and a size", () => {
    const d = getComponentDef("frame").defaults();
    expect(d.props).toMatchObject({ preset: "free" });
    expect(d.w).toBeGreaterThan(0);
    expect(d.h).toBeGreaterThan(0);
  });

  it("table measure derives size from column widths and row heights", () => {
    const def = getComponentDef("table");
    const props = { rows: 2, cols: 2, colW: [80, 120], rowH: [40, 40], headerRow: true, cells: [["", ""], ["", ""]] };
    expect(def.measure!(props)).toEqual({ w: 200, h: 80 });
  });

  it("applyCustomField returns a new object with the key set", () => {
    const next = applyCustomField({ title: "A", radius: 8 }, "title", "B");
    expect(next).toEqual({ title: "B", radius: 8 });
  });

  it("throws on an unknown kind", () => {
    expect(() => getComponentDef("nope" as never)).toThrow();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test -- component-registry`
Expected: FAIL (module not found).

- [ ] **Step 3: Write the registry**

```ts
// src/canvas/components/registry.ts
import type { LucideIcon } from "lucide-react";
import type { ComponententReactFC } from "react";
import type { Shape, ComponentKind } from "@/collab/types";
import type { Viewport } from "@/canvas/viewport/viewport";

export type CustomField =
  | { kind: "color"; key: string; label: string; allowNone?: boolean }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "number"; key: string; label: string; min?: number; max?: number; step?: number }
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

export function registerComponent(def: ComponentDef): void {
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
```

> Note: fix the stray import — the first line under `LucideIcon` should be removed; `React` is referenced via the global `React` namespace already available in `.tsx`-adjacent type position. In a `.ts` file, add `import type * as React from "react";` instead.

Replace the top imports with:

```ts
import type { LucideIcon } from "lucide-react";
import type * as React from "react";
import type { Shape, ComponentKind } from "@/collab/types";
import type { Viewport } from "@/canvas/viewport/viewport";
```

- [ ] **Step 4: Write the frame definition**

```ts
// src/canvas/components/frame.ts
import { Frame } from "lucide-react";
import type { ComponentDef } from "./registry";
import { roundRectPath } from "@/canvas/renderer/shapes-util"; // see Step 4b

export interface FrameProps {
  title: string;
  preset: "desktop" | "tablet" | "phone" | "slide" | "free";
  bg: string;
  radius: number;
}

const PRESET_SIZE: Record<FrameProps["preset"], { w: number; h: number }> = {
  desktop: { w: 1440, h: 1024 },
  tablet: { w: 834, h: 1112 },
  phone: { w: 390, h: 844 },
  slide: { w: 960, h: 540 },
  free: { w: 360, h: 260 },
};

export const frameDef: ComponentDef<FrameProps> = {
  kind: "frame",
  label: "Frame",
  icon: Frame,
  group: "structural",
  defaults: () => ({ props: { title: "Frame", preset: "free", bg: "#FFFFFF", radius: 12 }, w: 360, h: 260 }),
  customSchema: [
    { kind: "text", key: "title", label: "Title" },
    { kind: "select", key: "preset", label: "Preset", options: [
      { value: "free", label: "Free" }, { value: "desktop", label: "Desktop" },
      { value: "tablet", label: "Tablet" }, { value: "phone", label: "Phone" }, { value: "slide", label: "Slide" },
    ] },
    { kind: "color", key: "bg", label: "Background" },
    { kind: "number", key: "radius", label: "Radius", min: 0, max: 48, step: 1 },
  ],
  drawChrome(ctx, shape) {
    const p = shape.props as unknown as FrameProps;
    ctx.save();
    ctx.fillStyle = p.bg ?? "#FFFFFF";
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = shape.style.strokeWidth || 1;
    roundRectPath(ctx, shape.x, shape.y, shape.w, shape.h, p.radius ?? 12);
    ctx.fill();
    ctx.stroke();
    // title above the frame
    ctx.fillStyle = "#6B6B66";
    ctx.font = "600 13px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "bottom";
    ctx.fillText(p.title ?? "Frame", shape.x + 2, shape.y - 6);
    ctx.restore();
  },
};
export { PRESET_SIZE };
```

- [ ] **Step 4b: Add the shared round-rect helper**

```ts
// src/canvas/renderer/shapes-util.ts
export function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number,
): void {
  const rr = Math.max(0, Math.min(r, Math.min(w, h) / 2));
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}
```

- [ ] **Step 4c: Write the table definition**

```ts
// src/canvas/components/table.ts
import { Table } from "lucide-react";
import type { ComponentDef } from "./registry";

export interface TableProps {
  rows: number;
  cols: number;
  colW: number[];
  rowH: number[];
  headerRow: boolean;
  cells: string[][];
}

function blankCells(rows: number, cols: number, prev?: string[][]): string[][] {
  return Array.from({ length: rows }, (_, r) =>
    Array.from({ length: cols }, (_, c) => prev?.[r]?.[c] ?? ""));
}

const COL = 120, ROW = 40;

export const tableDef: ComponentDef<TableProps> = {
  kind: "table",
  label: "Table",
  icon: Table,
  group: "structural",
  defaults: () => {
    const rows = 3, cols = 3;
    return {
      props: { rows, cols, colW: Array(cols).fill(COL), rowH: Array(rows).fill(ROW), headerRow: true, cells: blankCells(rows, cols) },
      w: cols * COL, h: rows * ROW,
    };
  },
  measure: (p) => ({ w: p.colW.reduce((a, b) => a + b, 0), h: p.rowH.reduce((a, b) => a + b, 0) }),
  customSchema: [
    { kind: "number", key: "rows", label: "Rows", min: 1, max: 30, step: 1 },
    { kind: "number", key: "cols", label: "Columns", min: 1, max: 12, step: 1 },
    { kind: "toggle", key: "headerRow", label: "Header row" },
  ],
  drawChrome(ctx, shape) {
    const p = shape.props as unknown as TableProps;
    ctx.save();
    ctx.translate(shape.x, shape.y);
    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, shape.w, shape.h);
    if (p.headerRow && p.rowH[0]) {
      ctx.fillStyle = "#F4F4F6";
      ctx.fillRect(0, 0, shape.w, p.rowH[0]);
    }
    ctx.strokeStyle = shape.style.stroke;
    ctx.lineWidth = 1;
    let y = 0;
    for (const h of p.rowH) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(shape.w, y); ctx.stroke(); y += h; }
    ctx.beginPath(); ctx.moveTo(0, shape.h); ctx.lineTo(shape.w, shape.h); ctx.stroke();
    let x = 0;
    for (const w of p.colW) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, shape.h); ctx.stroke(); x += w; }
    ctx.beginPath(); ctx.moveTo(shape.w, 0); ctx.lineTo(shape.w, shape.h); ctx.stroke();
    // cell text snapshot
    ctx.fillStyle = "#1A1A1A";
    ctx.font = "13px ui-sans-serif, system-ui, sans-serif";
    ctx.textBaseline = "middle";
    let cy = 0;
    for (let r = 0; r < p.rows; r++) {
      let cx = 0;
      for (let c = 0; c < p.cols; c++) {
        const text = p.cells[r]?.[c] ?? "";
        if (text) ctx.fillText(text, cx + 8, cy + (p.rowH[r] ?? ROW) / 2, (p.colW[c] ?? COL) - 12);
        cx += p.colW[c] ?? COL;
      }
      cy += p.rowH[r] ?? ROW;
    }
    ctx.restore();
  },
};

export { blankCells };
```

- [ ] **Step 4d: Write the code-block definition**

```ts
// src/canvas/components/code.ts
import { Code2 } from "lucide-react";
import type { ComponentDef } from "./registry";
import { roundRectPath } from "@/canvas/renderer/shapes-util";

export interface CodeProps {
  language: string;
  code: string;
  theme: "dark" | "light";
  lineNumbers: boolean;
  fontSize: number;
  title: string;
}

const PAD = 12, LINE = 18;

export const codeDef: ComponentDef<CodeProps> = {
  kind: "code",
  label: "Code block",
  icon: Code2,
  group: "structural",
  defaults: () => ({
    props: { language: "ts", code: "// code", theme: "dark", lineNumbers: true, fontSize: 13, title: "" },
    w: 360, h: 120,
  }),
  customSchema: [
    { kind: "select", key: "language", label: "Language", options: [
      { value: "ts", label: "TypeScript" }, { value: "js", label: "JavaScript" },
      { value: "py", label: "Python" }, { value: "json", label: "JSON" }, { value: "bash", label: "Shell" },
    ] },
    { kind: "select", key: "theme", label: "Theme", options: [{ value: "dark", label: "Dark" }, { value: "light", label: "Light" }] },
    { kind: "toggle", key: "lineNumbers", label: "Line numbers" },
    { kind: "number", key: "fontSize", label: "Font size", min: 9, max: 24, step: 1 },
    { kind: "text", key: "title", label: "Filename" },
  ],
  drawChrome(ctx, shape) {
    const p = shape.props as unknown as CodeProps;
    const dark = p.theme !== "light";
    const bg = dark ? "#0B0B22" : "#F7F7FB";
    const fg = dark ? "#E6E6F0" : "#1A1A1A";
    const gutter = dark ? "#5B5B8A" : "#9A9AB0";
    ctx.save();
    ctx.fillStyle = bg;
    roundRectPath(ctx, shape.x, shape.y, shape.w, shape.h, 10);
    ctx.fill();
    ctx.translate(shape.x, shape.y);
    ctx.font = `${p.fontSize ?? 13}px ui-monospace, SFMono-Regular, Menlo, monospace`;
    ctx.textBaseline = "top";
    const gx = p.lineNumbers ? 34 : PAD;
    const lines = (p.code ?? "").split("\n");
    for (let i = 0; i < lines.length; i++) {
      const y = PAD + i * LINE;
      if (y + LINE > shape.h) break;
      if (p.lineNumbers) { ctx.fillStyle = gutter; ctx.fillText(String(i + 1), PAD, y); }
      ctx.fillStyle = fg;
      ctx.fillText(lines[i] ?? "", gx, y, shape.w - gx - PAD);
    }
    ctx.restore();
  },
};
```

- [ ] **Step 4e: Register the three kinds**

```ts
// src/canvas/components/index.ts
import { registerComponent } from "./registry";
import { frameDef } from "./frame";
import { tableDef } from "./table";
import { codeDef } from "./code";

registerComponent(frameDef);
registerComponent(tableDef);
registerComponent(codeDef);
```

- [ ] **Step 5: Run tests + typecheck**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test -- component-registry && pnpm typecheck`
Expected: 5 passing, typecheck clean.

- [ ] **Step 6: Commit**

```bash
git add src/canvas/components src/canvas/renderer/shapes-util.ts tests/canvas/component-registry.test.ts
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "feat(canvas): component registry + frame/table/code defs"
```

---

## Task 3: board-store factory + insert + prop updates

**Files:**
- Modify: `src/store/board-store.ts`
- Test: `tests/store/component-store.test.ts`

**Interfaces:**
- Consumes: `getComponentDef`, `updateComponentProps`, existing `makeShape`/`addShape` patterns.
- Produces (on the store): `addComponent(kind: ComponentKind, at: { x: number; y: number }): string`; `updateComponentProps(id: string, patch: Record<string, unknown>): void`; `DEFAULT_STYLE.component`.

- [ ] **Step 1: Write the failing test**

```ts
// tests/store/component-store.test.ts
import { describe, it, expect, beforeEach } from "vitest";
import { useBoardStore } from "@/store/board-store";
import "@/canvas/components";

describe("board-store components", () => {
  beforeEach(() => useBoardStore.setState({ shapes: [] } as never));

  it("addComponent creates a component shape with registry defaults", () => {
    const id = useBoardStore.getState().addComponent("table", { x: 100, y: 80 });
    const s = useBoardStore.getState().getShape(id)!;
    expect(s.type).toBe("component");
    expect(s.kind).toBe("table");
    expect(s.props).toMatchObject({ rows: 3, cols: 3, headerRow: true });
    expect(s.x).toBe(100);
    expect(s.w).toBeGreaterThan(0);
  });

  it("updateComponentProps patches props locally when unbound", () => {
    const id = useBoardStore.getState().addComponent("frame", { x: 0, y: 0 });
    useBoardStore.getState().updateComponentProps(id, { title: "Login" });
    expect(useBoardStore.getState().getShape(id)!.props!.title).toBe("Login");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test -- component-store`
Expected: FAIL (`addComponent` undefined).

- [ ] **Step 3: Implement in board-store.ts**

Add the import:

```ts
import { getComponentDef } from "@/canvas/components/registry";
import { updateComponentProps as docUpdateComponentProps } from "@/collab/doc";
import type { ComponentKind } from "@/collab/types";
```

Add a `DEFAULT_STYLE.component` entry (place beside the other diagram defaults):

```ts
  component: { fill: "transparent", stroke: "#D7D7DE", strokeWidth: 1 },
```

Add the two store fields to the interface and the implementation. In the store object:

```ts
  addComponent: (kind: ComponentKind, at: { x: number; y: number }) => {
    const def = getComponentDef(kind);
    const { props, w, h } = def.defaults();
    const id = nextId();
    const shape: Shape = {
      id, type: "component", kind,
      x: at.x, y: at.y, w, h, rotation: 0,
      style: DEFAULT_STYLE.component, props,
      createdBy: "local",
    };
    if (bound) docAddShape(bound, shape);
    else set((s) => ({ shapes: [...s.shapes, shape] }));
    return id;
  },
  updateComponentProps: (id, patch) => {
    if (bound) docUpdateComponentProps(bound, id, patch);
    else set((s) => ({ shapes: s.shapes.map((sh) => (sh.id === id ? { ...sh, props: { ...sh.props, ...patch } } : sh)) }));
  },
```

Add their signatures to the store's TypeScript interface (mirror the existing method declarations). Use the existing `createdBy` convention if the store tracks identity; otherwise `"local"` matches `makeShape`.

- [ ] **Step 4: Run tests + typecheck**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test -- component-store && pnpm typecheck`
Expected: 2 passing, typecheck clean.

- [ ] **Step 5: Commit**

```bash
git add src/store/board-store.ts tests/store/component-store.test.ts
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "feat(store): addComponent + updateComponentProps"
```

---

## Task 4: Render components on the canvas

**Files:**
- Modify: `src/canvas/renderer/Canvas2DRenderer.ts`
- Modify: `src/canvas/Canvas.tsx` (ensure `@/canvas/components` is imported once so kinds register)

**Interfaces:**
- Consumes: `getComponentDef(shape.kind).drawChrome`.
- Produces: components paint inside the existing `drawShape` switch; unknown/missing kind falls back to a plain bordered rect (never throws).

- [ ] **Step 1: Add the component case to `drawShape`**

In `Canvas2DRenderer.ts`, import at top:

```ts
import { getComponentDef } from "@/canvas/components/registry";
```

In the `drawShape` `switch (shape.type)`, add:

```ts
      case "component": {
        try {
          getComponentDef(shape.kind!).drawChrome(ctx, shape, { x: 0, y: 0, zoom: 1 });
        } catch {
          ctx.strokeStyle = shape.style.stroke;
          ctx.lineWidth = shape.style.strokeWidth || 1;
          ctx.strokeRect(shape.x, shape.y, shape.w, shape.h);
        }
        break;
      }
```

> `drawChrome` draws in world coordinates; the renderer's outer transform already applies pan/zoom, so pass a neutral viewport. Keep the `vp` parameter in the signature for future kinds that need zoom-aware detail.

In `Canvas.tsx`, ensure the registry is loaded by adding near the other imports:

```ts
import "@/canvas/components";
```

- [ ] **Step 2: Verify it paints (Playwright)**

Run the app (`pnpm dev` + `pnpm sync` if available). In a Playwright check, call `useBoardStore.getState().addComponent("table", {x: 200, y: 200})` via `page.evaluate` (expose the store on `window` in dev, or place via the toolbar once Task 7 lands) and screenshot. Expected: a 3×3 table with a shaded header row renders on the canvas.

For this task, a lighter check is acceptable: add a Vitest smoke test that constructs a fake `CanvasRenderingContext2D` (a Proxy returning no-ops) and asserts `drawShape` does not throw for a component:

```ts
// tests/canvas/component-render.test.ts
import { describe, it, expect } from "vitest";
import "@/canvas/components";
import { getComponentDef } from "@/canvas/components/registry";

function fakeCtx(): CanvasRenderingContext2D {
  return new Proxy({}, { get: () => () => undefined }) as unknown as CanvasRenderingContext2D;
}

describe("component drawChrome", () => {
  for (const kind of ["frame", "table", "code"] as const) {
    it(`${kind} draws without throwing`, () => {
      const def = getComponentDef(kind);
      const { props, w, h } = def.defaults();
      const shape = { id: "x", type: "component", kind, x: 0, y: 0, w, h, rotation: 0, style: { fill: "transparent", stroke: "#000", strokeWidth: 1 }, props, createdBy: "u" } as never;
      expect(() => def.drawChrome(fakeCtx(), shape, { x: 0, y: 0, zoom: 1 })).not.toThrow();
    });
  }
});
```

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test -- component-render && pnpm typecheck`
Expected: 3 passing.

- [ ] **Step 3: Commit**

```bash
git add src/canvas/renderer/Canvas2DRenderer.ts src/canvas/Canvas.tsx tests/canvas/component-render.test.ts
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "feat(canvas): paint components via registry drawChrome"
```

---

## Task 5: Inspector panel (customSchema → controls)

**Files:**
- Create: `src/canvas/Inspector.tsx`
- Modify: `app/board/[boardId]/page.tsx`

**Interfaces:**
- Consumes: `getComponentDef(kind).customSchema`, `useUiStore` selection, `useBoardStore().updateComponentProps`, `applyCustomField` (for local optimistic display if needed; the store update is the source of truth).
- Produces: a right-side panel that renders one control per `CustomField` for the single selected component, writing changes through `updateComponentProps`.

- [ ] **Step 1: Write the Inspector**

```tsx
// src/canvas/Inspector.tsx
"use client";

import { getComponentDef, type CustomField } from "@/canvas/components/registry";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { Input } from "@/components/ui/input";

export function Inspector() {
  const selection = useUiStore((s) => s.selection);
  const editingId = useUiStore((s) => s.editingId);
  const shapes = useBoardStore((s) => s.shapes);
  if (selection.length !== 1 || editingId) return null;
  const shape = shapes.find((s) => s.id === selection[0]);
  if (!shape || shape.type !== "component" || !shape.kind) return null;

  const def = getComponentDef(shape.kind);
  const props = shape.props ?? {};
  const set = (key: string, value: unknown) => useBoardStore.getState().updateComponentProps(shape.id, { [key]: value });

  return (
    <div className="pointer-events-auto w-64 rounded-2xl border border-hairline bg-chrome p-3 shadow-toolbar">
      <p className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-ink-soft">{def.label}</p>
      <div className="flex flex-col gap-3">
        {def.customSchema.map((f) => (
          <Field key={f.key} field={f} value={props[f.key]} onChange={(v) => set(f.key, v)} />
        ))}
      </div>
    </div>
  );
}

function Field({ field, value, onChange }: { field: CustomField; value: unknown; onChange: (v: unknown) => void }) {
  const label = <span className="mb-1 block text-xs text-ink-soft">{field.label}</span>;
  if (field.kind === "text")
    return <label>{label}<Input value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="h-9" /></label>;
  if (field.kind === "number")
    return <label>{label}<Input type="number" min={field.min} max={field.max} step={field.step} value={Number(value ?? 0)} onChange={(e) => onChange(Number(e.target.value))} className="h-9" /></label>;
  if (field.kind === "toggle")
    return <label className="flex items-center justify-between"><span className="text-sm text-ink">{field.label}</span><input type="checkbox" checked={Boolean(value)} onChange={(e) => onChange(e.target.checked)} className="size-4 accent-primary" /></label>;
  if (field.kind === "color")
    return <label>{label}<input type="color" value={String(value ?? "#FFFFFF")} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-hairline" /></label>;
  // select
  return (
    <label>{label}
      <select value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-hairline bg-transparent px-2 text-sm text-ink">
        {field.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}
```

- [ ] **Step 2: Mount it in the board page**

In `app/board/[boardId]/page.tsx`, import `Inspector` and add inside the `relative flex-1` area:

```tsx
        <div className="pointer-events-none absolute right-5 top-5">
          <Inspector />
        </div>
```

- [ ] **Step 3: Verify (typecheck + Playwright)**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm typecheck && pnpm lint`
Expected: clean.

Playwright (after Task 7 provides insertion, or via store eval): insert a code block, select it, confirm the Inspector shows Language/Theme/Line numbers/Font size/Filename; change Theme to Light and confirm the canvas snapshot re-paints lighter.

- [ ] **Step 4: Commit**

```bash
git add src/canvas/Inspector.tsx "app/board/[boardId]/page.tsx"
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "feat(canvas): customSchema-driven inspector panel"
```

---

## Task 6: ComponentInteriorLayer (DOM editing for code + table)

**Files:**
- Create: `src/canvas/ComponentInteriorLayer.tsx`
- Modify: `src/canvas/components/code.ts` (add `Interior`)
- Modify: `src/canvas/components/table.ts` (add `Interior`)
- Modify: `src/canvas/Canvas.tsx` (render `<ComponentInteriorLayer />`)

**Interfaces:**
- Consumes: `componentList`/`getComponentDef(kind).Interior`, `useUiStore().viewport` + `editingId` + `selection`, `worldToScreen`, `useBoardStore().updateComponentProps`.
- Produces: a viewport-transformed DOM layer that mounts a kind's `Interior` for the selected component; code/table interiors edit `props.code` / `props.cells`.

- [ ] **Step 1: Write the layer**

```tsx
// src/canvas/ComponentInteriorLayer.tsx
"use client";

import { getComponentDef } from "@/canvas/components/registry";
import { useUiStore } from "@/store/ui-store";
import { useBoardStore } from "@/store/board-store";
import { worldToScreen } from "./viewport/viewport";

export function ComponentInteriorLayer() {
  const viewport = useUiStore((s) => s.viewport);
  const selection = useUiStore((s) => s.selection);
  const shapes = useBoardStore((s) => s.shapes);
  const id = selection.length === 1 ? selection[0] : null;
  const shape = id ? shapes.find((s) => s.id === id) : null;
  if (!shape || shape.type !== "component" || !shape.kind) return null;
  const def = getComponentDef(shape.kind);
  if (!def.Interior) return null;

  const tl = worldToScreen(viewport, { x: shape.x, y: shape.y });
  const Interior = def.Interior;
  return (
    <div
      className="pointer-events-auto absolute origin-top-left"
      style={{ left: tl.x, top: tl.y, width: shape.w * viewport.zoom, height: shape.h * viewport.zoom, transform: `scale(${viewport.zoom})`, transformOrigin: "top left" }}
    >
      <div style={{ width: shape.w, height: shape.h }}>
        <Interior shape={shape} />
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add the code Interior**

In `src/canvas/components/code.ts`, add the `Interior` field to `codeDef` (a `.ts` file can hold JSX only if renamed; instead define the component in a sibling `.tsx`). Create `src/canvas/components/code-interior.tsx`:

```tsx
// src/canvas/components/code-interior.tsx
"use client";
import type { Shape } from "@/collab/types";
import { useBoardStore } from "@/store/board-store";
import type { CodeProps } from "./code";

export function CodeInterior({ shape }: { shape: Shape }) {
  const p = shape.props as unknown as CodeProps;
  const dark = p.theme !== "light";
  return (
    <textarea
      value={p.code ?? ""}
      onChange={(e) => useBoardStore.getState().updateComponentProps(shape.id, { code: e.target.value })}
      spellCheck={false}
      className="size-full resize-none rounded-[10px] border-none p-3 outline-none"
      style={{ background: "transparent", color: dark ? "#E6E6F0" : "#1A1A1A", font: `${p.fontSize ?? 13}px ui-monospace, monospace`, paddingLeft: p.lineNumbers ? 34 : 12 }}
    />
  );
}
```

Then in `code.ts` set `Interior: CodeInterior` by importing it: add `import { CodeInterior } from "./code-interior";` and `Interior: CodeInterior,` in the def.

- [ ] **Step 3: Add the table Interior**

Create `src/canvas/components/table-interior.tsx`:

```tsx
// src/canvas/components/table-interior.tsx
"use client";
import type { Shape } from "@/collab/types";
import { useBoardStore } from "@/store/board-store";
import type { TableProps } from "./table";

export function TableInterior({ shape }: { shape: Shape }) {
  const p = shape.props as unknown as TableProps;
  const setCell = (r: number, c: number, v: string) => {
    const cells = p.cells.map((row) => row.slice());
    (cells[r] ??= [])[c] = v;
    useBoardStore.getState().updateComponentProps(shape.id, { cells });
  };
  return (
    <div className="grid size-full" style={{ gridTemplateColumns: p.colW.map((w) => `${w}px`).join(" "), gridTemplateRows: p.rowH.map((h) => `${h}px`).join(" ") }}>
      {Array.from({ length: p.rows }).flatMap((_, r) =>
        Array.from({ length: p.cols }).map((__, c) => (
          <input
            key={`${r}-${c}`}
            value={p.cells[r]?.[c] ?? ""}
            onChange={(e) => setCell(r, c, e.target.value)}
            className="size-full border-none bg-transparent px-2 text-sm text-ink outline-none focus:bg-primary/5"
          />
        )),
      )}
    </div>
  );
}
```

Wire it in `table.ts`: `import { TableInterior } from "./table-interior";` and `Interior: TableInterior,`.

- [ ] **Step 4: Render the layer in Canvas**

In `src/canvas/Canvas.tsx`, add `import { ComponentInteriorLayer } from "./ComponentInteriorLayer";` and render it alongside the other overlays (after `<CommentsLayer />`):

```tsx
      <ComponentInteriorLayer />
```

- [ ] **Step 5: Verify (typecheck + Playwright)**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm typecheck && pnpm lint`
Expected: clean.

Playwright: insert a table, select it, type into a cell, click away → the canvas snapshot shows the typed text. Insert a code block, edit code, confirm canvas re-paints.

- [ ] **Step 6: Commit**

```bash
git add src/canvas/ComponentInteriorLayer.tsx src/canvas/components/code-interior.tsx src/canvas/components/table-interior.tsx src/canvas/components/code.ts src/canvas/components/table.ts src/canvas/Canvas.tsx
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "feat(canvas): DOM interiors for code + table editing"
```

---

## Task 7: Insert flyout in the toolbar

**Files:**
- Modify: `src/ui/Toolbar.tsx`
- Modify: `src/store/ui-store.ts` (add `pendingInsert: ComponentKind | null` + setter)
- Modify: `src/canvas/Canvas.tsx` (placement on pointer-down when `pendingInsert` set)

**Interfaces:**
- Consumes: `componentList()`, `useUiStore().pendingInsert`, `useBoardStore().addComponent`.
- Produces: a toolbar "Insert" button opening a flyout of the three kinds; choosing one arms `pendingInsert`; the next canvas click places it and selects it.

- [ ] **Step 1: Add ui-store state**

In `src/store/ui-store.ts`, add to the interface + implementation:

```ts
  pendingInsert: ComponentKind | null;     // interface
  setPendingInsert: (kind: ComponentKind | null) => void;
```
```ts
  pendingInsert: null,                       // initial state
  setPendingInsert: (pendingInsert) => set({ pendingInsert }),
```
Import the type: `import type { ComponentKind } from "@/collab/types";`. Clear it in `setActiveTool` (set `pendingInsert: null`) to match the `commentMode` pattern.

- [ ] **Step 2: Add the Insert flyout to the toolbar**

In `src/ui/Toolbar.tsx`, import `componentList` and render a `Plus`/`Shapes`-style flyout button after the comment tool that lists `componentList()` (icon + label); clicking one calls `useUiStore.getState().setPendingInsert(def.kind)` and closes the flyout. Mirror the existing shapes-flyout markup (`animate-pop-up`, `bottom-full`).

- [ ] **Step 3: Place on canvas click**

In `Canvas.tsx` `onPointerDown`, near the top (before the comment-mode branch):

```ts
      const pending = ui().pendingInsert;
      if (pending && e.button === 0) {
        const w = worldAt(e);
        const id = useBoardStore.getState().addComponent(pending, { x: w.x, y: w.y });
        ui().setPendingInsert(null);
        ui().setSelection([id]);
        useBoardStore.getState().commitHistory();
        return;
      }
```

Set the cursor to crosshair while `pendingInsert` is set (extend the existing `commentMode` cursor effect to also check `pendingInsert`).

- [ ] **Step 4: Verify (Playwright)**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm typecheck && pnpm lint`
Expected: clean.

Playwright: open Insert → Table, click canvas → a 3×3 table appears selected with the Inspector showing. Repeat for Frame and Code.

- [ ] **Step 5: Commit**

```bash
git add src/ui/Toolbar.tsx src/store/ui-store.ts src/canvas/Canvas.tsx
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "feat(ui): insert flyout for components"
```

---

## Task 8: Export coverage + end-to-end verification

**Files:**
- None new (verification + any fix to `exportPng` if a component is missing).

**Interfaces:**
- Consumes: existing `exportPng` in `Canvas.tsx`.

- [ ] **Step 1: Verify export includes components**

Insert one of each (frame, table, code), add cell + code text, trigger Export PNG (⌘⇧E). Open the PNG. Expected: all three render (chrome + snapshot text) on a white background. Because components paint via `drawShape`, no export change should be needed; if a component is missing, confirm `exportPng` iterates the same `drawShape` path and fix.

- [ ] **Step 2: Full suite**

Run: `export PATH="/c/Users/MAZESTA/AppData/Roaming/npm:$PATH" && pnpm test && pnpm typecheck && pnpm lint`
Expected: all green.

- [ ] **Step 3: Manual matrix (Playwright or by hand)**

- Insert frame/table/code; move, resize, rotate — chrome follows.
- Edit table cells + code text — snapshot updates; reload (offline cache) — values persist.
- Two browser tabs (if sync up) — a cell edit in one appears in the other.
- Inspector changes (theme, header row, radius, preset) — repaint correctly.
- Undo/redo across insert + prop edits.

- [ ] **Step 4: Commit any fixes**

```bash
git add -A
git -c user.name="Zana Salimi" -c user.email="zanasalimi21@gmail.com" commit -m "test: verify component export + persistence"
```

---

## Self-Review

**Spec coverage (Phase 1 rows of the design spec):**
- `"component"` ShapeType + nested `props` Y.Map → Task 1. ✓
- Component registry + `customSchema` → Task 2. ✓
- `drawChrome` canvas snapshot (export-safe) → Tasks 2, 4, 8. ✓
- `ComponentInteriorLayer` (DOM interior) → Task 6. ✓
- Inspector (declarative customizations) → Task 5. ✓
- Frame / Table / Code kinds with their listed customizations → Tasks 2, 5, 6. ✓
- Insertion path → Task 7. ✓
- `children` reserved, frame reparenting deferred → noted in Global Constraints. ✓

**Placeholder scan:** No TBD/TODO; every code step carries complete code. The one self-correcting note (registry import fix) is resolved inline in Task 2 Step 3.

**Type consistency:** `addComponent(kind, at)`, `updateComponentProps(id, patch)`, `getComponentDef(kind)`, `ComponentDef.drawChrome(ctx, shape, vp)`, `CustomField` union, `FrameProps`/`TableProps`/`CodeProps` are used identically across tasks. `Interior` lives in `.tsx` siblings (code-interior/table-interior) because `.ts` definition files can't hold JSX — accounted for in Task 6.

**Known follow-ups (out of scope, by design):** named ports/typed anchors, frame child clipping, syntax highlighting, column/row drag-resize, merged cells — all deferred to later phases per the spec.
