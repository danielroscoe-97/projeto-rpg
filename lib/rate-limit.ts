import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

/**
 * Upstash Redis-backed rate limiter with sliding window.
 * Persists state across serverless cold starts.
 *
 * Fail-open: if Redis is unavailable or env vars are missing,
 * requests are allowed through with a console warning.
 */

const WINDOW_DURATION = "15 m" as const;
const MAX_REQUESTS = 10;

function createRatelimit(): Ratelimit | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled (fail-open)"
    );
    return null;
  }

  try {
    const redis = new Redis({ url, token });

    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(MAX_REQUESTS, WINDOW_DURATION),
      analytics: true,
      prefix: "pocketdm:ratelimit",
    });
  } catch (err) {
    console.warn("[rate-limit] Failed to initialize Upstash Redis — rate limiting disabled (fail-open)", err);
    return null;
  }
}

// Module-level singleton — reused across requests within the same instance
let ratelimit: Ratelimit | null | undefined;

function getRatelimit(): Ratelimit | null {
  if (ratelimit === undefined) {
    ratelimit = createRatelimit();
  }
  return ratelimit;
}

export type RateLimitResult = {
  limited: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

/**
 * Check if an identifier (typically IP) has exceeded the rate limit.
 * Returns `{ limited: false }` if Redis is unavailable (fail-open).
 */
export async function checkRateLimit(identifier: string): Promise<RateLimitResult> {
  const limiter = getRatelimit();

  if (!limiter) {
    // Fail-open: no Redis available
    return { limited: false, limit: MAX_REQUESTS, remaining: MAX_REQUESTS, reset: 0 };
  }

  try {
    const result = await limiter.limit(identifier);

    return {
      limited: !result.success,
      limit: result.limit,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    console.warn("[rate-limit] Redis request failed — allowing request (fail-open)", err);
    return { limited: false, limit: MAX_REQUESTS, remaining: MAX_REQUESTS, reset: 0 };
  }
}
