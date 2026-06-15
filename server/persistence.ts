/**
 * Durable document storage via y-leveldb (ADR-001 / ADR-005).
 *
 * Each room's Y.Doc is bound to a leveldb store under YPERSISTENCE (/data in
 * Docker, on the canvas-data named volume), so boards survive a restart. Only
 * the DOCUMENT is persisted — never Awareness.
 */
import type * as Y from "yjs";

export interface RoomPersistence {
  /** Resolves once the room doc has loaded its persisted state. */
  whenLoaded: Promise<void>;
  /** Compact the doc to a snapshot to bound tombstone growth (ADR-005). */
  snapshot(): Promise<void>;
  /** Flush and release the leveldb handle for this room. */
  unbind(): Promise<void>;
}

/**
 * Bind a room's Y.Doc to its leveldb store.
 * TODO(M3/M5): wire LeveldbPersistence; load on bind; persist on update;
 * schedule periodic snapshots; flush on unbind.
 */
export function bindPersistence(_room: string, _doc: Y.Doc, _dir: string): RoomPersistence {
  throw new Error("not implemented");
}
