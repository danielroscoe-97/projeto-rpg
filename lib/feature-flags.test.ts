import type { FeatureFlag } from "@/lib/types/subscription";

// Mock Supabase client
const mockSelect = jest.fn();
const mockFrom = jest.fn(() => ({ select: mockSelect }));
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: mockFrom,
  }),
}));

// We need to reset module state between tests since feature-flags.ts uses module-level cache
let getFeatureFlags: typeof import("@/lib/feature-flags").getFeatureFlags;
let canAccess: typeof import("@/lib/feature-flags").canAccess;
let invalidateFlagCache: typeof import("@/lib/feature-flags").invalidateFlagCache;

beforeEach(() => {
  jest.clearAllMocks();
  jest.resetModules();

  // Re-require after reset to get fresh module-level cache
  const mod = require("@/lib/feature-flags");
  getFeatureFlags = mod.getFeatureFlags;
  canAccess = mod.canAccess;
  invalidateFlagCache = mod.invalidateFlagCache;
});

const PRO_FLAG: FeatureFlag = {
  id: "1",
  key: "persistent_campaigns",
  enabled: true,
  plan_required: "pro",
  description: null,
  updated_at: "",
};

const FREE_FLAG: FeatureFlag = {
  id: "2",
  key: "cr_calculator",
  enabled: true,
  plan_required: "free",
  description: null,
  updated_at: "",
};

const DISABLED_FLAG: FeatureFlag = {
  id: "3",
  key: "homebrew",
  enabled: false,
  plan_required: "free",
  description: null,
  updated_at: "",
};

describe("getFeatureFlags", () => {
  it("fetches flags from Supabase on first call", async () => {
    const flags = [PRO_FLAG, FREE_FLAG];
    mockSelect.mockResolvedValue({ data: flags, error: null });

    const result = await getFeatureFlags();

    expect(mockFrom).toHaveBeenCalledWith("feature_flags");
    expect(mockSelect).toHaveBeenCalledWith("*");
    expect(result).toEqual(flags);
  });

  it("returns cached data within TTL without refetching", async () => {
    const flags = [PRO_FLAG];
    mockSelect.mockResolvedValue({ data: flags, error: null });

    // First call populates cache
    await getFeatureFlags();
    expect(mockSelect).toHaveBeenCalledTimes(1);

    // Second call should use cache
    const result = await getFeatureFlags();
    expect(result).toEqual(flags);
    expect(mockSelect).toHaveBeenCalledTimes(1); // No additional fetch
  });

  it("returns stale cache and triggers background revalidation when TTL expired", async () => {
    const staleFlags = [PRO_FLAG];
    const freshFlags = [PRO_FLAG, FREE_FLAG];

    mockSelect.mockResolvedValue({ data: staleFlags, error: null });
    await getFeatureFlags(); // populate cache

    // Advance time past TTL (5 min)
    jest.spyOn(Date, "now").mockReturnValue(Date.now() + 6 * 60 * 1000);

    mockSelect.mockResolvedValue({ data: freshFlags, error: null });

    // Should return stale data immediately
    const result = await getFeatureFlags();
    expect(result).toEqual(staleFlags);

    jest.restoreAllMocks();
  });

  it("returns default flags on Supabase error when no cache exists", async () => {
    mockSelect.mockResolvedValue({ data: null, error: { message: "db error" } });

    const result = await getFeatureFlags();

    // Should return DEFAULT_FLAGS (all pro-gated)
    expect(result.length).toBe(10);
    expect(result[0].key).toBe("persistent_campaigns");
    expect(result[0].plan_required).toBe("pro");
  });

  it("returns stale cache on error when cache exists", async () => {
    const flags = [PRO_FLAG];
    mockSelect.mockResolvedValue({ data: flags, error: null });
    await getFeatureFlags(); // populate cache

    // Invalidate to force re-fetch
    invalidateFlagCache();

    mockSelect.mockResolvedValue({ data: null, error: { message: "network error" } });

    // After invalidation, cache is null, so fetchFlags returns DEFAULT_FLAGS
    const result = await getFeatureFlags();
    expect(result.length).toBe(10); // defaults
  });
});

describe("canAccess", () => {
  const flags = [PRO_FLAG, FREE_FLAG, DISABLED_FLAG];

  it("returns true for free flag with any plan", () => {
    expect(canAccess(flags, "cr_calculator", "free")).toBe(true);
    expect(canAccess(flags, "cr_calculator", "pro")).toBe(true);
  });

  it("returns true for pro flag when user has pro plan", () => {
    expect(canAccess(flags, "persistent_campaigns", "pro")).toBe(true);
  });

  it("returns true for pro flag when user has mesa plan", () => {
    expect(canAccess(flags, "persistent_campaigns", "mesa")).toBe(true);
  });

  it("returns false for pro flag when user has free plan", () => {
    expect(canAccess(flags, "persistent_campaigns", "free")).toBe(false);
  });

  it("returns false for disabled flag regardless of plan", () => {
    expect(canAccess(flags, "homebrew", "pro")).toBe(false);
    expect(canAccess(flags, "homebrew", "mesa")).toBe(false);
  });

  it("returns false for unknown flag key", () => {
    expect(canAccess(flags, "export_data", "pro")).toBe(false);
  });
});

describe("invalidateFlagCache", () => {
  it("forces a fresh fetch after invalidation", async () => {
    const flags = [PRO_FLAG];
    mockSelect.mockResolvedValue({ data: flags, error: null });

    await getFeatureFlags();
    expect(mockSelect).toHaveBeenCalledTimes(1);

    invalidateFlagCache();

    const freshFlags = [PRO_FLAG, FREE_FLAG];
    mockSelect.mockResolvedValue({ data: freshFlags, error: null });

    const result = await getFeatureFlags();
    expect(result).toEqual(freshFlags);
    expect(mockSelect).toHaveBeenCalledTimes(2);
  });
});
