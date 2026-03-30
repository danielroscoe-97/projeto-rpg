import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";

/**
 * Upstash Redis-backed rate limiter with sliding window.
 * Persists state across serverless cold starts.
 *
 * Fail-open: if Redis is unavailable or env vars are missing,
 * requests are allowed through with a console warning.
 */

const DEFAULT_WINDOW = "15 m" as const;
const DEFAULT_MAX = 10;

// Cache of Ratelimit instances keyed by "max:window"
const limiterCache = new Map<string, Ratelimit>();

function getRedis(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    console.warn(
      "[rate-limit] UPSTASH_REDIS_REST_URL or UPSTASH_REDIS_REST_TOKEN not set — rate limiting disabled (fail-open)"
    );
    return null;
  }

  try {
    return new Redis({ url, token });
  } catch (err) {
    console.warn("[rate-limit] Failed to initialize Upstash Redis — rate limiting disabled (fail-open)", err);
    return null;
  }
}

// Module-level singleton Redis instance
let redis: Redis | null | undefined;

function getRedisInstance(): Redis | null {
  if (redis === undefined) {
    redis = getRedis();
  }
  return redis;
}

function createRatelimit(maxRequests: number = DEFAULT_MAX, window: string = DEFAULT_WINDOW): Ratelimit | null {
  const r = getRedisInstance();
  if (!r) return null;

  const key = `${maxRequests}:${window}`;
  const cached = limiterCache.get(key);
  if (cached) return cached;

  try {
    const limiter = new Ratelimit({
      redis: r,
      limiter: Ratelimit.slidingWindow(maxRequests, window as Parameters<typeof Ratelimit.slidingWindow>[1]),
      analytics: true,
      prefix: "pocketdm:ratelimit",
    });
    limiterCache.set(key, limiter);
    return limiter;
  } catch (err) {
    console.warn("[rate-limit] Failed to create Ratelimit instance — rate limiting disabled (fail-open)", err);
    return null;
  }
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
export async function checkRateLimit(
  identifier: string,
  maxRequests?: number,
  window?: string
): Promise<RateLimitResult> {
  const limiter = createRatelimit(maxRequests, window);

  if (!limiter) {
    // Fail-open: no Redis available
    return { limited: false, limit: DEFAULT_MAX, remaining: DEFAULT_MAX, reset: 0 };
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
    return { limited: false, limit: DEFAULT_MAX, remaining: DEFAULT_MAX, reset: 0 };
  }
}

/* ── Helper: extract client IP from request ─────────────────────────── */

async function getClientIp(request?: NextRequest): Promise<string> {
  try {
    if (request) {
      return (
        request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
        request.headers.get("x-real-ip") ||
        "unknown"
      );
    }
    // Fallback for route handlers without NextRequest
    const h = await headers();
    return (
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      h.get("x-real-ip") ||
      "unknown"
    );
  } catch {
    return "unknown";
  }
}

/* ── withRateLimit: wrapper for API route handlers ──────────────────── */

type RouteHandler = (
  request: NextRequest,
  context: { params: Promise<Record<string, string>> }
) => Promise<NextResponse> | NextResponse;

type RateLimitConfig = {
  /** Max requests in the window */
  max: number;
  /** Window duration string, e.g. "15 m", "1 m", "1 h" */
  window: string;
  /** Optional: use a specific prefix for the identifier (e.g. route path) */
  prefix?: string;
};

/**
 * Wraps an API route handler with rate limiting.
 * Returns 429 with Retry-After header when limit is exceeded.
 * Fails open if Redis is unavailable.
 *
 * @example
 * export const POST = withRateLimit(
 *   async (request) => { ... },
 *   { max: 5, window: "15 m" }
 * );
 */
export function withRateLimit(
  handler: RouteHandler,
  config: RateLimitConfig
): RouteHandler {
  return async (request: NextRequest, context: { params: Promise<Record<string, string>> }) => {
    const limiter = createRatelimit(config.max, config.window);

    if (!limiter) {
      // Fail-open
      return handler(request, context);
    }

    try {
      const ip = await getClientIp(request);
      const prefix = config.prefix || request.nextUrl.pathname;
      const identifier = `${prefix}:${ip}`;

      const result = await limiter.limit(identifier);

      if (!result.success) {
        const retryAfterSeconds = Math.ceil((result.reset - Date.now()) / 1000);
        return NextResponse.json(
          { error: "Too many requests" },
          {
            status: 429,
            headers: {
              "Retry-After": String(Math.max(retryAfterSeconds, 1)),
              "X-RateLimit-Limit": String(result.limit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": String(result.reset),
            },
          }
        );
      }

      // Add rate limit headers to the response
      const response = await handler(request, context);

      response.headers.set("X-RateLimit-Limit", String(result.limit));
      response.headers.set("X-RateLimit-Remaining", String(result.remaining));
      response.headers.set("X-RateLimit-Reset", String(result.reset));

      return response;
    } catch (err) {
      console.warn("[rate-limit] Rate limit check failed — allowing request (fail-open)", err);
      return handler(request, context);
    }
  };
}
