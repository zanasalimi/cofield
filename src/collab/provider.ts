/**
 * Transport abstraction. Cofield runs the y-websocket protocol itself rather
 * than renting a managed realtime service, and this interface is what keeps
 * that reversible: swapping the backend is a change to this one file.
 */
import type * as Y from "yjs";
import { WebsocketProvider } from "y-websocket";
import type { Awareness } from "y-protocols/awareness";
import type { ConnectionState } from "./types";

export interface SyncProvider {
  readonly awareness: Awareness;
  readonly state: ConnectionState;
  /** Why the transport last failed, when the socket said. Undefined while healthy. */
  readonly reason: string | undefined;
  onStateChange(handler: (state: ConnectionState, reason?: string) => void): () => void;
  /**
   * Whether this client has finished its first exchange with the server. Being
   * connected is not the same thing: the socket opens before sync step 1/2 have
   * run, so until this is true an empty document means "not told yet" rather
   * than "empty".
   */
  onSyncChange(handler: (synced: boolean) => void): () => void;
  destroy(): void;
}

export interface ProviderOptions {
  /** ws(s):// base URL, from NEXT_PUBLIC_WS_URL. */
  url: string;
  /** Room name (a board id). */
  room: string;
  /** The document to sync. */
  doc: Y.Doc;
}

/**
 * WebSocket close code for a policy violation. The sync server sends it when a
 * room join is refused (`unauthorized`) or a member's access is revoked
 * mid-session (`access changed`). y-websocket treats every close alike and
 * retries with backoff forever, which for these two would be an invisible loop
 * against a server that can only refuse again, so they are terminal here.
 */
const CLOSE_POLICY = 1008;

/** Construct the default y-websocket-backed provider. */
export function createWebsocketProvider(opts: ProviderOptions): SyncProvider {
  const wsp = new WebsocketProvider(opts.url, opts.room, opts.doc, { connect: true });
  const handlers = new Set<(state: ConnectionState, reason?: string) => void>();
  const syncHandlers = new Set<(synced: boolean) => void>();
  let state: ConnectionState = "connecting";
  let reason: string | undefined;
  let terminal = false;
  let everConnected = false;

  const set = (next: ConnectionState, why?: string) => {
    if (terminal) return;
    state = next;
    reason = why;
    handlers.forEach((h) => h(next, why));
  };

  // A failed handshake surfaces as an opaque Event, since the browser withholds
  // the cause. Record what we can and let the close handler drive the state,
  // since y-websocket always closes after an error and then schedules a retry.
  let handshakeError: string | undefined;
  wsp.on("connection-error", () => {
    handshakeError = `Can't reach the sync server at ${opts.url}.`;
  });

  wsp.on("connection-close", (event: CloseEvent | null) => {
    if (event?.code === CLOSE_POLICY) {
      const why = event.reason || "You no longer have access to this board.";
      set("error", why);
      terminal = true;
      // Stops the backoff loop. Re-enters this handler; `terminal` absorbs it.
      wsp.disconnect();
      return;
    }
    set("reconnecting", handshakeError ?? (event?.reason || undefined));
  });

  wsp.on("sync", (synced: boolean) => {
    syncHandlers.forEach((h) => h(synced));
  });

  wsp.on("status", ({ status }: { status: string }) => {
    if (status === "connected") {
      handshakeError = undefined;
      everConnected = true;
      set("connected");
    } else if (status === "connecting") {
      // Each backoff retry re-emits `connecting`, so this is the state the user
      // actually sits in after a drop. Reporting the first join and a recovery
      // attempt identically would lose the one thing that distinguishes them:
      // whether there are local edits waiting to be sent.
      set(everConnected ? "reconnecting" : "connecting", handshakeError);
    } else {
      set("disconnected", handshakeError);
    }
  });

  return {
    awareness: wsp.awareness,
    get state() {
      return state;
    },
    get reason() {
      return reason;
    },
    onStateChange(handler) {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    onSyncChange(handler) {
      syncHandlers.add(handler);
      return () => syncHandlers.delete(handler);
    },
    destroy() {
      handlers.clear();
      syncHandlers.clear();
      wsp.destroy();
    },
  };
}
