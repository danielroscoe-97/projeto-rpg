/**
 * Tests for Upstash Redis rate limiter.
 *
 * Mocks @upstash/redis and @upstash/ratelimit to verify:
 * - Sliding window rate limiting via Upstash
 * - Fail-open when env vars are missing
 * - Fail-open when Redis throws
 */

const mockLimit = jest.fn();
const mockSlidingWindow = jest.fn().mockReturnValue("sliding-window-config");

jest.mock("@upstash/redis", () => ({
  Redis: jest.fn().mockImplementation(() => ({})),
}));

jest.mock("@upstash/ratelimit", () => {
  const MockRatelimit = jest.fn().mockImplementation(() => ({
    limit: mockLimit,
  }));
  MockRatelimit.slidingWindow = mockSlidingWindow;
  return { Ratelimit: MockRatelimit };
});

// Must be imported AFTER mocks are set up
import { checkRateLimit } from "./rate-limit";
import { Ratelimit } from "@upstash/ratelimit";

const originalEnv = process.env;

beforeEach(() => {
  jest.clearAllMocks();
  // Reset the module-level singleton by re-requiring
  // We need to reset the cached ratelimit instance between tests
  jest.resetModules();
});

afterAll(() => {
  process.env = originalEnv;
});

describe("checkRateLimit", () => {
  describe("when env vars are set", () => {
    beforeEach(() => {
      process.env = {
        ...originalEnv,
        UPSTASH_REDIS_REST_URL: "https://test.upstash.io",
        UPSTASH_REDIS_REST_TOKEN: "test-token",
      };
    });

    it("returns limited: false when under the limit", async () => {
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 10,
        remaining: 9,
        reset: Date.now() + 900000,
      });

      // Re-import to pick up fresh env
      const { checkRateLimit: freshCheck } = await import("./rate-limit");
      const result = await freshCheck("192.168.1.1");

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(9);
      expect(mockLimit).toHaveBeenCalledWith("192.168.1.1");
    });

    it("returns limited: true when over the limit", async () => {
      const resetTime = Date.now() + 900000;
      mockLimit.mockResolvedValueOnce({
        success: false,
        limit: 10,
        remaining: 0,
        reset: resetTime,
      });

      const { checkRateLimit: freshCheck } = await import("./rate-limit");
      const result = await freshCheck("192.168.1.1");

      expect(result.limited).toBe(true);
      expect(result.remaining).toBe(0);
      expect(result.reset).toBe(resetTime);
    });

    it("calls limiter with the correct identifier", async () => {
      mockLimit.mockResolvedValueOnce({
        success: true,
        limit: 10,
        remaining: 8,
        reset: Date.now() + 900000,
      });

      const { checkRateLimit: freshCheck } = await import("./rate-limit");
      await freshCheck("10.0.0.1");

      expect(mockLimit).toHaveBeenCalledWith("10.0.0.1");
    });

    it("fail-open when Redis throws on limit()", async () => {
      mockLimit.mockRejectedValueOnce(new Error("Redis connection refused"));

      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const { checkRateLimit: freshCheck } = await import("./rate-limit");
      const result = await freshCheck("192.168.1.1");

      expect(result.limited).toBe(false);
      expect(result.remaining).toBe(10);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("fail-open"),
        expect.any(Error)
      );

      warnSpy.mockRestore();
    });
  });

  describe("when env vars are missing", () => {
    beforeEach(() => {
      process.env = { ...originalEnv };
      delete process.env.UPSTASH_REDIS_REST_URL;
      delete process.env.UPSTASH_REDIS_REST_TOKEN;
    });

    it("fail-open with warning when URL is missing", async () => {
      const warnSpy = jest.spyOn(console, "warn").mockImplementation();
      const { checkRateLimit: freshCheck } = await import("./rate-limit");
      const result = await freshCheck("192.168.1.1");

      expect(result.limited).toBe(false);
      expect(result.limit).toBe(10);
      expect(result.remaining).toBe(10);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("not set")
      );

      warnSpy.mockRestore();
    });

    it("never calls Ratelimit when env vars are missing", async () => {
      jest.spyOn(console, "warn").mockImplementation();
      const { checkRateLimit: freshCheck } = await import("./rate-limit");
      await freshCheck("192.168.1.1");

      expect(mockLimit).not.toHaveBeenCalled();

      (console.warn as jest.Mock).mockRestore();
    });
  });
});
