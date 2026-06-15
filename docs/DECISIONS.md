# Decision log (ADRs)

Architecture decisions, with the tradeoffs stated honestly. Each one is here because there was a real fork and a real cost to the path taken. New decisions append; superseded ones are marked, not deleted.

---

## ADR-001: CRDT (Yjs) over operational transform or last-write-wins

**Status:** accepted · 2026-02-03

**Context.** Multiple users — across multiple teams — edit the same board concurrently, and they must be able to edit offline and merge on reconnect. The core question is how concurrent edits resolve into one convergent state.

**Decision.** Use a CRDT (Yjs) as the document. Conflict resolution is a property of the data structure, applied identically on every replica with no central coordination.

**Alternatives rejected.**
- *Operational transform (OT).* Requires a central server that transforms each operation against all concurrent ones. Correct OT is notoriously hard and couples every client to one authority; offline support is especially painful. The complexity buys nothing this product needs.
- *Last-write-wins (LWW).* Trivial to build and silently wrong. Two users nudging the same shape concurrently means one edit vanishes. Unacceptable for a tool whose entire promise is "no data race."

**Consequences.**
- (+) Convergence with no central transform server; offline-first falls out naturally; the server can be a dumb relay.
- (+) Battle-tested implementation; the hard CRDT math is not ours to get wrong.
- (−) The document accumulates tombstones for deleted items, so it grows over time (see ADR-005).
- (−) Larger on-the-wire and in-memory footprint than a naive last-write-wins map.

---

## ADR-002: Self-hosted `y-websocket` (Node `ws`) over a managed realtime service

**Status:** accepted · 2026-02-05

**Context.** The CRDT needs a transport to relay updates between clients and a place to persist them. Options range from running the sync protocol myself to renting a managed multiplayer backend (Liveblocks, PartyKit).

**Decision.** Self-host a Node `ws` server speaking the `y-websocket` protocol for the MVP. Put the provider behind a `SyncProvider` interface so the transport is swappable.

**Alternatives rejected.**
- *Liveblocks / PartyKit (managed).* Faster to ship and operationally hands-off, but it hides the exact machinery this project exists to demonstrate — and adds vendor lock-in and per-seat cost. Deferred behind the interface, not refused forever.

**Consequences.**
- (+) Full control of the protocol; the realtime layer is demonstrably understood, not outsourced.
- (+) No third-party dependency or cost for the MVP; runs anywhere a Node process can.
- (+) The `SyncProvider` interface makes adopting a managed transport later a one-file change.
- (−) I own scaling, reconnection, and durability concerns a managed service would handle.
- (−) The sync server is stateful (long-lived sockets + leveldb), so it cannot be serverless — it needs a small always-on host.

---

## ADR-003: Awareness protocol for presence, kept out of the document

**Status:** accepted · 2026-02-06

**Context.** Cursors and selection highlights update many times per second and are only meaningful while a user is connected. They could be stored as part of the document or carried on a separate channel.

**Decision.** Carry presence on the Yjs **Awareness** protocol — a separate, ephemeral channel over the same socket. It is never written to the persistent document.

**Alternatives rejected.**
- *Cursor/selection as document fields.* Every mouse move would produce a document update and a tombstone, bloating the doc and the leveldb store. On load, stale cursor positions would replay. Conceptually wrong: a cursor is not part of the board.

**Consequences.**
- (+) The persistent document stays small and meaningful; presence noise never touches durability.
- (+) Awareness has built-in timeout semantics — a disconnected user's cursor disappears automatically.
- (+) Lets us throttle and interpolate cursor updates independently of document sync.
- (−) Two channels to reason about (document vs awareness) instead of one.
- (−) Presence is lost on disconnect by design — acceptable, since it is meaningless when offline.

---

## ADR-004: Canvas2D now, WebGL behind a `Renderer` interface

**Status:** accepted · 2026-02-08

**Context.** The canvas must render shapes every frame and stay responsive as boards grow. Canvas2D is simple and universally supported; WebGL scales to far more shapes but is significantly more work.

**Decision.** Ship Canvas2D for the MVP, behind a `Renderer` interface. Design viewport culling and the world/screen coordinate split now, so a `WebGLRenderer` can implement the same interface later without touching tools or geometry.

**Alternatives rejected.**
- *WebGL from day one.* Premature. The MVP target (responsive at 500+ shapes) is comfortably within Canvas2D's reach once culling exists. WebGL's cost isn't justified until 10k+ shapes.
- *Canvas2D with no abstraction.* Would couple rendering to tool/geometry code and make the eventual WebGL move a rewrite instead of an addition.

**Consequences.**
- (+) Fast to a correct, debuggable MVP renderer.
- (+) The performance work that matters most (culling, dirty rects, world/screen separation) is renderer-agnostic and done once.
- (+) WebGL becomes an additive change, not a rewrite.
- (−) Canvas2D will hit a ceiling on very large boards; the interface is the bet that we can cross it without disruption.

---

## ADR-005: Tombstone growth — snapshot + optional GC, accepted as a known cost

**Status:** accepted · 2026-02-10

**Context.** CRDTs retain tombstones for deleted items so that concurrent and late-arriving operations referencing them still resolve. Over a long-lived board with heavy editing, this grows the document and the leveldb store unbounded.

**Decision.** Accept tombstones as the cost of CRDT correctness (ADR-001). Mitigate with periodic **snapshotting** (compact current state to a baseline) and **optional document GC**, applied conservatively.

**Alternatives rejected.**
- *Aggressive immediate GC.* Risks dropping the history that very-late offline edits need to merge against; can produce surprising results for a user who was offline for a long time.
- *Never compacting.* Leaves growth unbounded; load time and memory degrade on busy boards.

**Consequences.**
- (+) Bounded growth in practice via snapshots, without sacrificing convergence guarantees.
- (−) GC adds a correctness edge: edits made offline before a GC, merged long after, need careful handling.
- (−) Snapshotting is extra server machinery and a tuning knob (how often, how aggressive).

This is the tradeoff the project documents most honestly — CRDTs are not free, and pretending otherwise would be the tell of someone who hasn't run one in anger.

---

## ADR-006: Client-side IndexedDB offline cache (`y-indexeddb`)

**Status:** accepted · 2026-02-11

**Context.** A board should load instantly on revisit and remain editable while the network is down. The browser needs somewhere durable to hold the local replica.

**Decision.** Persist the local Yjs document to IndexedDB via `y-indexeddb`. It serves both as an offline edit buffer and as an instant-load cache that hydrates before the socket connects.

**Alternatives rejected.**
- *In-memory only.* A reload while offline would lose unsynced edits — the exact failure this product must not have.
- *localStorage.* Too small and synchronous for a binary CRDT document.

**Consequences.**
- (+) Instant load from cache; edits survive reloads and offline periods; reconnect merges cleanly.
- (+) Pairs with server-side leveldb for durability on both ends of the wire.
- (−) Two persistence layers to keep coherent (client IndexedDB + server leveldb).
- (−) IndexedDB quota and eviction are browser-controlled; very large boards need a size budget.

---

## ADR-007: Zustand for UI state, Yjs for document state

**Status:** accepted · 2026-02-12

**Context.** The app has two kinds of state with different lifetimes: shared, persisted document state (shapes, order, board meta) and local, ephemeral UI state (active tool, hovered handle, panel open).

**Decision.** Keep a hard split. The Yjs document owns everything shared and durable. Zustand owns local UI state only and never holds shape data.

**Alternatives rejected.**
- *One store for everything.* Conflates ephemeral UI with the synced document, invites accidentally syncing tool state or persisting UI noise, and blurs the line the whole architecture depends on.

**Consequences.**
- (+) A clean, enforceable boundary: if it's shared, it's in Yjs; if it's local UI, it's in Zustand.
- (+) UI re-renders driven by Zustand stay decoupled from document update frequency.
- (−) Some glue code to bridge document changes into React renders (subscribe to Yjs, set derived UI state).
