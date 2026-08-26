/**
 * Offline cache and instant load via y-indexeddb.
 *
 * The local document persists to IndexedDB so a board loads instantly on
 * revisit and stays editable while offline. On reconnect, Yjs exchanges state
 * vectors and merges the diff both ways with zero data loss.
 */
import type * as Y from "yjs";
import { IndexeddbPersistence } from "y-indexeddb";

export interface OfflineCache {
  /** Stop persisting and release the IndexedDB handle. */
  destroy(): void;
}

const NO_CACHE: OfflineCache = { destroy: () => {} };

/**
 * Bind a Y.Doc to IndexedDB under the given board key.
 *
 * The cache is an enhancement, not a dependency: a board still syncs over the
 * socket without it, so every failure path degrades to a no-op instead of
 * failing the mount. What is lost is durability across a reload, since edits
 * made offline then only live in memory. That is why the caller is told rather
 * than left to guess.
 */
export function bindOfflineCache(
  doc: Y.Doc,
  boardKey: string,
  onUnavailable: (error: unknown) => void,
): OfflineCache {
  if (typeof indexedDB === "undefined") {
    onUnavailable(new Error("This browser has no IndexedDB."));
    return NO_CACHE;
  }
  let idb: IndexeddbPersistence;
  try {
    idb = new IndexeddbPersistence(`cofield:${boardKey}`, doc);
  } catch (error) {
    onUnavailable(error);
    return NO_CACHE;
  }
  // The store opens asynchronously and y-indexeddb attaches no rejection
  // handler, so a denied or corrupt database (private windows, blocked site
  // data) would otherwise surface only as an unhandled rejection.
  idb._db.catch(onUnavailable);
  return { destroy: () => void idb.destroy() };
}
