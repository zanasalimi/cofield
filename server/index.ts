/**
 * Yjs sync server — a Node `ws` relay.
 *
 * The server is a relay, NOT an authority: it runs the standard y-websocket sync
 * protocol (sync step 1/2 + update relay) and broadcasts awareness; it never
 * transforms operations. Each room is one board. The join is auth-gated against
 * the session + board membership, and each room's document is persisted to
 * leveldb (via `YPERSISTENCE`) so boards survive a restart — only the document,
 * never the ephemeral awareness channel.
 *
 * Run with `pnpm sync` (dev) or as the `sync` service in docker-compose.
 *
 * NOTE: only y-websocket's bundled Yjs is loaded here on purpose — importing a
 * second `yjs` would trip Yjs's single-instance constructor checks.
 */
import { WebSocketServer } from "ws";
import { authorizeBoard } from "./auth";

const PORT = Number(process.env.PORT ?? 4321);

// Durable doc store. y-websocket's connection helper binds leveldb automatically
// when YPERSISTENCE points at a directory; default it so a plain `pnpm sync`
// persists too (Docker overrides this to the /data volume). Must be set before
// the helper module is imported, since it reads the env at load time.
process.env.YPERSISTENCE ??= "./data";
// y-websocket ships its server helpers as CJS without type declarations.
// @ts-expect-error -- no types for the server utils entrypoint
const { setupWSConnection } = await import("y-websocket/bin/utils");

function start(): void {
  const wss = new WebSocketServer({ port: PORT });

  wss.on("connection", (socket, request) => {
    // The room name is the URL path; gate the join on session + membership.
    const path = (request.url ?? "/").split("?")[0] ?? "/";
    const boardId = decodeURIComponent(path.replace(/^\/+/, ""));
    if (!authorizeBoard(request.headers.cookie, boardId)) {
      socket.close(1008, "unauthorized");
      return;
    }
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
