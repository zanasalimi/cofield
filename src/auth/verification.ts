/**
 * Email verification: issuing a one-time code, and checking one.
 *
 * The point is not the code, it is what the code proves. Signup lets anyone
 * type any address, so an unverified account is only a claim. Invites are
 * addressed to an email, so without this an attacker who registers a colleague's
 * address first receives their invitations. Server-only.
 */
import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { emailCodes, users } from "@/db/schema";
import { sendMail, verificationEmail } from "@/mail/mailer";

const CODE_TTL_MS = 15 * 60 * 1000;
/** Six digits is a million codes. Ten guesses against a 15-minute code leaves
 *  odds nobody is going to grind down, and it stays kind to a typo. */
const MAX_ATTEMPTS = 10;
/** Long enough to stop a resend loop being a way to mail-bomb an address. */
const RESEND_COOLDOWN_MS = 30 * 1000;

/** `randomInt` is the CSPRNG, not `Math.random`: a guessable code is no gate. */
function newCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

function hash(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/** Compare without letting response time narrow the search. */
function sameHash(a: string, b: string): boolean {
  const left = Buffer.from(a, "hex");
  const right = Buffer.from(b, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}

export function isVerified(user: { emailVerifiedAt: number | null }): boolean {
  return user.emailVerifiedAt !== null;
}

export type IssueResult = { sent: true } | { sent: false; retryAfterMs: number };

/**
 * Replace any outstanding code with a fresh one and mail it. Replacing rather
 * than adding means an old code stops working immediately, so a forwarded email
 * cannot be used after the real owner asks for another.
 */
export async function issueCode(user: { id: string; email: string; name: string }): Promise<IssueResult> {
  const db = getDb();
  const existing = db.select().from(emailCodes).where(eq(emailCodes.userId, user.id)).get();
  const now = Date.now();

  if (existing && now - existing.sentAt < RESEND_COOLDOWN_MS) {
    return { sent: false, retryAfterMs: RESEND_COOLDOWN_MS - (now - existing.sentAt) };
  }

  const code = newCode();
  const row = {
    userId: user.id,
    codeHash: hash(code),
    expiresAt: now + CODE_TTL_MS,
    attempts: 0,
    sentAt: now,
  };
  db.insert(emailCodes).values(row).onConflictDoUpdate({ target: emailCodes.userId, set: row }).run();

  await sendMail({ to: user.email, ...verificationEmail(user.name, code) });
  return { sent: true };
}

export type CheckResult =
  | { ok: true }
  | { ok: false; reason: "no-code" | "expired" | "too-many" | "wrong"; remaining?: number };

export function checkCode(userId: string, code: string): CheckResult {
  const db = getDb();
  const row = db.select().from(emailCodes).where(eq(emailCodes.userId, userId)).get();
  if (!row) return { ok: false, reason: "no-code" };

  if (Date.now() > row.expiresAt) {
    db.delete(emailCodes).where(eq(emailCodes.userId, userId)).run();
    return { ok: false, reason: "expired" };
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    // Burn it rather than leave a spent code lying around to be ground down.
    db.delete(emailCodes).where(eq(emailCodes.userId, userId)).run();
    return { ok: false, reason: "too-many" };
  }

  if (!sameHash(row.codeHash, hash(code))) {
    const attempts = row.attempts + 1;
    db.update(emailCodes).set({ attempts }).where(eq(emailCodes.userId, userId)).run();
    return { ok: false, reason: "wrong", remaining: Math.max(0, MAX_ATTEMPTS - attempts) };
  }

  db.transaction((tx) => {
    tx.update(users).set({ emailVerifiedAt: Date.now() }).where(eq(users.id, userId)).run();
    tx.delete(emailCodes).where(eq(emailCodes.userId, userId)).run();
  });
  return { ok: true };
}
