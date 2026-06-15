/**
 * Presence read/write over the Yjs Awareness protocol.
 *
 * Presence is ephemeral — it rides the socket but is NEVER written to the
 * document or to leveldb (ADR-003). Outgoing cursor updates are throttled;
 * receivers interpolate for smoothness.
 */
import type { Awareness } from "y-protocols/awareness";
import type { Point, Presence, ShapeId } from "./types";

/** Cursor update throttle window in milliseconds (~30–60ms). */
export const CURSOR_THROTTLE_MS = 40;

/** Set the local user's static presence fields (name, color). */
export function setLocalIdentity(
  _awareness: Awareness,
  _identity: Pick<Presence, "userId" | "name" | "color">,
): void {
  // TODO(M4)
  throw new Error("not implemented");
}

/** Publish the local cursor position (world coords). Throttled by the caller. */
export function setLocalCursor(_awareness: Awareness, _cursor: Point | null): void {
  // TODO(M4)
  throw new Error("not implemented");
}

/** Publish the local selection. */
export function setLocalSelection(
  _awareness: Awareness,
  _selection: ShapeId[],
): void {
  // TODO(M4)
  throw new Error("not implemented");
}

/** Read all remote presences (excludes the local client). */
export function readPresenceStates(_awareness: Awareness): Presence[] {
  // TODO(M4): map awareness states → Presence[], drop the local client.
  throw new Error("not implemented");
}

/** Subscribe to presence changes. Returns an unsubscribe fn. */
export function onPresenceChange(
  _awareness: Awareness,
  _handler: (presences: Presence[]) => void,
): () => void {
  // TODO(M4)
  throw new Error("not implemented");
}
