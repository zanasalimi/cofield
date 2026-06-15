/**
 * Yjs sync server — a Node `ws` relay.
 *
 * The server is a relay, NOT an authority: it runs the standard y-websocket sync
 * protocol (sync step 1/2 + update relay) and broadcasts awareness; it never
 * transforms operations. Each room is one board. Durable leveldb persistence
 * (boards survive restart) lands in M5; auth-gating the join lands in M3.
 *
 * Run with `pnpm sync` (dev) or as the `sync` service in docker-compose.
 *
 * NOTE: only y-websocket's bundled Yjs is loaded here on purpose — importing a
 * second `yjs` would trip Yjs's single-instance constructor checks.
 */
import { WebSocketServer } from "ws";
// y-websocket ships its server helpers as CJS without type declarations.
// @ts-expect-error -- no types for the server utils entrypoint
import { setupWSConnection } from "y-websocket/bin/utils";

const PORT = Number(process.env.PORT ?? 1234);

function start(): void {
  const wss = new WebSocketServer({ port: PORT });

  wss.on("connection", (socket, request) => {
    setupWSConnection(socket, request);
  });

  const shutdown = () => {
    wss.close();
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  // eslint-disable-next-line no-console
  console.log(`sync server listening on :${PORT}`);
}

start();
