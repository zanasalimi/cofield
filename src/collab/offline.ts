/**
 * Offline cache + instant load via y-indexeddb (ADR-006).
 *
 * The local document persists to IndexedDB so a board loads instantly on
 * revisit and stays editable while offline. On reconnect, Yjs exchanges state
 * vectors and merges the diff both ways with zero data loss.
 */
import type * as Y from "yjs";

export interface OfflineCache {
  /** Resolves once the local doc has hydrated from IndexedDB. */
  whenSynced: Promise<void>;
  /** Stop persisting and release the IndexedDB handle. */
  destroy(): void;
}

/**
 * Bind a Y.Doc to IndexedDB under the given board key.
 * TODO(M5): wire IndexeddbPersistence; resolve whenSynced on its 'synced'
 * event; degrade to in-memory with a warning if IndexedDB is unavailable.
 */
export function bindOfflineCache(_doc: Y.Doc, _boardKey: string): OfflineCache {
  throw new Error("not implemented");
}
