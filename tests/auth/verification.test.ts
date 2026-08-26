/**
 * Verification is what turns an email address from a claim into evidence, so
 * the parts worth pinning are the ones an attacker leans on: a code that
 * outlives its window, one that survives unlimited guessing, and an old one
 * that still works after a newer code was sent.
 *
 * Runs against a scratch database file. The env var has to be set before the
 * db module is imported, since it reads it when it first opens the connection.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

process.env.DATABASE_FILE = join(mkdtempSync(join(tmpdir(), "cofield-test-")), "test.db");

const { setMailTransport } = await import("@/mail/mailer");
const { issueCode, checkCode, isVerified } = await import("@/auth/verification");
const { createUser, findUserByEmail } = await import("@/auth/server");

/** The code only exists in the message, which is the point of the seam. */
const sent: string[] = [];
function lastCode(): string {
  const body = sent.at(-1) ?? "";
  return body.match(/\b(\d{6})\b/)?.[1] ?? "";
}

let userId = "";

beforeAll(async () => {
  setMailTransport({
    async send(mail) {
      sent.push(mail.body);
    },
  });
  const user = await createUser("verify@example.com", "a-good-password", "Test Person");
  userId = user.id;
});

describe("email verification", () => {
  it("starts unverified and becomes verified with the mailed code", async () => {
    expect(isVerified(findUserByEmail("verify@example.com")!)).toBe(false);

    await issueCode({ id: userId, email: "verify@example.com", name: "Test Person" });
    expect(lastCode()).toMatch(/^\d{6}$/);

    expect(checkCode(userId, lastCode())).toEqual({ ok: true });
    expect(isVerified(findUserByEmail("verify@example.com")!)).toBe(true);
  });

  it("refuses a wrong code and counts the attempt down", async () => {
    const user = await createUser("wrong@example.com", "a-good-password", "Wrong Guesser");
    await issueCode({ id: user.id, email: user.email, name: user.name });
    const real = lastCode();
    const bad = real === "000000" ? "111111" : "000000";

    const first = checkCode(user.id, bad);
    expect(first).toMatchObject({ ok: false, reason: "wrong" });
    expect((first as { remaining: number }).remaining).toBe(9);

    // The real code still works while attempts remain.
    expect(checkCode(user.id, real)).toEqual({ ok: true });
  });

  it("burns the code after ten wrong guesses, so it cannot be ground down", async () => {
    const user = await createUser("brute@example.com", "a-good-password", "Brute");
    await issueCode({ id: user.id, email: user.email, name: user.name });
    const real = lastCode();
    const bad = real === "000000" ? "111111" : "000000";

    for (let i = 0; i < 10; i++) checkCode(user.id, bad);

    expect(checkCode(user.id, real)).toMatchObject({ ok: false, reason: "too-many" });
    expect(isVerified(findUserByEmail("brute@example.com")!)).toBe(false);
  });

  it("retires the previous code when a new one is sent", async () => {
    const user = await createUser("resend@example.com", "a-good-password", "Resender");
    await issueCode({ id: user.id, email: user.email, name: user.name });
    const older = lastCode();

    // The cooldown is about mail volume, not correctness, so reach past it.
    const { getDb } = await import("@/db/client");
    const { emailCodes } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    getDb().update(emailCodes).set({ sentAt: 0 }).where(eq(emailCodes.userId, user.id)).run();

    await issueCode({ id: user.id, email: user.email, name: user.name });
    const newer = lastCode();
    expect(newer).not.toBe(older);

    // A forwarded email must not stay usable after the owner asks for another.
    expect(checkCode(user.id, older)).toMatchObject({ ok: false, reason: "wrong" });
    expect(checkCode(user.id, newer)).toEqual({ ok: true });
  });

  it("refuses a code that has passed its expiry", async () => {
    const user = await createUser("stale@example.com", "a-good-password", "Stale");
    await issueCode({ id: user.id, email: user.email, name: user.name });
    const code = lastCode();

    const { getDb } = await import("@/db/client");
    const { emailCodes } = await import("@/db/schema");
    const { eq } = await import("drizzle-orm");
    getDb().update(emailCodes).set({ expiresAt: Date.now() - 1 }).where(eq(emailCodes.userId, user.id)).run();

    expect(checkCode(user.id, code)).toMatchObject({ ok: false, reason: "expired" });
    expect(isVerified(findUserByEmail("stale@example.com")!)).toBe(false);
  });
});
