import { renderHook, waitFor } from "@testing-library/react";
import { useFeatureGate } from "./use-feature-gate";
import { useSubscriptionStore } from "@/lib/stores/subscription-store";
import type { FeatureFlag } from "@/lib/types/subscription";

// Mock feature flags module
const mockGetFeatureFlags = jest.fn();
jest.mock("@/lib/feature-flags", () => ({
  getFeatureFlags: (...args: unknown[]) => mockGetFeatureFlags(...args),
  canAccess: jest.requireActual("@/lib/feature-flags").canAccess,
}));

// Mock Supabase client (needed by subscription store)
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn().mockResolvedValue({ data: null }),
        })),
      })),
    })),
  }),
}));

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

beforeEach(() => {
  jest.clearAllMocks();
  // Reset subscription store to known state
  useSubscriptionStore.setState({
    plan: "free",
    status: null,
    subscription: null,
    loading: false,
    initialized: true,
    sessionDmPlan: null,
  });
});

describe("useFeatureGate", () => {
  it("returns loading: true while flags are being fetched", () => {
    // Never resolve the flags promise
    mockGetFeatureFlags.mockReturnValue(new Promise(() => {}));
    useSubscriptionStore.setState({ initialized: true, loading: false });

    const { result } = renderHook(() => useFeatureGate("persistent_campaigns"));

    expect(result.current.loading).toBe(true);
    expect(result.current.allowed).toBe(false);
  });

  it("returns loading: true while subscription is loading", () => {
    mockGetFeatureFlags.mockResolvedValue([PRO_FLAG]);
    useSubscriptionStore.setState({ initialized: false, loading: true });

    const { result } = renderHook(() => useFeatureGate("persistent_campaigns"));

    expect(result.current.loading).toBe(true);
  });

  it("returns allowed: true when flag is free-tier", async () => {
    mockGetFeatureFlags.mockResolvedValue([FREE_FLAG]);

    const { result } = renderHook(() => useFeatureGate("cr_calculator"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(true);
  });

  it("returns allowed: true when user plan meets pro requirement", async () => {
    mockGetFeatureFlags.mockResolvedValue([PRO_FLAG]);
    useSubscriptionStore.setState({ plan: "pro", initialized: true, loading: false });

    const { result } = renderHook(() => useFeatureGate("persistent_campaigns"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(true);
  });

  it("returns allowed: false when free user tries pro feature", async () => {
    mockGetFeatureFlags.mockResolvedValue([PRO_FLAG]);
    useSubscriptionStore.setState({ plan: "free", initialized: true, loading: false });

    const { result } = renderHook(() => useFeatureGate("persistent_campaigns"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(false);
  });

  it("Mesa model: returns allowed: true when sessionDmPlan is pro", async () => {
    mockGetFeatureFlags.mockResolvedValue([PRO_FLAG]);
    useSubscriptionStore.setState({
      plan: "free",
      sessionDmPlan: "pro",
      initialized: true,
      loading: false,
    });

    const { result } = renderHook(() => useFeatureGate("persistent_campaigns"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    // Free user in a pro DM's session should get access
    expect(result.current.allowed).toBe(true);
  });

  it("Mesa model: returns allowed: true when sessionDmPlan is mesa", async () => {
    mockGetFeatureFlags.mockResolvedValue([PRO_FLAG]);
    useSubscriptionStore.setState({
      plan: "free",
      sessionDmPlan: "mesa",
      initialized: true,
      loading: false,
    });

    const { result } = renderHook(() => useFeatureGate("persistent_campaigns"));

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(result.current.allowed).toBe(true);
  });
});
