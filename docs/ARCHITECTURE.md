# Architecture

Cofield is an infinite collaborative canvas. The defining constraint is that multiple people across multiple teams edit the same board concurrently, including while offline, and every client must converge on identical state with no data loss. This document explains how the pieces fit, how an edit moves through the system, and where the time goes.

## Core design

**The Yjs document is the source of truth, and it is replicated rather than centralized.** Each connected client holds a full, convergent copy of the board. The server is a relay plus a durable store; it does not transform operations and is not an authority. This differs from an operational-transform design, where a central server rewrites every op against concurrent ones. Here, conflict resolution is a property of the data structure (a CRDT), so it happens identically on every client without coordination.

A second rule sits alongside the first: **presence is not document state.** Cursors and selections are high-frequency and ephemeral. They travel on the same socket but on a separate Awareness channel that is never persisted. Writing a cursor position into the document would bloat it and replay stale cursors on the next load.

## System context

```mermaid
flowchart TB
    subgraph ClientA["Client A (browser)"]
        UIA["Canvas UI: React + shadcn"]
        DocA["Yjs Doc (shapes, order, meta)"]
        AwareA["Awareness (cursor, selection)"]
        IDBA["y-indexeddb (offline cache)"]
        RenderA["Renderer: Canvas2D"]
    end

    subgraph ClientB["Client B (browser)"]
        DocB["Yjs Doc"]
        AwareB["Awareness"]
    end

    subgraph Server["Sync server (Node + ws)"]
        WS["y-websocket room handler"]
        Persist["y-leveldb (durable doc)"]
        Rooms["Room / team / auth glue (thin)"]
    end

    UIA --> DocA
    DocA <--> IDBA
    DocA --> RenderA
    DocA <--> WS
    AwareA <--> WS
    DocB <--> WS
    AwareB <--> WS
    WS <--> Persist
    Rooms --> WS
```

The client boxes are nearly symmetric with the server: each holds the same document type. The server's extra job is durability (leveldb) and routing (which socket belongs to which room).

## Module breakdown

| Module | Responsibility | Pure / unit-tested |
| --- | --- | --- |
| `app/` | Next.js routes: landing, `board/[boardId]`, `team/[teamId]`. SSR shell, client canvas. | no |
| `src/canvas/Canvas.tsx` | The viewport surface: owns the `<canvas>`, routes pointer/keyboard events to the active tool. | no |
| `src/canvas/renderer/` | `Renderer` interface + `Canvas2DRenderer`. The WebGL path implements the same interface. | partial |
| `src/canvas/tools/` | Tool state machine: select, draw, shape, text, pan. Each tool is a small reducer. | yes (logic) |
| `src/canvas/geometry/` | Hit-testing, marquee intersection, resize/rotate transforms, snapping. Pure functions in world space. | **yes** |
| `src/canvas/viewport/` | Pan/zoom, world↔screen transforms, viewport culling. | **yes** |
| `src/collab/doc.ts` | Yjs doc setup and typed shape helpers (the nested-`Y.Map`-per-shape model). | **yes** |
| `src/collab/provider.ts` | WebSocket provider behind a `SyncProvider` interface (swappable transport). | partial |
| `src/collab/awareness.ts` | Read/write presence on the Awareness channel; throttle outgoing cursor updates. | partial |
| `src/collab/offline.ts` | `y-indexeddb` wiring for the offline cache + instant load. | no |
| `src/presence/` | Cursor layer and avatar stack; renders ephemeral presence state. | no |
| `src/store/` | Zustand: active tool and UI-only state. Never the document. | yes (logic) |
| `src/ui/` | Re-themed shadcn primitives (toolbar, popover, dialog, avatar, command). | no |
| `server/index.ts` | `ws` server: auth-gates each room join, then relays sync + awareness. Durable doc storage is leveldb via `YPERSISTENCE`. | no |
| `server/auth.ts` | Validates the session cookie + board membership before a socket joins a room. | no |

`src/collab/` and `src/canvas/geometry/` are **pure** and tested without a browser. CRDT convergence and hit-testing are the parts that benefit most from unit tests, since their correctness is hard to verify by eye.

## Data model

### Persistent: the Yjs document (converges across clients)

```
Y.Doc
  shapes : Y.Map<ShapeId, Y.Map<field, value>>   // each shape is a nested Y.Map
  order  : Y.Array<ShapeId>                       // z-order
  meta   : Y.Map<string, unknown>                 // board name, background, etc.
```

```ts
interface Shape {
  id: string;
  type: "rect" | "ellipse" | "arrow" | "draw" | "sticky" | "text";
  x: number; y: number; w: number; h: number; rotation: number;
  style: { fill: string; stroke: string; strokeWidth: number };
  content?: string;   // sticky / text
  points?: number[];  // freehand
  createdBy: string;
}
```

**Why each shape is a nested `Y.Map` and not a plain object in one big map:** if a shape were a single value, two users editing different fields of it concurrently would clobber each other on merge. For example, one drags it (changes `x`/`y`) while the other recolors it (changes `style.fill`). As a nested `Y.Map`, each field is an independently mergeable CRDT register, so both edits survive and the shape converges to "moved *and* recolored." This field-level granularity is what makes concurrent edits to the same shape safe.

### Ephemeral: Awareness (never persisted)

```ts
interface Presence {
  userId: string;
  name: string;
  color: string;                              // one of 8 stable hues; drives cursor + tint
  cursor: { x: number; y: number } | null;    // world coords
  selection: string[];                        // shape ids
}
```

## How an edit moves through the system

```mermaid
sequenceDiagram
    participant A as Client A
    participant S as Sync server
    participant B as Client B
    A->>A: user drags shape → Y.Map update (local, optimistic)
    A->>A: renderer repaints immediately
    A->>S: Yjs update (binary diff)
    S->>S: apply to room doc + persist (leveldb)
    S->>B: broadcast update
    B->>B: Yjs merges (conflict-free) → renderer repaints
    Note over A,B: concurrent edits on the same shape converge<br/>with no lock, no rollback
```

The local edit is optimistic and repaints on the same frame; the network round-trip is off the interaction's critical path. When Client B receives the diff, Yjs merges it into B's copy by the same CRDT rules A applied, so both end identical regardless of message order or concurrency.

## Access model (and the planned team layer)

Access today is board-level: a board has members with roles (owner, editor, viewer), and membership gates both the board page and the websocket room join. The role is enforced at the relay, so a viewer's connection is read-only rather than trusted to behave. The Org and Team structure below is the intended next layer, not yet built.

```mermaid
erDiagram
    ORG ||--o{ TEAM : has
    TEAM ||--o{ MEMBERSHIP : has
    USER ||--o{ MEMBERSHIP : in
    TEAM ||--o{ BOARD : owns
    BOARD ||--o{ PRESENCE : "live (ephemeral)"
    USER ||--o{ PRESENCE : "casts"
```

With teams in place, membership would scope which boards a user sees, and presence would be scoped per board to distinguish teammates. `PRESENCE` is shown as a relationship, but it is **never stored**. It exists only as live Awareness state for the duration of a session.

## Performance model: where the time goes

The hot path is the paint loop, and the main optimization is **viewport culling**.

- **World vs screen separation.** All geometry (positions, sizes, hit-tests, transforms) is computed in world coordinates. The viewport applies a single transform (pan + zoom) only at render time. This keeps selection and resize math correct at any zoom and means a pan/zoom is a transform change, not a data change.
- **Viewport culling.** A board with 1000+ shapes cannot repaint every shape every frame. Each frame, only shapes whose world-space bounds intersect the visible rectangle are drawn. Culling is a spatial query against the viewport rect, so everything off-screen costs nothing.
- **Dirty-rect repaint.** When a small region changes (a cursor moves, one shape nudges), repaint only the affected rectangle rather than the whole canvas.
- **Cursor throttling + interpolation.** Outgoing cursor updates are throttled to ~30 to 60 ms on the Awareness channel; receivers interpolate between samples so motion looks smooth without flooding the socket. Presence never touches the document, so it never triggers a doc diff.
- **Renderer interface.** Canvas2D ships the MVP. Because culling and the world/screen split already exist, a `WebGLRenderer` implementing the same `Renderer` interface drops in for 10k+ shapes without changing tool or geometry code.

### Document growth and tombstones

CRDTs accumulate tombstones for deleted items so that concurrent operations referencing them still resolve. Left unbounded, the document grows. The mitigation is periodic **snapshotting** (compact the current state) and optional document **GC**, with the tradeoff that GC can complicate very-late-arriving offline edits. This tradeoff is recorded in [DECISIONS.md](DECISIONS.md).

## Failure and recovery

- **Disconnected.** The client keeps editing against its local doc and `y-indexeddb` cache. The UI shows a clear disconnected state; no edits are lost.
- **Reconnecting.** On reconnect, Yjs exchanges state vectors and syncs only the diff in both directions. Offline edits merge with edits made by others while away.
- **Server restart.** leveldb holds the durable doc; a restarted server rehydrates each room's document from disk, so clients resync to the persisted state rather than an empty board.
- **Conflicting concurrent edits.** Resolved by CRDT merge, with no lock and no rollback.

## Deployment topology

Two services, modeled exactly in `docker-compose.yml`:

- **web.** Next.js standalone output on `node:24-alpine`, served on `:3000`.
- **sync.** The Node `ws` + Yjs relay on `:4321`, with the leveldb store on a named `canvas-data` volume so boards survive `docker compose restart`.

`NEXT_PUBLIC_WS_URL` tells the browser where to reach the sync service. In production the web app deploys to a serverless host while the sync server runs on a small always-on host. The sync server holds long-lived sockets and a durable store, so it cannot be serverless.
