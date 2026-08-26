/**
 * SQLite (better-sqlite3) + Drizzle. Server-only: never import from a client
 * component. Tables are created on first open (idempotent), so dev needs no
 * migration step; the file path is configurable for Docker volumes.
 */
import Database from "better-sqlite3";
import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

let cached: BetterSQLite3Database<typeof schema> | null = null;

const DDL = `
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS sessions (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS sessions_user_idx ON sessions(user_id);
CREATE TABLE IF NOT EXISTS boards (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  owner_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  thumbnail TEXT
);
CREATE INDEX IF NOT EXISTS boards_owner_idx ON boards(owner_id);
CREATE TABLE IF NOT EXISTS memberships (
  board_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (board_id, user_id)
);
CREATE INDEX IF NOT EXISTS memberships_user_idx ON memberships(user_id);
CREATE INDEX IF NOT EXISTS memberships_board_idx ON memberships(board_id);
CREATE TABLE IF NOT EXISTS invites (
  id TEXT PRIMARY KEY,
  board_id TEXT NOT NULL,
  inviter_id TEXT NOT NULL,
  invitee_email TEXT NOT NULL,
  status TEXT NOT NULL,
  created_at INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS email_codes (
  user_id TEXT PRIMARY KEY,
  code_hash TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  attempts INTEGER NOT NULL,
  sent_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites(invitee_email);
CREATE INDEX IF NOT EXISTS invites_board_idx ON invites(board_id);
`;

/**
 * `CREATE TABLE IF NOT EXISTS` leaves an existing table alone, so a column added
 * later has to be added explicitly. Checked rather than caught, so a genuine
 * failure still throws instead of being swallowed as "already there".
 */
function addMissingColumns(sqlite: Database.Database): void {
  const has = (table: string, column: string) =>
    (sqlite.prepare(`PRAGMA table_info(${table})`).all() as { name: string }[]).some((c) => c.name === column);

  if (!has("boards", "thumbnail")) {
    sqlite.exec("ALTER TABLE boards ADD COLUMN thumbnail TEXT");
  }
  if (!has("users", "email_verified_at")) {
    sqlite.exec("ALTER TABLE users ADD COLUMN email_verified_at INTEGER");
    // Accounts that predate verification keep working. They were made when the
    // product never asked, and locking them out would be a worse bug than the
    // one this closes.
    sqlite.prepare("UPDATE users SET email_verified_at = ? WHERE email_verified_at IS NULL").run(Date.now());
  }
}

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (cached) return cached;
  const sqlite = new Database(process.env.DATABASE_FILE ?? "cofield.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(DDL);
  addMissingColumns(sqlite);
  cached = drizzle(sqlite, { schema });
  return cached;
}
