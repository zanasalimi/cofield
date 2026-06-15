/**
 * The landing hero: a small, live, looping mini-board with a couple of ghost
 * cursors moving across it. This is the marketing — the product demonstrating
 * its own multiplayer-ness. No gradient, no glassmorphism.
 */
"use client";

export function LiveMiniBoard() {
  // TODO(M0): render a small canvas with a few pre-placed shapes and 2-3
  // scripted ghost cursors (the brand hues) on a gentle recorded loop.
  return (
    <div
      aria-label="Live preview of a collaborative board"
      className="aspect-[4/3] w-full rounded-2xl border border-hairline bg-paper shadow-toolbar"
    >
      {/* placeholder frame; the looping mini-board lands here */}
    </div>
  );
}
