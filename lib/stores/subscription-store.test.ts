import { useSubscriptionStore } from "./subscription-store";

// Mock Supabase client
const mockGetUser = jest.fn();
const mockSingle = jest.fn();
const mockEq = jest.fn(() => ({ single: mockSingle }));
const mockSelect = jest.fn(() => ({ eq: mockEq }));
const mockFrom = jest.fn(() => ({ select: mockSelect }));

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  // Reset store to initial state
  useSubscriptionStore.setState({
    plan: "free",
    status: null,
    subscription: null,
    loading: false,
    initialized: false,
    sessionDmPlan: null,
  });
});

describe("subscription-store", () => {
  describe("initial state", () => {
    it("defaults to free plan", () => {
      const state = useSubscriptionStore.getState();
      expect(state.plan).toBe("free");
      expect(state.status).toBeNull();
      expect(state.subscription).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(false);
      expect(state.sessionDmPlan).toBeNull();
    });
  });

  describe("loadSubscription", () => {
    it("fetches subscription from Supabase for authenticated user", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });
      mockSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          plan: "pro",
          status: "active",
          stripe_subscription_id: "stripe_123",
          stripe_customer_id: "cus_123",
          trial_ends_at: null,
          current_period_end: "2026-04-01",
          created_at: "2026-03-01",
          updated_at: "2026-03-01",
        },
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.plan).toBe("pro");
      expect(state.status).toBe("active");
      expect(state.subscription).not.toBeNull();
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(true);
    });

    it("sets free plan when no user is logged in", async () => {
      mockGetUser.mockResolvedValue({ data: { user: null } });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.plan).toBe("free");
      expect(state.initialized).toBe(true);
    });

    it("sets free plan when no subscription found", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });
      mockSingle.mockResolvedValue({ data: null });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.plan).toBe("free");
      expect(state.initialized).toBe(true);
    });

    it("sets free plan when subscription is canceled", async () => {
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });
      mockSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          plan: "pro",
          status: "canceled",
          stripe_subscription_id: null,
          stripe_customer_id: null,
          trial_ends_at: null,
          current_period_end: null,
          created_at: "2026-03-01",
          updated_at: "2026-03-01",
        },
      });

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.plan).toBe("free");
    });

    it("respects active trial period", async () => {
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });
      mockSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          plan: "pro",
          status: "trialing",
          stripe_subscription_id: null,
          stripe_customer_id: null,
          trial_ends_at: futureDate,
          current_period_end: null,
          created_at: "2026-03-01",
          updated_at: "2026-03-01",
        },
      });

      await useSubscriptionStore.getState().loadSubscription();

      expect(useSubscriptionStore.getState().plan).toBe("pro");
    });

    it("sets free when trial has expired", async () => {
      const pastDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      mockGetUser.mockResolvedValue({
        data: { user: { id: "user-1" } },
      });
      mockSingle.mockResolvedValue({
        data: {
          id: "sub-1",
          user_id: "user-1",
          plan: "pro",
          status: "trialing",
          stripe_subscription_id: null,
          stripe_customer_id: null,
          trial_ends_at: pastDate,
          current_period_end: null,
          created_at: "2026-03-01",
          updated_at: "2026-03-01",
        },
      });

      await useSubscriptionStore.getState().loadSubscription();

      expect(useSubscriptionStore.getState().plan).toBe("free");
    });

    it("does not refetch if already initialized", async () => {
      useSubscriptionStore.setState({ initialized: true });

      await useSubscriptionStore.getState().loadSubscription();

      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it("does not refetch if currently loading", async () => {
      useSubscriptionStore.setState({ loading: true });

      await useSubscriptionStore.getState().loadSubscription();

      expect(mockGetUser).not.toHaveBeenCalled();
    });

    it("sets free plan on error", async () => {
      mockGetUser.mockRejectedValue(new Error("Network error"));

      await useSubscriptionStore.getState().loadSubscription();

      const state = useSubscriptionStore.getState();
      expect(state.plan).toBe("free");
      expect(state.initialized).toBe(true);
      expect(state.loading).toBe(false);
    });
  });

  describe("setSessionDmPlan", () => {
    it("updates sessionDmPlan", () => {
      useSubscriptionStore.getState().setSessionDmPlan("pro");
      expect(useSubscriptionStore.getState().sessionDmPlan).toBe("pro");
    });

    it("can clear sessionDmPlan", () => {
      useSubscriptionStore.getState().setSessionDmPlan("pro");
      useSubscriptionStore.getState().setSessionDmPlan(null);
      expect(useSubscriptionStore.getState().sessionDmPlan).toBeNull();
    });
  });

  describe("effectivePlan", () => {
    it("returns individual plan when no session DM plan", () => {
      useSubscriptionStore.setState({ plan: "pro", sessionDmPlan: null });
      expect(useSubscriptionStore.getState().effectivePlan()).toBe("pro");
    });

    it("returns pro when sessionDmPlan is pro (Mesa model)", () => {
      useSubscriptionStore.setState({ plan: "free", sessionDmPlan: "pro" });
      expect(useSubscriptionStore.getState().effectivePlan()).toBe("pro");
    });

    it("returns pro when sessionDmPlan is mesa", () => {
      useSubscriptionStore.setState({ plan: "free", sessionDmPlan: "mesa" });
      expect(useSubscriptionStore.getState().effectivePlan()).toBe("pro");
    });

    it("returns individual plan when sessionDmPlan is free", () => {
      useSubscriptionStore.setState({ plan: "free", sessionDmPlan: "free" });
      expect(useSubscriptionStore.getState().effectivePlan()).toBe("free");
    });

    it("returns max of individual and session plan", () => {
      useSubscriptionStore.setState({ plan: "pro", sessionDmPlan: "free" });
      expect(useSubscriptionStore.getState().effectivePlan()).toBe("pro");
    });
  });

  describe("reset", () => {
    it("clears all state back to defaults", () => {
      // Set some state first
      useSubscriptionStore.setState({
        plan: "pro",
        status: "active",
        subscription: {
          id: "sub-1",
          user_id: "user-1",
          plan: "pro",
          status: "active",
          stripe_subscription_id: "stripe_123",
          stripe_customer_id: "cus_123",
          trial_ends_at: null,
          current_period_end: null,
          created_at: "",
          updated_at: "",
        },
        loading: false,
        initialized: true,
        sessionDmPlan: "pro",
      });

      useSubscriptionStore.getState().reset();

      const state = useSubscriptionStore.getState();
      expect(state.plan).toBe("free");
      expect(state.status).toBeNull();
      expect(state.subscription).toBeNull();
      expect(state.loading).toBe(false);
      expect(state.initialized).toBe(false);
      expect(state.sessionDmPlan).toBeNull();
    });
  });
});
