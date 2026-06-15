/**
 * Room routing and the thin team/permission glue.
 *
 * A board id maps to a room. For the MVP rooms are open-by-URL; v1 adds
 * per-board roles (viewer/editor/owner) enforced HERE at the server boundary —
 * a downgraded client's writes are rejected, not merely hidden in the UI.
 *
 * The room-id parsing logic is pure and unit-testable.
 */
import type { IncomingMessage } from "node:http";

export interface RoomContext {
  /** the board id this socket is editing */
  room: string;
  /** resolved role; MVP everyone is "editor" */
  role: "viewer" | "editor" | "owner";
}

/** Extract and validate the room id from the upgrade request URL. */
export function parseRoomId(_url: string | undefined): string | null {
  // TODO(M3): parse `/board/<id>` or `?room=<id>`; reject malformed ids.
  throw new Error("not implemented");
}

/** Resolve the room + role for an incoming socket. */
export function resolveRoom(_request: IncomingMessage): RoomContext {
  // TODO(M3): parseRoomId + (v1) look up the user's role for the board.
  throw new Error("not implemented");
}

/** Authorize a write for the given role (v1 permission gate). */
export function canWrite(role: RoomContext["role"]): boolean {
  return role !== "viewer";
}
