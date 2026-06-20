# Decision log (ADRs)

Architecture decisions and their tradeoffs. Each entry records a choice between real alternatives that each carried a cost. New decisions are appended; superseded ones are marked rather than deleted.

---

## ADR-001: CRDT (Yjs) over operational transform or last-write-wins

**Status:** accepted · 2026-02-03

**Context.** Multiple users across multiple teams edit the same board concurrently, and they need to edit offline and merge on reconnect. The question is how concurrent edits resolve into one convergent state.

**Decision.** Use a CRDT (Yjs) as the document. Conflict resolution is a property of the data structure, applied identically on every replica with no central coordination.

**Alternatives rejected.**
- *Operational transform (OT).* Requires a central server that transforms each operation against all concurrent ones. Correct OT is hard to implement and couples every client to one authority, and offline support is difficult. That complexity buys nothing this product needs.
- *Last-write-wins (LWW).* Easy to build and wrong in ways that are hard to notice. If two users nudge the same shape concurrently, one edit is lost. That is unacceptable for a tool meant to avoid data races.

**Consequences.**
- (+) Convergence with no central transform server; offline support follows from the model; the server can be a relay.
- (+) Mature implementation, so the CRDT math is not ours to maintain.
- (−) The document accumulates tombstones for deleted items, so it grows over time (see ADR-005).
- (−) Larger on-the-wire and in-memory footprint than a plain last-write-wins map.

---

## ADR-002: Self-hosted `y-websocket` (Node `ws`) over a managed realtime service

**Status:** accepted · 2026-02-05

**Context.** The CRDT needs a transport to relay updates between clients and a place to persist them. Options range from running the sync protocol myself to renting a managed multiplayer backend (Liveblocks, PartyKit).

**Decision.** Self-host a Node `ws` server speaking the `y-websocket` protocol for the MVP. Put the provider behind a `SyncProvider` interface so the transport is swappable.

**Alternatives rejected.**
- *Liveblocks / PartyKit (managed).* Faster to ship and operationally hands-off, but it hides the machinery this project is meant to demonstrate, and it adds vendor lock-in and per-seat cost. Deferred behind the interface rather than ruled out permanently.

**Consequences.**
- (+) Full control of the protocol, and the realtime layer is owned rather than outsourced.
- (+) No third-party dependency or cost for the MVP; runs anywhere a Node process can.
- (+) The `SyncProvider` interface makes adopting a managed transport later a one-file change.
- (−) I own scaling, reconnection, and durability concerns a managed service would handle.
- (−) The sync server is stateful (long-lived sockets plus leveldb), so it cannot be serverless and needs a small always-on host.

---

## ADR-003: Awareness protocol for presence, kept out of the document

**Status:** accepted · 2026-02-06

**Context.** Cursors and selection highlights update many times per second and are only meaningful while a user is connected. They could be stored as part of the document or carried on a separate channel.

**Decision.** Carry presence on the Yjs **Awareness** protocol, a separate ephemeral channel over the same socket. It is never written to the persistent document.

**Alternatives rejected.**
- *Cursor/selection as document fields.* Every mouse move would produce a document update and a tombstone, bloating the document and the leveldb store. On load, stale cursor positions would replay. A cursor is not part of the board, so storing it there is the wrong model.

**Consequences.**
- (+) The persistent document stays small and presence noise never touches durability.
- (+) Awareness has built-in timeout semantics, so a disconnected user's cursor disappears automatically.
- (+) Cursor updates can be throttled and interpolated independently of document sync.
- (−) Two channels to reason about (document and awareness) instead of one.
- (−) Presence is lost on disconnect by design, which is acceptable since it has no meaning offline.

---

## ADR-004: Canvas2D now, WebGL behind a `Renderer` interface

**Status:** accepted · 2026-02-08

**Context.** The canvas must render shapes every frame and stay responsive as boards grow. Canvas2D is simple and universally supported. WebGL scales to far more shapes but is significantly more work.

**Decision.** Ship Canvas2D for the MVP, behind a `Renderer` interface. Design viewport culling and the world/screen coordinate split now, so a `WebGLRenderer` can implement the same interface later without touching tools or geometry.

**Alternatives rejected.**
- *WebGL from day one.* Premature. The MVP target (responsive at 500+ shapes) is within Canvas2D's reach once culling exists. WebGL's cost isn't justified until roughly 10k+ shapes.
- *Canvas2D with no abstraction.* Would couple rendering to tool and geometry code and turn the eventual WebGL move into a rewrite instead of an addition.

**Consequences.**
- (+) Fast path to a correct, debuggable MVP renderer.
- (+) The performance work that matters most (culling, dirty rects, world/screen separation) is renderer-agnostic and done once.
- (+) WebGL becomes an additive change rather than a rewrite.
- (−) Canvas2D will hit a ceiling on very large boards. The interface is the bet that the ceiling can be crossed without disruption.

---

## ADR-005: Tombstone growth: snapshot + optional GC, accepted as a known cost

**Status:** accepted · 2026-02-10

**Context.** CRDTs retain tombstones for deleted items so that concurrent and late-arriving operations referencing them still resolve. On a long-lived board with heavy editing, this grows the document and the leveldb store without bound.

**Decision.** Accept tombstones as the cost of CRDT correctness (ADR-001). Mitigate with periodic **snapshotting** (compact current state to a baseline) and **optional document GC**, applied conservatively.

**Alternatives rejected.**
- *Aggressive immediate GC.* Risks dropping the history that very late offline edits need to merge against, which can produce surprising results for a user who was offline for a long time.
- *Never compacting.* Leaves growth unbounded, so load time and memory degrade on busy boards.

**Consequences.**
- (+) Bounded growth in practice via snapshots, without sacrificing convergence guarantees.
- (−) GC adds a correctness edge: edits made offline before a GC, merged long after, need careful handling.
- (−) Snapshotting is extra server machinery and a tuning knob (how often, how aggressive).

This is the tradeoff worth being explicit about. CRDTs are not free, and the cost is the unbounded growth handled here.

---

## ADR-006: Client-side IndexedDB offline cache (`y-indexeddb`)

**Status:** accepted · 2026-02-11

**Context.** A board should load quickly on revisit and remain editable while the network is down. The browser needs somewhere durable to hold the local replica.

**Decision.** Persist the local Yjs document to IndexedDB via `y-indexeddb`. It serves both as an offline edit buffer and as a cache that hydrates the board before the socket connects.

**Alternatives rejected.**
- *In-memory only.* A reload while offline would lose unsynced edits, which is the failure this product must not have.
- *localStorage.* Too small and synchronous for a binary CRDT document.

**Consequences.**
- (+) Fast load from cache; edits survive reloads and offline periods; reconnect merges without manual intervention.
- (+) Pairs with server-side leveldb for durability on both ends of the wire.
- (−) Two persistence layers to keep coherent (client IndexedDB and server leveldb).
- (−) IndexedDB quota and eviction are browser-controlled, so very large boards need a size budget.

---

## ADR-007: Zustand for UI state, Yjs for document state

**Status:** accepted · 2026-02-12

**Context.** The app has two kinds of state with different lifetimes: shared, persisted document state (shapes, order, board meta) and local, ephemeral UI state (active tool, hovered handle, panel open).

**Decision.** Keep a hard split. The Yjs document owns everything shared and durable. Zustand owns local UI state only and never holds shape data.

**Alternatives rejected.**
- *One store for everything.* Conflates ephemeral UI with the synced document, invites accidentally syncing tool state or persisting UI noise, and blurs the boundary the architecture depends on.

**Consequences.**
- (+) An enforceable boundary: if it's shared, it's in Yjs; if it's local UI, it's in Zustand.
- (+) UI re-renders driven by Zustand stay decoupled from document update frequency.
- (−) Some glue code to bridge document changes into React renders (subscribe to Yjs, set derived UI state).
