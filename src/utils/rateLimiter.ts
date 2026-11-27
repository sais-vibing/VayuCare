const DEFAULT_RATE_WINDOW_MS = 60_000;
const DEFAULT_RATE_MAX_REQUESTS = 15;
const RATE_LIMIT_EVICTION_THRESHOLD = 2000;

/** Result returned by {@link InMemoryRateLimiter.check}. */
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Sliding-window in-memory rate limiter with automatic stale-entry eviction.
 */
export class InMemoryRateLimiter {
  private readonly windowMs: number;
  private readonly maxRequests: number;
  private readonly hits: Map<string, { count: number; resetAt: number }> = new Map();

  constructor(windowMs = DEFAULT_RATE_WINDOW_MS, maxRequests = DEFAULT_RATE_MAX_REQUESTS) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
  }

  /** Evaluates and records a hit for a client key, returning remaining quota or retry delay. */
  public check(ipKey: string, now = Date.now()): RateLimitResult {
    if (this.hits.size > RATE_LIMIT_EVICTION_THRESHOLD) {
      for (const [key, entry] of this.hits.entries()) {
        if (now >= entry.resetAt) {
          this.hits.delete(key);
        }
      }
    }

    const record = this.hits.get(ipKey);
    if (!record || now >= record.resetAt) {
      this.hits.set(ipKey, { count: 1, resetAt: now + this.windowMs });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        retryAfterSeconds: Math.ceil(this.windowMs / 1000),
      };
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((record.resetAt - now) / 1000));
    if (record.count >= this.maxRequests) {
      return { allowed: false, remaining: 0, retryAfterSeconds };
    }

    record.count += 1;
    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      retryAfterSeconds,
    };
  }

  /** Returns the current number of tracked IP keys (useful for eviction verification). */
  public get size(): number {
    return this.hits.size;
  }
}
