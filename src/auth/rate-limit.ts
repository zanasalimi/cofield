/**
 * In-process fixed-window rate limiter. Single-instance only (state is per
 * process), but enough to blunt credential brute-force and the CPU cost of
 * repeated KDF calls on the auth routes. A real multi-instance deployment would
 * back this with Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/** Returns false when `key` has exceeded `limit` hits in the current window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/** Best-effort client IP from the usual proxy headers. */
export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "unknown";
}
