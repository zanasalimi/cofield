/**
 * Yjs sync server — a Node `ws` relay with durable leveldb persistence.
 *
 * The server is a relay + durable store, NOT an authority: it applies incoming
 * Yjs updates to the room doc, persists them, and broadcasts. It never
 * transforms operations. Awareness updates are relayed but never persisted.
 *
 * Run with `pnpm sync` (dev) or as the `sync` service in docker-compose.
 */
import { WebSocketServer } from "ws";
import { resolveRoom } from "./rooms";
import { bindPersistence } from "./persistence";

const PORT = Number(process.env.PORT ?? 1234);
const PERSISTENCE_DIR = process.env.YPERSISTENCE ?? "./data";

function start(): void {
  const wss = new WebSocketServer({ port: PORT });

  wss.on("connection", (_socket, _request) => {
    // TODO(M3): resolveRoom(request) → get/create the room doc + awareness,
    // bind persistence on first open, then run the y-websocket sync protocol
    // (sync step 1/2 + update relay). Validate every frame at this boundary.
    void resolveRoom;
    void bindPersistence;
    throw new Error("not implemented");
  });

  // TODO(M3): graceful shutdown — flush persistence, close sockets.
  // eslint-disable-next-line no-console
  console.log(`sync server listening on :${PORT} (persistence: ${PERSISTENCE_DIR})`);
}

start();
