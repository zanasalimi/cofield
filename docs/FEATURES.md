# Features

The exhaustive specification. Every feature is broken into sub-features, interactions, states, keyboard shortcuts, edge cases, failure modes, and acceptance criteria. Grouped by area, tiered **MVP / v1 / v2**.

**State vocabulary** used throughout: `idle` · `empty` · `loading` · `connected` · `disconnected` · `reconnecting` · `error`. Every surface that can be in more than one of these has each one specified.

**Conventions.** "World coords" = the board's own coordinate system, independent of zoom/pan. "Screen coords" = pixels in the viewport. All geometry is computed in world coords; the viewport transform is applied only at render.

---

## 0. Status snapshot — Cofield vs Miro

Where we stand against Miro today. The goal is **not** to clone all of Miro (a
1000-person product, hundreds of enterprise widgets and integrations) — it is to
match the **core collaborative canvas** that proves the hard engineering (realtime
CRDT, a smooth 60fps canvas, multiplayer presence, self-hosted infra) and skip the
parts that add scope without strengthening that story. Detailed specs per area
are in §1–§11 below.

Legend: ✅ done · 🟡 partial · ❌ missing · ⛔ out of scope (won't build)

**Canvas & nav** — ✅ infinite canvas · ✅ pan · ✅ zoom-to-cursor + readout + reset · ✅ dotted bg · ❌ zoom-to-fit · ❌ minimap · ❌ inertial zoom · ❌ frames + presentation

**Objects** — ✅ sticky · ✅ rectangle · ✅ ellipse · ✅ text · ✅ freehand pen · ✅ connectors (hover-dot create, straight/elbow auto-route, follows shapes, selectable, delete-cascades) · ❌ more shapes (triangle/diamond/star/…) · ❌ connector labels/curved/endpoint styles · ❌ images/upload · ❌ links/embeds/cards · ❌ tables/Kanban/mind-map · ⛔ docs/video/app widgets

**Editing** — ✅ select · ✅ shift multi-select · ✅ move · ✅ resize (8 handles) · ✅ rotate · 🟡 context toolbar (color + delete only; no font/line-style) · ❌ marquee select · ❌ **undo/redo** (biggest gap — Yjs UndoManager unwired) · ❌ copy/paste/duplicate · ❌ group/lock · ❌ z-order UI (`order` array exists) · ❌ align/distribute · ❌ snapping + smart guides · ❌ right-click menu

**Realtime & collab** — ✅ live cursors (named, stable color) · ✅ CRDT simultaneous edit · ✅ offline cache + instant reopen · 🟡 presence (cursors yes, avatar stack no) · ❌ follow mode · ❌ comments/@mentions · ❌ reactions/voting/timer · ⛔ AI assist

**Sharing & accounts** — ✅ email signup/signin · ✅ boards dashboard · ✅ invite by email + accept/reject + membership-gated (incl. the websocket) · 🟡 public link (demo board only) · ❌ roles (view/comment/edit) · ❌ folders/search/templates · ⛔ teams/orgs (cut by design — per-board sharing)

**Output & history** — ✅ durable server persistence (survives restart) · ❌ version history · ❌ export (PNG/PDF/SVG) · ⛔ integrations (Jira/Slack/…)

### Recommended build order (what moves the needle)

**Tier 1 — canvas parity (feels finished, all core engineering):**
1. Undo / redo (wire Yjs UndoManager) — table stakes
2. Marquee select
3. Copy / paste / duplicate
4. Snapping + smart guides
5. Right-click context menu + z-order controls
6. Font controls in the context toolbar
7. More shapes + connector color/width

**Tier 2 — collaboration depth (the multiplayer "wow"):**
8. Avatar stack + follow mode
9. Comments + reactions
10. Sharing roles (view / edit)

**Tier 3 — showcase polish:**
11. Frames + presentation mode
12. Templates, board search
13. Export to PNG/PDF, minimap

Everything ⛔ is intentionally skipped: enterprise surface area that costs weeks and
proves nothing a portfolio reviewer cares about.

---

## 1. Canvas & Viewport

### 1.1 Infinite canvas surface — MVP
The board has no edges. Content lives in an unbounded world coordinate space; the viewport is a movable window onto it.

- **States.**
  - `loading` — skeleton canvas with a subtle paper texture while the doc hydrates from IndexedDB / socket.
  - `empty` — first-load board with a centered, low-key prompt ("Pick a tool and start") and a hint to invite others; not a marketing splash.
  - `idle` — content present, no active interaction.
- **Edge cases.** Extreme world coordinates (far from origin) must not lose float precision in a way that visibly jitters shapes; coordinate values are kept within a safe range and the origin is not assumed to be where content is.
- **Acceptance.** Panning to ±100k world units and back returns shapes to pixel-identical screen positions. An empty board renders its empty state, not a blank white void.

### 1.2 Pan — MVP
- **Interactions.** Space-drag (hold Space, drag pointer); two-finger scroll / trackpad swipe; middle-mouse drag; arrow keys nudge the viewport when nothing is selected.
- **Cursor.** Grab (open hand) on Space-hold; grabbing (closed) while dragging.
- **Edge cases.** Pan during an active draw must not start a stroke; pan must not deselect the current selection.
- **Acceptance.** Pan is frame-smooth at 500+ shapes; releasing Space restores the previous tool and cursor.

### 1.3 Zoom — MVP
- **Interactions.** Ctrl/⌘-scroll to zoom toward the pointer; pinch on trackpad; `+` / `-` keys; `Shift+1` zoom-to-fit all content; `Shift+0` reset to 100%.
- **Behavior.** Zoom is anchored at the pointer (the world point under the cursor stays under the cursor). Clamped to a min/max range (e.g. 10%–800%).
- **Indicator.** A zoom-percentage readout in the toolbar; click it for a menu (50 / 100 / 200 / fit / reset).
- **Edge cases.** Zoom must not drift the anchor over repeated small steps; at max zoom-out, culling must keep the frame rate up rather than drawing thousands of sub-pixel shapes.
- **Acceptance.** The world point under the cursor is invariant across a zoom gesture to within 1px; zoom is clamped and never inverts.

### 1.4 World ↔ screen coordinate transform — MVP
- A single transform (translate + scale) maps world to screen. All hit-testing, selection, and tool math run in world space; only the renderer applies the transform.
- **Acceptance (tested).** `screenToWorld(worldToScreen(p)) === p` within float tolerance for arbitrary pan/zoom. Pure unit tests, no DOM.

### 1.5 Viewport culling — MVP
- Each frame, only shapes whose world bounds intersect the visible rectangle are drawn.
- **Acceptance (tested).** Given N shapes and a viewport rect, the cull set equals exactly the shapes intersecting the rect (boundary-inclusive). Off-screen shape count does not affect per-frame draw cost.

### 1.6 Coordinate / status HUD — MVP
- A small unobtrusive readout: current pointer world coords, zoom %, shape count, connection state dot.
- **States.** The connection dot reflects `connected` (filled), `reconnecting` (pulsing), `disconnected` (hollow), `error` (red).

### 1.7 Minimap — v1
- A corner overview of the whole board with a draggable viewport rectangle; click-to-jump.
- **States.** `empty` (no content → minimap hidden or shows just the viewport frame); updates live as others edit off-screen.
- **Acceptance.** Dragging the minimap rectangle pans the main viewport 1:1 in world space.

---

## 2. Shapes & Tools

### 2.1 Tool state machine — MVP
A single active tool at a time; tools are small reducers over pointer/keyboard events. Switching tools cancels any in-progress operation cleanly.

- **Tools & shortcuts.** `V` select · `H` pan/hand · `R` rectangle · `O` ellipse · `L` line/arrow · `P` pencil (freehand) · `S` sticky · `T` text.
- **Edge cases.** Pressing a tool shortcut mid-draw commits or cancels the current op deterministically (never leaves a half-shape); `Esc` cancels the current tool action and returns to select.
- **Acceptance.** No sequence of tool switches can leave a partial/orphan shape in the document.

### 2.2 Rectangle / Ellipse — MVP
- **Interactions.** Drag to size from corner; `Shift` constrains to square/circle; `Alt` draws from center. Click without dragging drops a default-sized shape.
- **States.** `idle` after commit (auto-selected); the shape is created as a nested `Y.Map` so concurrent field edits merge.
- **Edge cases.** Zero-area drag (click) yields a sensible default, not a 0×0 invisible shape.

### 2.3 Line / Arrow — MVP
- **Interactions.** Drag from start to end; `Shift` snaps to 0/45/90°. Arrowhead toggle in the contextual style bar.
- **Edge cases.** Degenerate zero-length line is discarded on release.

### 2.4 Freehand (pencil) — MVP
- **Interactions.** Pointer-down begins a stroke; points are captured and stored in `points[]`; pointer-up commits.
- **Performance.** Points are simplified (douglas-peucker-style) on commit to bound array size; live stroke renders raw for responsiveness.
- **Edge cases.** A very long stroke must not unbounded-grow the document; an interrupted stroke (disconnect mid-draw) still commits locally and syncs on reconnect.

### 2.5 Sticky note — MVP
- **Interactions.** Click to place a fixed-size note; immediately enters text edit. Slightly handwritten/rounded face, soft physical shadow, flat radius — reads "tactile," not "card."
- **States.** `empty` (placeholder "Type…"), `editing` (caret, autosize height), `idle`.
- **Edge cases.** Empty note on blur is removed (no orphan empty stickies); very long text grows the note within a max, then scrolls.

### 2.6 Text — MVP
- **Interactions.** Click to place a text cursor; type; click-drag to set a wrapping width. Double-click existing text to edit.
- **States.** `empty`, `editing`, `idle`. Empty text on blur is removed.
- **Edge cases.** Concurrent text edits by two users on the same text block merge character-wise (CRDT text), not last-write-wins.

### 2.7 Contextual style bar — MVP
- When a shape (or multi-selection) is selected, a contextual bar exposes fill, stroke, stroke width, and (for text/sticky) font size. Fill/stroke use a curated swatch popover, not a raw hex field by default.
- **States.** Mixed-value indicator when a multi-selection has differing values.
- **Edge cases.** Changing fill while another user moves the same shape must merge (per-field `Y.Map`), not clobber.

---

## 3. Selection & Transform

### 3.1 Single select — MVP
- **Interactions.** Click a shape to select; click empty canvas to deselect. Hit-testing is in world space and respects z-order (topmost under the pointer wins).
- **Acceptance (tested).** Hit-test returns the topmost shape whose world geometry contains the point, accounting for rotation.

### 3.2 Marquee multi-select — MVP
- **Interactions.** Drag on empty canvas to draw a marquee; shapes intersecting (or fully contained, configurable) are selected. `Shift`-drag adds to selection.
- **Acceptance (tested).** Given a marquee rect and shapes, the selected set equals exactly those matching the intersection rule.

### 3.3 Additive / subtractive selection — MVP
- `Shift`-click toggles a shape in/out of the selection; `⌘/Ctrl+A` selects all (on-screen and off).

### 3.4 Move — MVP
- **Interactions.** Drag a selection; arrow keys nudge by 1px (world), `Shift`+arrow by 10px. Live snap guides in v1.
- **Edge cases.** Moving a shape another user is simultaneously resizing must converge (different fields).

### 3.5 Resize handles — MVP
- **Interactions.** Eight handles (corners + edges). Corner drag scales; `Shift` preserves aspect; `Alt` resizes from center. Handles render in screen space but operate on world geometry.
- **Edge cases.** Resize below a minimum size clamps rather than inverting; resize under zoom keeps handle hit-areas usable (handle size is constant in screen px).
- **Acceptance (tested).** Resize transforms are pure functions of (handle, pointer delta, modifiers) in world space.

### 3.6 Rotate — MVP
- **Interactions.** A rotate affordance above the selection; `Shift` snaps to 15° increments. Rotation stored per-shape (`rotation`).
- **Acceptance (tested).** Rotation math composes correctly with resize and is correct at any zoom.

### 3.7 Z-order — MVP
- **Interactions.** Bring forward / send backward / to front / to back via context menu and `⌘/Ctrl+]` / `[`. Order is the `Y.Array<ShapeId>`.
- **Edge cases.** Concurrent reordering by two users converges deterministically (CRDT array).

### 3.8 Delete — MVP
- **Interactions.** `Delete` / `Backspace` removes the selection. Deletion produces tombstones (expected; see persistence).
- **Edge cases.** Deleting a shape another user is editing is safe; their edits resolve against the tombstone.

### 3.9 Copy / paste / duplicate — MVP
- `⌘/Ctrl+C` / `V`, `⌘/Ctrl+D` duplicate with a small offset. Pasted shapes get fresh IDs and `createdBy`.

### 3.10 Undo / redo — MVP
- Per-user undo stack scoped to that user's own operations (Yjs UndoManager), so undo doesn't revert a teammate's concurrent edit.
- **Shortcuts.** `⌘/Ctrl+Z`, `⌘/Ctrl+Shift+Z`.
- **Acceptance.** Undo reverts only the local user's last operation, never another client's.

### 3.11 Snapping & alignment guides — v1
- Edge/center snap to nearby shapes with live guide lines; distribute/align actions for multi-selection.

### 3.12 Frames / sections — v1
- Named containers that group and clip content; moving a frame moves its children.

---

## 4. Realtime Sync

### 4.1 Document replication — MVP
- Every shape/order/meta change is a Yjs update broadcast as a binary diff; all clients converge.
- **States.** `connected` (updates flow live), `disconnected` (local edits queue in IndexedDB), `reconnecting` (state-vector exchange in progress).
- **Acceptance (tested).** Script two docs, apply divergent concurrent ops, assert byte-identical convergent state regardless of apply order.

### 4.2 Optimistic local apply — MVP
- Local edits apply to the local doc and repaint on the same frame; the network round-trip is off the critical path.
- **Acceptance.** Drag latency is independent of network RTT.

### 4.3 Per-field merge granularity — MVP
- Each shape is a nested `Y.Map`; concurrent edits to different fields (move vs recolor) both survive.
- **Acceptance (tested).** Two clients edit different fields of one shape concurrently → final shape reflects both edits.

### 4.4 Connection lifecycle & indicator — MVP
- A visible connection state at all times (HUD dot + toast on transition). Reconnect uses backoff; the user is told when offline and when resynced.
- **States.** `connected` · `reconnecting` (pulsing, "Reconnecting…") · `disconnected` ("Offline — your edits are saved locally") · `error` (fatal, with a retry action).
- **Failure modes.** Server unreachable on load → board still opens from IndexedDB cache in `disconnected` state. Socket drops mid-session → `reconnecting`, edits continue locally. Auth/room rejection → `error` with a clear message.

### 4.5 Reconnect merge — MVP
- On reconnect, Yjs exchanges state vectors and syncs only the diff both ways; offline edits merge with others' edits made while away.
- **Acceptance.** After an offline editing session, reconnect produces zero data loss on either side and converges.

### 4.6 Room joining — MVP
- A board URL maps to a room; joining loads (or creates) that room's doc.
- **Edge cases.** Unknown board id → a clear "board not found / create new" path, not a crash. Two tabs of the same user count as two presences.

---

## 5. Presence & Cursors

### 5.1 Live multiplayer cursors — MVP
- Each connected user's cursor renders in world space with a colored pointer and a name label.
- **Performance.** Outgoing cursor position throttled to ~30–60ms on the Awareness channel; receivers interpolate between samples for smoothness.
- **States.** A user with no pointer over the canvas has `cursor: null` (no ghost cursor shown). On disconnect, the cursor disappears via Awareness timeout — no stale cursors.
- **Acceptance.** Cursors are smooth with 5+ users and never persist after a user leaves.

### 5.2 Stable user colors — MVP
- Each user is assigned one of **eight curated, saturated hues** (the brand), stable for the session and used for both cursor and selection tint. Not random HSL.
- **Edge cases.** More than 8 users → colors cycle deterministically; the same user keeps the same color across their tabs where identity is known.

### 5.3 Selection tints — MVP
- When a user selects shapes, those shapes show a tint/outline in that user's color ("Sara is editing this"). Carried on Awareness, not the document.
- **Edge cases.** Two users selecting the same shape show layered tints, not one overwriting the other's presence.

### 5.4 Active-user avatar stack — MVP
- A stack of avatars (initials + color) for everyone in the room; overflow collapses to "+N". Hover shows names; click to jump to that user's cursor (v1).
- **States.** `empty` (just you → solo indicator), populates live as users join/leave.

### 5.5 Follow / spotlight — v1
- Click an avatar to follow that user's viewport; a presenter can spotlight their view to the room.

### 5.6 Scoped team presence — v1
- In the multi-team model, presence visually distinguishes teammates from other-team collaborators on a shared board.

---

## 6. Offline & Persistence

### 6.1 Client offline cache (`y-indexeddb`) — MVP
- The local doc persists to IndexedDB; the board loads instantly from cache and remains fully editable offline.
- **States.** `loading` (hydrating from IndexedDB before socket), then `disconnected` or `connected`.
- **Failure modes.** IndexedDB unavailable / quota exceeded → degrade to in-memory with a warning; never block editing. Corrupt cache → discard and resync from server.
- **Acceptance.** Reloading the page while offline preserves all unsynced local edits.

### 6.2 Server durable store (`y-leveldb`) — MVP
- The sync server persists each room's doc to leveldb (named volume in Docker), so boards survive a process restart.
- **Acceptance.** `docker compose restart` then reopen → the board is exactly as left.

### 6.3 Snapshotting & GC — MVP (designed) / tuned in v1
- Periodic snapshots compact the doc; optional conservative GC bounds tombstone growth.
- **Edge cases.** Very-late offline edits merged after a GC are handled conservatively (documented tradeoff).

### 6.4 Offline → reconnect flow (the demo) — MVP
- Go offline, edit, come back — edits merge with no loss. The headline reliability demo.
- **States surfaced.** `disconnected` banner → `reconnecting` → toast "Synced" on success.

---

## 7. Rooms & Multi-team

### 7.1 Board as a room — MVP
- One board = one room = one shareable URL. Anyone with the URL joins (MVP has no auth gate).
- **Edge cases.** First visitor to a new id creates the room; concurrent first-creates converge to one room.

### 7.2 Org → Team → Board model — v1
- Org contains Teams; Teams own Boards; Users have Memberships in Teams. Team membership scopes which boards a user sees.
- **States.** Team board list with `empty` (no boards → create-first prompt), `loading`, `error`.

### 7.3 Board list / dashboard — v1
- Per-team grid of boards with last-edited, live-presence pips (who's in there now), and create/rename/delete.
- **States.** `empty`, `loading` (skeleton grid), `error` (retry).

### 7.4 Team membership & roster — v1
- Invite to team, list members, remove. Presence on boards reflects team identity.

---

## 8. Sharing & Permissions

### 8.1 Share dialog — MVP (link) / v1 (roles)
- A share dialog yields the room URL with copy-to-clipboard and a success toast.
- **States.** `idle`, copied (transient confirmation), `error` (clipboard blocked → manual-select fallback).

### 8.2 Per-board roles — v1
- viewer / editor / owner. Viewers get a read-only canvas (tools disabled, cursor still shown). Owners manage roles and can delete the board.
- **States.** Read-only mode is a first-class UI state: tools greyed, a "View only" badge, edits blocked at the boundary (not just hidden).
- **Edge cases.** A role downgrade mid-session takes effect live; in-flight edits from a now-viewer are rejected at the server boundary.

### 8.3 Comments & mentions — v1
- Threaded comments anchored to shapes; `@`-mentions notify mentioned teammates.
- **States.** `empty` (no comments), `loading`, resolved/unresolved threads.

### 8.4 Auth integration — v2
- Identity provider wired in; rooms gated by real users instead of open URLs.

---

## 9. Cross-cutting: keyboard shortcuts (reference)

| Action | Shortcut |
| --- | --- |
| Select / Pan tools | `V` / `H` |
| Rectangle / Ellipse / Line | `R` / `O` / `L` |
| Pencil / Sticky / Text | `P` / `S` / `T` |
| Cancel current action | `Esc` |
| Delete selection | `Delete` / `Backspace` |
| Select all | `⌘/Ctrl+A` |
| Copy / Paste / Duplicate | `⌘/Ctrl+C` / `V` / `D` |
| Undo / Redo | `⌘/Ctrl+Z` / `⌘/Ctrl+Shift+Z` |
| Nudge / large nudge | Arrows / `Shift`+Arrows |
| Z-order forward / back | `⌘/Ctrl+]` / `[` |
| Zoom in / out / fit / 100% | `+` / `-` / `Shift+1` / `Shift+0` |
| Command palette | `⌘/Ctrl+K` |
| Constrain (square / angle / aspect) | hold `Shift` |
| From-center draw / resize | hold `Alt` |

---

## 10. Cross-cutting: states matrix (board view)

| State | What the user sees | Editing allowed |
| --- | --- | --- |
| `loading` | Paper-textured skeleton, no chrome flash | no |
| `empty` | Centered low-key prompt + invite hint | yes |
| `idle` | Board content, toolbar, presence | yes |
| `connected` | Filled connection dot, live cursors | yes |
| `disconnected` | "Offline — saved locally" banner, hollow dot | yes (local) |
| `reconnecting` | Pulsing dot, "Reconnecting…" | yes (local) |
| `error` | Blocking message + retry; never a white crash | depends |
| `view only` (v1) | "View only" badge, tools disabled, cursor shown | no |

---

## 11. Acceptance criteria roll-up (definition of done)

- Two browsers converge on byte-identical state after concurrent edits to the same and different fields.
- Offline edits merge on reconnect with zero data loss in both directions.
- Cursors update smoothly with 5+ users and never persist after a user leaves.
- Canvas stays responsive (no dropped-frame stutter) at 500+ shapes via culling.
- Board survives reload and `docker compose restart` (client cache + server leveldb).
- Every board state in §10 is designed and reachable — no unhandled blank/crash screens.
- Geometry (hit-test, marquee, resize, rotate, world↔screen) and CRDT merge are covered by deterministic tests that run without a browser.
