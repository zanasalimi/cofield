/**
 * Server-side auth: password hashing (scrypt, no external dep), opaque session
 * tokens in SQLite, and an httpOnly session cookie. Import only from route
 * handlers / server components — it touches the database and next/headers.
 */
import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { getDb } from "@/db/client";
import { users, sessions, type User } from "@/db/schema";
import { CURSOR_COLORS } from "@/collab/types";

const SESSION_COOKIE = "cofield_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(":");
  if (!salt || !hash) return false;
  const test = scryptSync(password, salt, 64);
  const original = Buffer.from(hash, "hex");
  return test.length === original.length && timingSafeEqual(test, original);
}

export function findUserByEmail(email: string): User | undefined {
  return getDb().select().from(users).where(eq(users.email, email.toLowerCase())).get();
}

export function createUser(email: string, password: string, name: string): User {
  const user: User = {
    id: randomUUID(),
    email: email.toLowerCase(),
    passwordHash: hashPassword(password),
    name,
    color: CURSOR_COLORS[Math.floor(Math.random() * CURSOR_COLORS.length)]!,
    createdAt: Date.now(),
  };
  getDb().insert(users).values(user).run();
  return user;
}

export function createSessionToken(userId: string): string {
  const token = randomBytes(32).toString("hex");
  getDb().insert(sessions).values({ token, userId, expiresAt: Date.now() + SESSION_TTL_MS }).run();
  return token;
}

export function deleteSessionToken(token: string): void {
  getDb().delete(sessions).where(eq(sessions.token, token)).run();
}

export async function setSessionCookie(token: string): Promise<void> {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production", // never send the session over plain HTTP in prod
    path: "/",
    maxAge: Math.floor(SESSION_TTL_MS / 1000),
  });
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE);
}

export async function getSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

export async function getCurrentUser(): Promise<User | null> {
  const token = await getSessionToken();
  if (!token) return null;
  const db = getDb();
  const session = db.select().from(sessions).where(eq(sessions.token, token)).get();
  if (!session || session.expiresAt < Date.now()) return null;
  return db.select().from(users).where(eq(users.id, session.userId)).get() ?? null;
}

/** Public projection (never leak the password hash). */
export function publicUser(user: User) {
  return { id: user.id, email: user.email, name: user.name, color: user.color };
}
