/**
 * SQLite (better-sqlite3) + Drizzle. Server-only — never import from a client
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
  created_at INTEGER NOT NULL
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
CREATE INDEX IF NOT EXISTS invites_email_idx ON invites(invitee_email);
CREATE INDEX IF NOT EXISTS invites_board_idx ON invites(board_id);
`;

export function getDb(): BetterSQLite3Database<typeof schema> {
  if (cached) return cached;
  const sqlite = new Database(process.env.DATABASE_FILE ?? "cofield.db");
  sqlite.pragma("journal_mode = WAL");
  sqlite.exec(DDL);
  cached = drizzle(sqlite, { schema });
  return cached;
}
