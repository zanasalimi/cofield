/**
 * Transport abstraction. The websocket provider sits behind this interface so
 * the realtime backend can be swapped (e.g. for a managed service) by changing
 * one file — see ADR-002.
 */
import type * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { Awareness } from "y-protocols/awareness";
import type { ConnectionState } from "./types";

export interface SyncProvider {
  readonly awareness: Awareness;
  readonly state: ConnectionState;
  onStateChange(handler: (state: ConnectionState) => void): () => void;
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

/** Construct the default y-websocket-backed provider. */
export function createWebsocketProvider(opts: ProviderOptions): SyncProvider {
  const wsp = new WebsocketProvider(opts.url, opts.room, opts.doc, { connect: true });
  const handlers = new Set<(state: ConnectionState) => void>();
  let state: ConnectionState = "connecting";

  const set = (next: ConnectionState) => {
    state = next;
    handlers.forEach((h) => h(next));
  };

  wsp.on("status", ({ status }: { status: string }) => {
    set(status === "connected" ? "connected" : status === "connecting" ? "connecting" : "disconnected");
  });
  wsp.on("connection-close", () => set("reconnecting"));
  wsp.on("connection-error", () => set("error"));

  return {
    awareness: wsp.awareness,
    get state() {
      return state;
    },
    onStateChange(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    destroy() {
      handlers.clear();
      wsp.destroy();
    },
  };
}
