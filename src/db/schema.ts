/**
 * Control-plane schema (SQLite via Drizzle): the accounts, sessions, boards,
 * memberships, and invites that wrap the realtime canvas. The canvas document
 * itself lives in Yjs/leveldb, never here.
 */
import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  /** stable per-user multiplayer hue */
  color: text("color").notNull(),
  createdAt: integer("created_at").notNull(),
});

export const sessions = sqliteTable(
  "sessions",
  {
    token: text("token").primaryKey(),
    userId: text("user_id").notNull(),
    expiresAt: integer("expires_at").notNull(),
  },
  (t) => ({ byUser: index("sessions_user_idx").on(t.userId) }),
);

export const boards = sqliteTable(
  "boards",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerId: text("owner_id").notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ byOwner: index("boards_owner_idx").on(t.ownerId) }),
);

export const memberships = sqliteTable(
  "memberships",
  {
    boardId: text("board_id").notNull(),
    userId: text("user_id").notNull(),
    role: text("role").notNull(), // owner | editor | viewer
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ byUser: index("memberships_user_idx").on(t.userId), byBoard: index("memberships_board_idx").on(t.boardId) }),
);

export const invites = sqliteTable(
  "invites",
  {
    id: text("id").primaryKey(),
    boardId: text("board_id").notNull(),
    inviterId: text("inviter_id").notNull(),
    inviteeEmail: text("invitee_email").notNull(),
    status: text("status").notNull(), // pending | accepted | rejected
    createdAt: integer("created_at").notNull(),
  },
  (t) => ({ byEmail: index("invites_email_idx").on(t.inviteeEmail), byBoard: index("invites_board_idx").on(t.boardId) }),
);

export type User = typeof users.$inferSelect;
export type Board = typeof boards.$inferSelect;
export type Membership = typeof memberships.$inferSelect;
export type Invite = typeof invites.$inferSelect;
