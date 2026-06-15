# Roadmap

Honest status, dated. The cut lines are explicit — what was deliberately deferred matters as much as what shipped. Scope discipline is the point.

Legend: ✅ shipped · 🚧 in progress · ⬜ planned

## MVP — the realtime canvas, complete

The bar: two browsers converge on identical state after concurrent edits; offline edits merge on reconnect with zero loss; cursors stay smooth with several users; the canvas is responsive at 500+ shapes; a deployed demo board is live and shareable.

- ⬜ **Infinite canvas** — pan (space-drag / scroll), zoom (ctrl-scroll / pinch), world coordinate system independent of the viewport.
- ⬜ **Shapes** — rectangle, ellipse, line/arrow, freehand draw, sticky note, text.
- ⬜ **Manipulation** — select, marquee multi-select, move, resize handles, delete, z-order.
- ⬜ **Realtime sync** — every change propagates to all clients via Yjs; conflict-free convergence.
- ⬜ **Presence / awareness** — live cursors with names + stable colors, selection tints, active-user avatar stack.
- ⬜ **Persistence** — board survives reload and server restart (leveldb on the server, IndexedDB on the client).
- ⬜ **Rooms** — a board is a room; a shareable URL joins it.
- ⬜ **Offline-safe** — edit while disconnected, reconnect, merge cleanly. Disconnected / reconnecting states designed and shown.

## v1 — the multi-team dimension

The differentiator most canvas clones skip.

- ⬜ **Org → Team → Board model** — team membership scopes which boards a user sees; presence distinguishes teammates.
- ⬜ **Permissions** — viewer / editor / owner per board.
- ⬜ **Comments & mentions** on shapes.
- ⬜ **Frames / sections**, snapping + alignment guides.
- ⬜ **Minimap.**

## v2 / stretch — named and deferred

Deliberately not in scope yet. Each is here so the cut line is visible, not because it was forgotten.

- ⬜ **WebGL renderer** for 10k+ shapes. *Deferred because* viewport culling and the world/screen split already make Canvas2D comfortable to 500+; WebGL's cost isn't justified until boards get an order of magnitude bigger. The `Renderer` interface keeps the door open (see ADR-004).
- ⬜ **Export** to PNG / SVG / PDF.
- ⬜ **Templates.**
- ⬜ **Auth integration.** *Deferred because* the MVP proves convergence and presence without coupling to an identity provider; rooms work by URL first.
- ⬜ **Embed / iframe** live boards.

## Explicitly out of scope

- **A custom CRDT.** Yjs is battle-tested; reimplementing the merge math would be ego, not engineering (ADR-001).
- **A managed realtime backend** for the MVP. Self-hosting demonstrates the protocol; the `SyncProvider` interface allows swapping later (ADR-002).
- **Server-authoritative operation transform.** The whole architecture rejects a central transform authority by design.

## Build sequence

Milestones tell the build story in commit history:

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
