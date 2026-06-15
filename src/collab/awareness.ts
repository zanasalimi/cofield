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

function merge(awareness: Awareness, patch: Partial<Presence>): void {
  const current = (awareness.getLocalState() as Partial<Presence> | null) ?? {};
  awareness.setLocalState({ ...current, ...patch });
}

/** Set the local user's static presence fields (name, color). */
export function setLocalIdentity(
  awareness: Awareness,
  identity: Pick<Presence, "userId" | "name" | "color">,
): void {
  merge(awareness, identity);
}

/** Publish the local cursor position (world coords). Throttled by the caller. */
export function setLocalCursor(awareness: Awareness, cursor: Point | null): void {
  merge(awareness, { cursor });
}

/** Publish the local selection. */
export function setLocalSelection(awareness: Awareness, selection: ShapeId[]): void {
  merge(awareness, { selection });
}

/** Read all remote presences (excludes the local client). */
export function readPresenceStates(awareness: Awareness): Presence[] {
  const out: Presence[] = [];
  awareness.getStates().forEach((state, clientId) => {
    if (clientId === awareness.clientID) return;
    const p = state as Partial<Presence>;
    if (p && p.userId && p.name && p.color) {
      out.push({ userId: p.userId, name: p.name, color: p.color, cursor: p.cursor ?? null, selection: p.selection ?? [] });
    }
  });
  return out;
}

/** Subscribe to presence changes. Returns an unsubscribe fn. */
export function onPresenceChange(
  awareness: Awareness,
  handler: (presences: Presence[]) => void,
): () => void {
  const cb = () => handler(readPresenceStates(awareness));
  awareness.on("change", cb);
  return () => awareness.off("change", cb);
}
