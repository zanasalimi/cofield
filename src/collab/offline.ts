/**
 * Offline cache + instant load via y-indexeddb (ADR-006).
 *
 * The local document persists to IndexedDB so a board loads instantly on
 * revisit and stays editable while offline. On reconnect, Yjs exchanges state
 * vectors and merges the diff both ways with zero data loss.
 */
import type * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

export interface OfflineCache {
  /** Resolves once the local doc has hydrated from IndexedDB. */
  whenSynced: Promise<void>;
  /** Stop persisting and release the IndexedDB handle. */
  destroy(): void;
}

/** Bind a Y.Doc to IndexedDB under the given board key. Degrades to a no-op
 *  (resolved immediately) where IndexedDB is unavailable. */
export function bindOfflineCache(doc: Y.Doc, boardKey: string): OfflineCache {
  if (typeof indexedDB === "undefined") {
    return { whenSynced: Promise.resolve(), destroy: () => {} };
  }
  const idb = new IndexeddbPersistence(`cofield:${boardKey}`, doc);
  return {
    whenSynced: new Promise<void>((resolve) => idb.once("synced", () => resolve())),
    destroy: () => void idb.destroy(),
  };
}
