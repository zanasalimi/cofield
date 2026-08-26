/**
 * The limiter's job is to survive a caller who controls their own headers.
 * `X-Forwarded-For` is written by the client, so anything keyed on it alone
 * stops limiting the moment that value is rotated.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { clientIp, rateLimit } from "@/auth/rate-limit";

const req = (headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/auth/signin", { method: "POST", headers });

describe("clientIp", () => {
  const saved = process.env.TRUST_PROXY;
  beforeEach(() => {
    delete process.env.TRUST_PROXY;
  });
  afterEach(() => {
    if (saved === undefined) delete process.env.TRUST_PROXY;
    else process.env.TRUST_PROXY = saved;
  });

  it("ignores a client-supplied forwarding header when no proxy is declared", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4" }))).toBe("direct");
    expect(clientIp(req({ "x-forwarded-for": "5.6.7.8" }))).toBe("direct");
  });

  it("collapses rotated values into one bucket, so the limit still bites", () => {
    const keys = new Set(
      ["9.9.9.1", "9.9.9.2", "9.9.9.3"].map((ip) => clientIp(req({ "x-forwarded-for": ip }))),
    );
    expect(keys.size).toBe(1);
  });

  it("reads the header once a proxy is declared", () => {
    process.env.TRUST_PROXY = "1";
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 10.0.0.1" }))).toBe("1.2.3.4");
  });
});

describe("rateLimit", () => {
  it("allows up to the limit then refuses", () => {
    const key = `t:${Math.random()}`;
    const results = Array.from({ length: 5 }, () => rateLimit(key, 3, 60_000));
    expect(results).toEqual([true, true, true, false, false]);
  });

  it("keeps separate keys independent, so one account cannot lock out another", () => {
    const a = `a:${Math.random()}`;
    const b = `b:${Math.random()}`;
    Array.from({ length: 5 }, () => rateLimit(a, 3, 60_000));
    expect(rateLimit(b, 3, 60_000)).toBe(true);
  });

  it("starts a fresh window once the old one has passed", () => {
    const key = `w:${Math.random()}`;
    expect(rateLimit(key, 1, -1)).toBe(true);
    expect(rateLimit(key, 1, -1)).toBe(true);
  });
});
