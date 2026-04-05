/**
 * In-memory rate limiter for API routes.
 * Uses a sliding window approach with configurable limits.
 *
 * Note: This is per-instance (not shared across Vercel serverless functions),
 * but provides basic protection against abuse from a single function instance.
 * For production at scale, consider using Vercel KV or Upstash Redis.
 */

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitEntry>();

// Clean up expired entries periodically (every 60 seconds)
let lastCleanup = Date.now();
const CLEANUP_INTERVAL = 60_000;

function cleanupExpired() {
  const now = Date.now();
  if (now - lastCleanup < CLEANUP_INTERVAL) return;
  lastCleanup = now;
  const keysToDelete: string[] = [];
  rateLimitMap.forEach((entry, key) => {
    if (entry.resetAt < now) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach((key) => rateLimitMap.delete(key));
}

interface RateLimitOptions {
  /** Maximum number of requests allowed in the window */
  limit: number;
  /** Time window in seconds */
  windowSeconds: number;
}

interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
}

/**
 * Check rate limit for a given identifier (e.g., IP address, user ID).
 * Returns whether the request is allowed and rate limit metadata.
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): RateLimitResult {
  cleanupExpired();

  const now = Date.now();
  const windowMs = options.windowSeconds * 1000;
  const key = `${identifier}`;

  const existing = rateLimitMap.get(key);

  if (!existing || existing.resetAt < now) {
    // New window
    rateLimitMap.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit: options.limit,
      remaining: options.limit - 1,
      resetAt: now + windowMs,
    };
  }

  if (existing.count >= options.limit) {
    return {
      success: false,
      limit: options.limit,
      remaining: 0,
      resetAt: existing.resetAt,
    };
  }

  existing.count++;
  return {
    success: true,
    limit: options.limit,
    remaining: options.limit - existing.count,
    resetAt: existing.resetAt,
  };
}

/**
 * Get the client IP from request headers (works with Vercel proxy).
 */
export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;
  return "unknown";
}

/**
 * Pre-configured rate limiters for different endpoint types.
 */
export const RATE_LIMITS = {
  /** Cron endpoint: 10 requests per minute */
  cron: { limit: 10, windowSeconds: 60 },
  /** Translation API: 30 requests per minute per IP */
  translate: { limit: 30, windowSeconds: 60 },
  /** Auth attempts: 10 per minute per IP */
  auth: { limit: 10, windowSeconds: 60 },
  /** General API: 60 requests per minute per IP */
  api: { limit: 60, windowSeconds: 60 },
} as const;
