/**
 * Read-only enforcement for the sync relay.
 *
 * y-websocket's setupWSConnection has no read-only mode — it applies every sync
 * message a client sends to the shared room document. A `viewer` member must not
 * be able to mutate the doc, and the client is untrusted, so the boundary has to
 * live here on the server. We wrap the connection and drop the two message kinds
 * that write to the doc (sync step-2 and update), while still letting reads
 * (sync step-1) and presence (awareness) through.
 */
import * as decoding from "lib0/decoding";

// y-protocol message framing (y-websocket/bin/utils + y-protocols/sync).
const MESSAGE_SYNC = 0;
const SYNC_STEP2 = 1; // client pushing its state into the doc — a write
const SYNC_UPDATE = 2; // an incremental document update — a write

/** True if a frame would mutate the room document (sync step-2 or update). */
export function isDocWrite(message: Uint8Array): boolean {
  try {
    const decoder = decoding.createDecoder(message);
    if (decoding.readVarUint(decoder) !== MESSAGE_SYNC) return false; // awareness/auth — not a doc write
    const sub = decoding.readVarUint(decoder);
    return sub === SYNC_STEP2 || sub === SYNC_UPDATE;
  } catch {
    return false; // unclassifiable frame — let the protocol layer reject it
  }
}

interface MessageConn {
  on(event: string, listener: (...args: unknown[]) => void): unknown;
}

/**
 * Return the connection with its `message` stream filtered so doc-writes are
 * swallowed. Wraps the listener setupWSConnection registers, so reads, the
 * initial sync, live updates *to* the viewer, and cursor presence all still work.
 */
export function asReadOnly<T extends MessageConn>(conn: T): T {
  const origOn = conn.on.bind(conn);
  conn.on = ((event: string, listener: (...args: unknown[]) => void) => {
    if (event !== "message") return origOn(event, listener);
    return origOn("message", (data: unknown, ...rest: unknown[]) => {
      if (isDocWrite(new Uint8Array(data as ArrayBuffer))) return; // viewer write — drop it
      return listener(data, ...rest);
    });
  }) as T["on"];
  return conn;
}
