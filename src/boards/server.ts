/**
 * Board + membership data access. Server-only. A board is private: creating one
 * makes the creator its owner; access is membership-gated everywhere (the board
 * page guard and the websocket room-join both consult `isMember`).
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { boards, memberships, users, type Board } from "@/db/schema";

export type BoardWithRole = Board & { role: string };

/** A real member of a board: the user joined to their role. */
export interface BoardMember {
  id: string;
  name: string;
  email: string;
  color: string;
  role: string;
}

export function createBoard(ownerId: string, name: string): Board {
  const db = getDb();
  const board: Board = {
    id: randomUUID(),
    name: name.trim() || "Untitled board",
    ownerId,
    createdAt: Date.now(),
    thumbnail: null,
  };
  // One transaction so a failure can't orphan a board without its owner row.
  db.transaction((tx) => {
    tx.insert(boards).values(board).run();
    tx.insert(memberships).values({ boardId: board.id, userId: ownerId, role: "owner", createdAt: Date.now() }).run();
  });
  return board;
}

/**
 * The shared playground. Any signed-in account may use it, so membership is
 * granted on first visit rather than by invitation, and the board row is
 * created lazily so a fresh database needs no seeding. It is still a real
 * membership: the websocket relay authorises it the same way as any other.
 */
export const DEMO_BOARD_ID = "demo";

/**
 * Nobody owns the shared board. Recording the first visitor as its owner handed
 * that person the owner-only powers over a board everybody shares: inviting,
 * changing other people's roles, removing them. This sentinel matches no user
 * row, so `getMemberRole` never answers "owner" here and those routes refuse.
 */
const NO_OWNER = "system:demo";

export function joinDemoBoard(userId: string): void {
  const db = getDb();
  db.transaction((tx) => {
    tx.insert(boards)
      .values({ id: DEMO_BOARD_ID, name: "Demo board", ownerId: NO_OWNER, createdAt: Date.now(), thumbnail: null })
      .onConflictDoNothing()
      .run();
    // Repair a board, or a membership, created before the sentinel existed.
    tx.update(boards).set({ ownerId: NO_OWNER }).where(eq(boards.id, DEMO_BOARD_ID)).run();
    tx.insert(memberships)
      .values({ boardId: DEMO_BOARD_ID, userId, role: "editor", createdAt: Date.now() })
      .onConflictDoNothing()
      .run();
    tx.update(memberships)
      .set({ role: "editor" })
      .where(and(eq(memberships.boardId, DEMO_BOARD_ID), eq(memberships.role, "owner")))
      .run();
  });
}

export function getBoard(boardId: string): Board | undefined {
  return getDb().select().from(boards).where(eq(boards.id, boardId)).get();
}

/** Store the canvas snapshot shown on the dashboard; null when the board is empty. */
export function setBoardThumbnail(boardId: string, thumbnail: string | null): void {
  getDb().update(boards).set({ thumbnail }).where(eq(boards.id, boardId)).run();
}

/** The board name is control-plane data: the dashboard, invites and sharing all
 *  read it server-side, so a rename in the canvas header lands here too. */
export function renameBoard(boardId: string, name: string): void {
  getDb().update(boards).set({ name }).where(eq(boards.id, boardId)).run();
}

export function isMember(boardId: string, userId: string): boolean {
  return Boolean(
    getDb()
      .select()
      .from(memberships)
      .where(and(eq(memberships.boardId, boardId), eq(memberships.userId, userId)))
      .get(),
  );
}

export function addMembership(boardId: string, userId: string, role = "editor"): void {
  getDb()
    .insert(memberships)
    .values({ boardId, userId, role, createdAt: Date.now() })
    .onConflictDoNothing()
    .run();
}

export function listBoardsForUser(userId: string): BoardWithRole[] {
  const db = getDb();
  const mems = db.select().from(memberships).where(eq(memberships.userId, userId)).all();
  if (mems.length === 0) return [];
  const ids = mems.map((m) => m.boardId);
  const rows = db.select().from(boards).where(inArray(boards.id, ids)).all();
  const roleByBoard = new Map(mems.map((m) => [m.boardId, m.role]));
  return rows
    .map((b) => ({ ...b, role: roleByBoard.get(b.id) ?? "viewer" }))
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Real members of a board (joined users + their role), owner first. */
export function listMembers(boardId: string): BoardMember[] {
  const rows = getDb()
    .select({ id: users.id, name: users.name, email: users.email, color: users.color, role: memberships.role })
    .from(memberships)
    .innerJoin(users, eq(memberships.userId, users.id))
    .where(eq(memberships.boardId, boardId))
    .all() as BoardMember[];
  return rows.sort((a, b) => (a.role === "owner" ? -1 : b.role === "owner" ? 1 : 0));
}

export function getMemberRole(boardId: string, userId: string): string | undefined {
  return getDb()
    .select({ role: memberships.role })
    .from(memberships)
    .where(and(eq(memberships.boardId, boardId), eq(memberships.userId, userId)))
    .get()?.role;
}

export function setMemberRole(boardId: string, userId: string, role: string): void {
  getDb()
    .update(memberships)
    .set({ role })
    .where(and(eq(memberships.boardId, boardId), eq(memberships.userId, userId)))
    .run();
}

export function removeMember(boardId: string, userId: string): void {
  getDb()
    .delete(memberships)
    .where(and(eq(memberships.boardId, boardId), eq(memberships.userId, userId)))
    .run();
}
