# Diagram Elements — Design Spec

Status: approved (design). Master catalog for the UI/UX-diagram and software-diagram
element set in Cofield. The build is phased; each phase gets its own implementation
plan. This document is the authoritative list of elements and their customizations.

## Goal

Make Cofield a credible tool for two diagram families:

- **UI/UX diagrams** — wireframes, app flows, sitemaps (the BrainScape reference).
- **Software diagrams** — flowcharts, UML, ER, architecture/cloud.

"Fully implemented" means: each element exists as a first-class, selectable,
connectable object with its own customization controls, persisted in the Yjs
document, painted in the canvas paint loop, and included in PNG export.

## Non-goals (this spec)

- Live code execution in code blocks (display only).
- Real component-library theming / design tokens beyond lo-fi vs hi-fi.
- Importing from Figma/draw.io/Mermaid (separate effort).
- Real-time collaborative cursors *inside* a table cell (cell value still merges via Yjs).

## Architecture

### Data model

Add exactly one `ShapeType`: `"component"`. A component is a normal `Shape`
(reusing move / resize / select / rotate / z-order / Yjs persistence / connector
anchoring) plus:

```ts
interface ComponentFields {
  kind: ComponentKind;             // "table" | "code" | "frame" | "card" | "uml.class" | ...
  props: Record<string, unknown>;  // typed per kind, validated by the registry
  children?: ShapeId[];            // for containers (frame, package)
}
```

Geometry and flowchart elements stay plain `ShapeType`s (terminator, parallelogram,
cylinder, document, predefined-process, off-page, junction) — they are cheap draw
cases that reuse the existing diagram-label system. Only data-bearing / kit elements
become components.

`props` is stored as a nested `Y.Map` per component (like the existing per-shape
`Y.Map`) so concurrent edits to different fields merge instead of clobbering.

### Component registry

`src/canvas/components/registry.ts` — one definition per kind:

```ts
interface ComponentDef<P> {
  kind: ComponentKind;
  label: string;
  icon: LucideIcon;
  group: "structural" | "wireframe" | "software" | "flow";
  defaults(): { props: P; w: number; h: number };
  drawChrome(ctx: CanvasRenderingContext2D, shape: Shape, vp: Viewport): void; // border/shadow/fill + static snapshot
  Interior?: React.FC<{ shape: Shape }>;   // DOM overlay for editable interior
  customSchema: CustomField[];             // declarative customization controls
  anchors?(shape: Shape): NamedPort[];     // typed ports beyond the 4 sides
  measure?(props: P): { w: number; h: number }; // intrinsic sizing (table from rows/cols)
}
```

The registry is the single extension point: a new element = one `ComponentDef`,
no edits to the core union, renderer switch, or selection code.

### Render path (hybrid: canvas chrome + DOM interior)

- **Canvas** (`Canvas2DRenderer`): for `type === "component"`, call
  `registry[kind].drawChrome(ctx, shape, vp)`. `drawChrome` paints the border,
  shadow, fill, **and a static snapshot** of the content (code text, cell text,
  control labels). The snapshot is what keeps culling and PNG export working
  unchanged.
- **DOM** (`ComponentInteriorLayer`, a viewport-transformed React layer like
  `TextOverlay` / `CommentsLayer`): mounts `registry[kind].Interior` for the
  selected/edited component so editing is crisp (real `<textarea>` for code,
  editable cells for tables, live controls for wireframe widgets). When not
  editing, the canvas snapshot is enough — the DOM interior can stay mounted only
  for visible components to bound DOM size.

PNG export uses the canvas snapshot only (no DOM rasterization in v1).

### Customizations are declarative

Each kind exposes a `customSchema: CustomField[]`. One generic inspector renders
it — there is no bespoke UI per element.

```ts
type CustomField =
  | { kind: "color"; key: string; label: string; allowNone?: boolean }
  | { kind: "select"; key: string; label: string; options: { value: string; label: string }[] }
  | { kind: "number"; key: string; label: string; min?: number; max?: number; step?: number }
  | { kind: "toggle"; key: string; label: string }
  | { kind: "text"; key: string; label: string; multiline?: boolean }
  | { kind: "list"; key: string; label: string; itemSchema: CustomField[] }; // rows/attrs/options
```

Shared style fields (fill / stroke / strokeWidth / opacity / font*) continue to
come from `ShapeStyle` and the existing `SelectionToolbar`. Kind-specific fields
come from `props` via `customSchema`, rendered in a side **Inspector** panel (the
toolbar stays for quick/common controls; the inspector holds the long tail).

### Ports / typed anchors

`anchors(shape)` returns named connection points (table row right-edge, UML
compartment, component lug). Connectors store an optional `fromPort` / `toPort`
id; absent → fall back to the existing 4-side anchoring. Reuse the existing
connector re-routing on move.

### Persistence & undo

Components live in the same `shapes` `Y.Map` and `order` `Y.Array`, so z-order,
selection, undo/redo, offline cache, and the awareness/selection tint all work
with zero new plumbing. `props` and `children` are nested `Y.Map`/`Y.Array`.

## Element catalog + customizations

Legend: ✓ exists · ➕ new shape type · ⬡ component kind.

### Structural
- ⬡ **Frame / artboard** — title; preset (Desktop/Tablet/Phone/Slide/Free); bg fill;
  clip children (bool); corner radius; border; shadow; export-just-this-frame.
- ⬡ **Table / grid** — rows; cols; col widths[]; row heights[]; header row/col toggles;
  per-cell `{ text, fill, align }`; border weight/color; banded rows; merged cells.
  (Base for UML class + ER entity.)
- ⬡ **Code block** — language; code text; theme (light/dark); line numbers (bool);
  wrap (bool); font size; filename/title; copy button.
- ✓ **Sticky** — color, font, align.
- ✓ **Text** — font family/size, bold/italic/underline/strike, align/valign, color.

### Connector (upgrade the existing connector)
- routing: straight / **elbow (orthogonal)** / curved (current bezier).
- line style: solid / **dashed** / dotted.
- thickness; color; opacity.
- start + end **markers**: none / arrow / open-arrow / circle / diamond / cross /
  ER-one / ER-many / ER-zero-or-one / ER-one-or-many.
- **label(s)**: start / mid / end, each with optional background.
- draggable **waypoints** (manual bends).
- jump-over crossings (bool).

### Flowchart set (new geometry `ShapeType`s)
Each reuses shared style (fill/stroke/width/opacity) + centered label (font/size/color/align):
- ➕ **terminator / stadium** (Start/End pill)
- ➕ **parallelogram** (I/O data)
- ➕ **cylinder** (database)
- ➕ **document** (wavy base)
- ➕ **predefined-process** (rect with side bars)
- ➕ **off-page connector** (pentagon)
- ➕ **junction** (small connector dot)
- ✓ process = rect · ✓ decision = diamond.

### Wireframe / UI kit (component kinds)
Each + shared style + lo-fi/hi-fi toggle:
- ⬡ **card** (title, body, elevation, radius, padding, image slot)
- ⬡ **button** (label, variant primary/secondary/ghost/outline, size, radius, icon, disabled)
- ⬡ **input** (label, placeholder, type text/password/search, state default/focus/error/disabled, helper)
- ⬡ **checkbox / toggle / radio** (checked, label, variant)
- ⬡ **dropdown / select** (options[], selected, open)
- ⬡ **image placeholder** (aspect ratio, icon, fill)
- ⬡ **avatar** (circle/square, initials/image, size, status dot)
- ⬡ **list** (items[] {text, icon?, secondary?}, divider, density)
- ⬡ **nav / app bar** (title, left icon, right actions[], variant)
- ⬡ **tabs** (tabs[], active index)
- ⬡ **device / browser frame** (device phone/tablet/desktop/browser, URL, status bar, color)
- ⬡ **icon** (icon name from set, size, color, stroke width)

### Software diagrams (component kinds; many reuse table)
- ⬡ **UML class** (name, stereotype, attributes[ visibility +/-/#, name:type ], methods[], abstract) — renders as a 3-compartment table.
- ⬡ **UML interface / enum** — class variants.
- ⬡ **UML actor** (stick figure + name).
- ⬡ **UML use-case** (oval + label).
- ⬡ **UML component / package** (component = rect with port lugs; package = frame with tab).
- ⬡ **UML note** (folded-corner rect + text).
- ⬡ **sequence lifeline** (head + dashed lifeline + activation bars; messages = connectors) — largest, last.
- **state** = rounded rect + terminator (reuses flow set).
- ⬡ **ER entity** (name + attribute rows, PK/FK toggles, type) — table-based.
- **ER relationship** = connector with cardinality markers (from connector upgrade).
- ⬡ **cloud / architecture icons** (DB, queue, cloud, server, user, service) — icon-node + label.

### Page node (BrainScape)
- ⬡ **page node** — icon badge glyph; category label ("Page"); title; color theme; on-port **"+" quick-add** (extends the existing quick-connect).

### Cross-cutting (not elements, but required)
- **Typed ports / anchors** — named connection points per element.
- **Auto-layout** — tree / layered arrange of selected or connected nodes + spacing controls.
- **Shape library / template panel** — side panel listing kits (Flowchart, Wireframe, UML, ER, Cloud) + insertable templates; drag-to-insert.
- **Edge annotation badge** — the lock/status chip on a connector.

## Phased build plan

Each phase is independently shippable and becomes its own implementation plan.

1. **Component foundation + 3 primitives** — `"component"` ShapeType; nested `props`
   `Y.Map`; component registry; `customSchema` inspector panel; `ComponentInteriorLayer`;
   canvas snapshot for export. Ship **Frame, Table/grid, Code block**.
2. **Connector upgrades** — routing (elbow/straight/curved), line styles
   (dashed/dotted), marker sets (incl. ER cardinality), edge labels, waypoints.
3. **Flowchart set + Page node** — 7 new geometry shapes + page-card component +
   port "+" quick-add.
4. **Wireframe / UI kit** — the 12 kit components + lo-fi/hi-fi.
5. **Software diagrams** — UML (class/interface/enum/actor/use-case/component/package/note),
   ER (entity + cardinality from P2), state. Sequence optional/last.
6. **Libraries, templates, ports, auto-layout** — side panel + typed ports +
   tree/layered layout + edge annotation badge.

## Testing

- Pure modules stay unit-tested (Vitest, no DOM): registry `defaults`/`measure`,
  `customSchema` → props application, table cell math, connector routing geometry,
  marker placement, auto-layout.
- CRDT-merge tests: concurrent edits to two cells / two `props` fields converge.
- Geometry: component hit-test, port anchor positions, connector re-route on move.
- Manual/Playwright: create each element, edit via inspector, export PNG contains it.

## Open questions

- Inspector placement: right-side panel vs expanding the floating toolbar. (Lean
  right-side panel for the long tail; toolbar keeps common controls.)
- Sequence diagrams may warrant their own spec given lifeline/activation semantics.
- Template content (starter diagrams) — separate authoring task once kits exist.
