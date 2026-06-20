/**
 * Websocket room authorization. A board room may only be joined by a member.
 * The session cookie rides the upgrade request (same host), so the sync server
 * reads it from the handshake, validates the session, and checks membership —
 * directly against the same SQLite file the app writes. The "demo" room is a
 * public playground and is always allowed.
 *
 * Read-only: this never writes the database.
 */
import Database from "better-sqlite3";

const DEMO_BOARD = "demo";
const SESSION_COOKIE = "cofield_session";

let db: Database.Database | null = null;
function getDb(): Database.Database {
  if (!db) {
    db = new Database(process.env.DATABASE_FILE ?? "cofield.db");
    db.pragma("journal_mode = WAL");
  }
  return db;
}

function parseCookie(header: string | undefined, name: string): string | null {
  if (!header) return null;
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq < 0) continue;
    if (part.slice(0, eq).trim() === name) return decodeURIComponent(part.slice(eq + 1).trim());
  }
  return null;
}

export type BoardAccess = "owner" | "editor" | "viewer";

/**
 * The caller's role on a board, or null if they can't join at all. The demo room
 * is a public, writable playground (treated as editor). For a real board this is
 * the membership role, which the relay uses to gate writes for viewers.
 */
export function boardRole(cookieHeader: string | undefined, boardId: string): BoardAccess | null {
  if (boardId === DEMO_BOARD) return "editor";
  const token = parseCookie(cookieHeader, SESSION_COOKIE);
  if (!token) return null;
  try {
    const session = getDb()
      .prepare("SELECT user_id AS userId, expires_at AS expiresAt FROM sessions WHERE token = ?")
      .get(token) as { userId: string; expiresAt: number } | undefined;
    if (!session || session.expiresAt < Date.now()) return null;
    const row = getDb()
      .prepare("SELECT role FROM memberships WHERE board_id = ? AND user_id = ?")
      .get(boardId, session.userId) as { role: string } | undefined;
    if (!row) return null;
    return row.role === "owner" || row.role === "viewer" ? row.role : "editor";
  } catch {
    // Tables not yet created or a read error — deny (demo already returned a role).
    return null;
  }
}
