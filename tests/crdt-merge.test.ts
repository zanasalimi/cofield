/**
 * Deterministic CRDT convergence tests. Script two (or more) Y.Docs, apply
 * divergent concurrent ops in different orders, assert byte-identical end state.
 * No DOM, no randomness, no real timers.
 */
import { describe, it } from "vitest";

describe("CRDT convergence", () => {
  it.todo("two docs editing different fields of one shape both survive (move vs recolor)");
  it.todo("concurrent z-order reorders converge to identical `order`");
  it.todo("concurrent create + delete of the same shape converges deterministically");
  it.todo("offline edits merge on reconnect with zero data loss in both directions");
  it.todo("apply order does not affect the converged state");
});
