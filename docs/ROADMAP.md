# Roadmap

Current status, with cut lines. This lists what shipped, what's in progress, and what was cut from this version and why.

Legend: ✅ shipped · 🚧 in progress · ⬜ planned

## MVP — the realtime canvas, complete

Acceptance criteria: two browsers converge on identical state after concurrent edits; offline edits merge on reconnect with no loss; cursors stay smooth with several users; the canvas stays responsive at 500+ shapes; a deployed demo board is live and shareable.

- ⬜ **Infinite canvas** — pan (space-drag / scroll), zoom (ctrl-scroll / pinch), world coordinate system independent of the viewport.
- ⬜ **Shapes** — rectangle, ellipse, line/arrow, freehand draw, sticky note, text.
- ⬜ **Manipulation** — select, marquee multi-select, move, resize handles, delete, z-order.
- ⬜ **Realtime sync** — every change propagates to all clients via Yjs; conflict-free convergence.
- ⬜ **Presence / awareness** — live cursors with names + stable colors, selection tints, active-user avatar stack.
- ⬜ **Persistence** — board survives reload and server restart (leveldb on the server, IndexedDB on the client).
- ⬜ **Rooms** — a board is a room; a shareable URL joins it.
- ⬜ **Offline-safe** — edit while disconnected, reconnect, and merge. Disconnected and reconnecting states are designed and shown.

## v1 — the multi-team dimension

Team scoping on top of the canvas. Most canvas clones skip this.

- ⬜ **Org → Team → Board model** — team membership scopes which boards a user sees; presence distinguishes teammates.
- ⬜ **Permissions** — viewer / editor / owner per board.
- ⬜ **Comments & mentions** on shapes.
- ⬜ **Frames / sections**, snapping + alignment guides.
- ⬜ **Minimap.**

## v2 / stretch — named and deferred

Not in scope yet. Listed here so the cut line is visible.

- ⬜ **WebGL renderer** for 10k+ shapes. *Deferred because* viewport culling and the world/screen split already keep Canvas2D fast to 500+, and WebGL isn't worth its cost until boards get an order of magnitude bigger. The `Renderer` interface keeps the door open (see ADR-004).
- ⬜ **Export** to PNG / SVG / PDF.
- ⬜ **Templates.**
- ⬜ **Auth integration.** *Deferred because* the MVP covers convergence and presence without coupling to an identity provider; rooms work by URL first.
- ⬜ **Embed / iframe** live boards.

## Explicitly out of scope

- **A custom CRDT.** Yjs is mature and well-tested; reimplementing the merge math adds no value here (ADR-001).
- **A managed realtime backend** for the MVP. Self-hosting keeps the protocol in view, and the `SyncProvider` interface allows swapping to a managed backend later (ADR-002).
- **Server-authoritative operation transform.** The architecture has no central transform authority.

## Build sequence

Milestones, as they appear in commit history:

| Milestone | Deliverable | Demo |
| --- | --- | --- |
| M0 | Skeleton: Next app, themed shadcn, routes, empty canvas | — |
| M1 | Canvas core: viewport pan/zoom, world/screen transform, a static shape, coordinate HUD | infinite pan/zoom |
| M2 | Tools + editing: create/select/move/resize/delete, sticky + text, z-order, tool state machine | draw a board solo |
| M3 | Realtime sync: Yjs doc, ws server, two browsers converge | two windows sync live |
| M4 | Presence: live cursors, name labels, selection tints, avatar stack | cursors flying around |
| M5 | Offline + persistence: IndexedDB, server leveldb, reconnect-merge | offline edit → reconnect |
| M6 | Multi-team (v1) + polish: org/team/board, board list, share URLs, empty/error/loading states | — |
| M7 | Showcase: docs, diagrams, ADRs, media, deploy | — |
