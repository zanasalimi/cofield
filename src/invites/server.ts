/**
 * Per-board invites by email. An invite is pending until the invitee (a user
 * whose account email matches) accepts — which adds the membership the access
 * gate checks — or rejects it. Server-only.
 */
import { randomUUID } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { invites, boards, users, type Invite } from "@/db/schema";
import { addMembership } from "@/boards/server";

export function createInvite(boardId: string, inviterId: string, inviteeEmail: string): Invite {
  const invite: Invite = {
    id: randomUUID(),
    boardId,
    inviterId,
    inviteeEmail: inviteeEmail.toLowerCase(),
    status: "pending",
    createdAt: Date.now(),
  };
  getDb().insert(invites).values(invite).run();
  return invite;
}

export interface IncomingInvite {
  id: string;
  boardId: string;
  boardName: string;
  inviterName: string;
  createdAt: number;
}

export function listIncomingInvites(email: string): IncomingInvite[] {
  const db = getDb();
  const rows = db
    .select()
    .from(invites)
    .where(and(eq(invites.inviteeEmail, email.toLowerCase()), eq(invites.status, "pending")))
    .all();
  return rows
    .map((r) => {
      const board = db.select().from(boards).where(eq(boards.id, r.boardId)).get();
      const inviter = db.select().from(users).where(eq(users.id, r.inviterId)).get();
      return {
        id: r.id,
        boardId: r.boardId,
        boardName: board?.name ?? "a board",
        inviterName: inviter?.name ?? "someone",
        createdAt: r.createdAt,
      };
    })
    .sort((a, b) => b.createdAt - a.createdAt);
}

export interface BoardInvite {
  email: string;
  status: string;
}

/** Pending invites for a board — people invited who haven't joined yet, one row
 *  per email (re-inviting the same address doesn't duplicate the entry). */
export function listBoardInvites(boardId: string): BoardInvite[] {
  const rows = getDb()
    .select({ email: invites.inviteeEmail, status: invites.status })
    .from(invites)
    .where(and(eq(invites.boardId, boardId), eq(invites.status, "pending")))
    .all() as BoardInvite[];
  const byEmail = new Map(rows.map((r) => [r.email, r]));
  return [...byEmail.values()];
}

export function getInvite(id: string): Invite | undefined {
  return getDb().select().from(invites).where(eq(invites.id, id)).get();
}

export function acceptInvite(id: string, userId: string, role = "editor"): void {
  const invite = getInvite(id);
  if (!invite) return;
  addMembership(invite.boardId, userId, role);
  getDb().update(invites).set({ status: "accepted" }).where(eq(invites.id, id)).run();
}

export function rejectInvite(id: string): void {
  getDb().update(invites).set({ status: "rejected" }).where(eq(invites.id, id)).run();
}
