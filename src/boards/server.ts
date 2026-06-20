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
  };
  db.insert(boards).values(board).run();
  db.insert(memberships).values({ boardId: board.id, userId: ownerId, role: "owner", createdAt: Date.now() }).run();
  return board;
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

export function getBoard(boardId: string): Board | undefined {
  return getDb().select().from(boards).where(eq(boards.id, boardId)).get();
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
