/**
 * React hook bridging the Awareness channel into component state. Subscribes to
 * presence changes and exposes the remote presences + a setter for the local
 * cursor/selection (throttled by the awareness helpers).
 */
"use client";

import type { Presence, Point, ShapeId } from "@/collab/types";

export interface UsePresenceResult {
  presences: Presence[];
  setCursor: (cursor: Point | null) => void;
  setSelection: (ids: ShapeId[]) => void;
}

export function usePresence(_boardId: string): UsePresenceResult {
  // TODO(M4): subscribe via onPresenceChange; wire setLocalCursor/Selection.
  throw new Error("not implemented");
}
