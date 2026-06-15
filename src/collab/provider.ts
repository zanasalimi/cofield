/**
 * Transport abstraction. The websocket provider sits behind this interface so
 * the realtime backend can be swapped (e.g. for a managed service) by changing
 * one file — see ADR-002.
 */
import type * as Y from "yjs";
import type { Awareness } from "y-protocols/awareness";
import type { ConnectionState } from "./types";

export interface SyncProvider {
  /** The Awareness instance bound to this provider's socket. */
  readonly awareness: Awareness;
  /** Current connection lifecycle state. */
  readonly state: ConnectionState;
  /** Subscribe to connection-state transitions. Returns an unsubscribe fn. */
  onStateChange(handler: (state: ConnectionState) => void): () => void;
  /** Tear down the socket and listeners. */
  destroy(): void;
}

export interface ProviderOptions {
  /** ws(s):// base URL — from NEXT_PUBLIC_WS_URL. */
  url: string;
  /** Room name (a board id). */
  room: string;
  /** The document to sync. */
  doc: Y.Doc;
}

/**
 * Construct the default y-websocket-backed provider.
 * TODO(M3): wire WebsocketProvider, map its events to ConnectionState,
 * and apply reconnect backoff.
 */
export function createWebsocketProvider(_opts: ProviderOptions): SyncProvider {
  throw new Error("not implemented");
}
