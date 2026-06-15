/**
 * Board + membership data access. Server-only. A board is private: creating one
 * makes the creator its owner; access is membership-gated everywhere (the board
 * page guard and the websocket room-join both consult `isMember`).
 */
import { randomUUID } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { getDb } from "@/db/client";
import { boards, memberships, type Board } from "@/db/schema";

export type BoardWithRole = Board & { role: string };

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
