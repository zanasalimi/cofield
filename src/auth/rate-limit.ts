/**
 * In-process fixed-window rate limiter. Single-instance only (state is per
 * process), but enough to blunt credential brute-force and the CPU cost of
 * repeated KDF calls on the auth routes. A real multi-instance deployment would
 * back this with Redis.
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

/**
 * An IP that hits an auth route once and never returns keeps its bucket
 * forever, so the map grows for the life of the process. Sweeping only once it
 * is large keeps the common path a single lookup.
 */
const SWEEP_THRESHOLD = 10_000;
function sweepExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }
}

/** Returns false when `key` has exceeded `limit` hits in the current window. */
export function rateLimit(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  if (buckets.size >= SWEEP_THRESHOLD) sweepExpired(now);
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (bucket.count >= limit) return false;
  bucket.count += 1;
  return true;
}

/**
 * The client's IP, when something trustworthy told us.
 *
 * `X-Forwarded-For` is a request header, which means the client writes it. Read
 * unconditionally it does not identify anyone: a caller sends a different value
 * every request and every one gets its own fresh bucket, so the limit it is
 * supposed to enforce never triggers. It is only meaningful behind a proxy that
 * overwrites it, so it is read only where the deployment says so.
 *
 * Set `TRUST_PROXY=1` when Cofield sits behind a proxy that sets the header
 * itself (Vercel, an nginx that does `proxy_set_header`). Leave it unset when
 * the app is reachable directly, and IP-keyed limits fall back to one shared
 * bucket. That is why nothing security-critical is keyed on IP alone.
 */
export function clientIp(req: Request): string {
  if (process.env.TRUST_PROXY !== "1") return "direct";
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "direct";
}
