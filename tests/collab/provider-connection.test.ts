/**
 * The transport's connection-state machine.
 *
 * A relay that stops syncing looks exactly like one that works, so the states
 * the UI reads are pinned here. The case worth the machinery is the policy
 * close: the sync server sends 1008 when a room join is refused or access is
 * revoked mid-session. y-websocket's default behaviour, retrying forever with
 * backoff, would hide that behind a permanent "reconnecting".
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import * as Y from "yjs";

type Handler = (...args: unknown[]) => void;

const { FakeWebsocketProvider } = vi.hoisted(() => {
  class FakeWebsocketProvider {
    static last: FakeWebsocketProvider | null = null;
    awareness = { clientID: 1 };
    shouldConnect = true;
    destroyed = false;
    private handlers = new Map<string, Handler[]>();

    constructor(
      readonly url: string,
      readonly room: string,
      readonly doc: unknown,
    ) {
      FakeWebsocketProvider.last = this;
    }

    on(event: string, handler: Handler) {
      this.handlers.set(event, [...(this.handlers.get(event) ?? []), handler]);
    }

    emit(event: string, arg?: unknown) {
      for (const h of [...(this.handlers.get(event) ?? [])]) h(arg);
    }

    /** Mirrors y-websocket: stop reconnecting, then close, which re-emits. */
    disconnect() {
      this.shouldConnect = false;
      this.emit("connection-close", null);
    }

    destroy() {
      this.destroyed = true;
    }
  }
  return { FakeWebsocketProvider };
});

vi.mock("y-websocket", () => ({ WebsocketProvider: FakeWebsocketProvider }));

const { createWebsocketProvider } = await import("@/collab/provider");

function connect() {
  const provider = createWebsocketProvider({ url: "ws://localhost:4321", room: "board-1", doc: new Y.Doc() });
  const socket = FakeWebsocketProvider.last!;
  const seen: { state: string; reason?: string }[] = [];
  provider.onStateChange((state, reason) => seen.push({ state, reason }));
  return { provider, socket, seen };
}

beforeEach(() => {
  FakeWebsocketProvider.last = null;
});

describe("websocket provider state", () => {
  it("opens as connecting and clears to connected", () => {
    const { provider, socket } = connect();
    expect(provider.state).toBe("connecting");

    socket.emit("status", { status: "connected" });
    expect(provider.state).toBe("connected");
    expect(provider.reason).toBeUndefined();
  });

  it("reports reconnecting on an ordinary drop and keeps retrying", () => {
    const { provider, socket } = connect();
    socket.emit("status", { status: "connected" });

    socket.emit("connection-close", { code: 1006, reason: "" });

    expect(provider.state).toBe("reconnecting");
    expect(socket.shouldConnect).toBe(true);
  });

  it("a retry after a successful connect reads as reconnecting, not connecting", () => {
    const { provider, socket } = connect();
    socket.emit("status", { status: "connected" });
    socket.emit("connection-close", { code: 1006, reason: "" });

    // The backoff timer fires and y-websocket re-emits `connecting`.
    socket.emit("status", { status: "connecting" });

    expect(provider.state).toBe("reconnecting");
  });

  it("names the sync URL when the handshake never completes", () => {
    const { provider, socket } = connect();

    socket.emit("connection-error", new Event("error"));
    socket.emit("connection-close", { code: 1006, reason: "" });

    expect(provider.state).toBe("reconnecting");
    expect(provider.reason).toContain("ws://localhost:4321");
  });

  it("a policy close is terminal: it reports the server's reason and stops retrying", () => {
    const { provider, socket, seen } = connect();
    socket.emit("status", { status: "connected" });

    socket.emit("connection-close", { code: 1008, reason: "access changed" });

    expect(provider.state).toBe("error");
    expect(provider.reason).toBe("access changed");
    expect(socket.shouldConnect).toBe(false);
    // disconnect() re-enters the close handler; that echo must not downgrade the
    // terminal state back to "reconnecting".
    expect(seen.at(-1)).toEqual({ state: "error", reason: "access changed" });
  });

  it("a terminal state ignores every later transition", () => {
    const { provider, socket } = connect();
    socket.emit("connection-close", { code: 1008, reason: "unauthorized" });

    socket.emit("status", { status: "connecting" });
    socket.emit("status", { status: "connected" });

    expect(provider.state).toBe("error");
    expect(provider.reason).toBe("unauthorized");
  });

  it("falls back to plain language when the server closes 1008 without a reason", () => {
    const { provider, socket } = connect();
    socket.emit("connection-close", { code: 1008, reason: "" });

    expect(provider.state).toBe("error");
    expect(provider.reason).toBe("You no longer have access to this board.");
  });

  it("destroy drops subscribers and tears down the socket", () => {
    const { provider, socket, seen } = connect();
    provider.destroy();

    socket.emit("status", { status: "connected" });

    expect(socket.destroyed).toBe(true);
    expect(seen).toEqual([]);
  });
});
