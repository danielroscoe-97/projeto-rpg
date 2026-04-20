import { renderHook, waitFor } from "@testing-library/react";
import { useContentAccess } from "./use-content-access";

const mockGetUser = jest.fn();
const mockWhitelistSingle = jest.fn();
const mockAgreementSingle = jest.fn();
const mockAdminSingle = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: (...args: unknown[]) => mockGetUser(...args) },
    from: (table: string) => {
      if (table === "users") {
        return {
          select: () => ({
            eq: () => ({ single: () => mockAdminSingle() }),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => ({
            is: () => ({ maybeSingle: () => mockWhitelistSingle() }),
            eq: () => ({ maybeSingle: () => mockAgreementSingle() }),
          }),
        }),
      };
    },
  }),
}));

jest.mock("./use-feature-gate", () => ({
  useFeatureGate: () => ({ allowed: true, loading: false }),
}));

beforeEach(() => {
  jest.clearAllMocks();
  mockAdminSingle.mockResolvedValue({ data: { is_admin: false }, error: null });
  mockWhitelistSingle.mockResolvedValue({ data: null, error: null });
  mockAgreementSingle.mockResolvedValue({ data: null, error: null });
});

describe("useContentAccess — SRD Compliance gating", () => {
  it("REGRESSION: anon user with whitelist + agreement still returns canAccess=false", async () => {
    // Anonymous Supabase users must NEVER be treated as authenticated for
    // non-SRD gating — even if whitelist/agreement rows accidentally exist.
    mockGetUser.mockResolvedValue({
      data: { user: { id: "anon-x", is_anonymous: true } },
    });
    mockWhitelistSingle.mockResolvedValue({ data: { id: "w1" }, error: null });
    mockAgreementSingle.mockResolvedValue({ data: { id: "a1" }, error: null });

    const { result } = renderHook(() => useContentAccess());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.canAccess).toBe(false);
  });

  it("guest (no Supabase user) returns canAccess=false", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const { result } = renderHook(() => useContentAccess());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.canAccess).toBe(false);
  });

  it("real-auth user without whitelist/agreement returns canAccess=false", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "real-1", is_anonymous: false } },
    });

    const { result } = renderHook(() => useContentAccess());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.canAccess).toBe(false);
  });

  it("real-auth whitelisted user returns canAccess=true", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "real-2", is_anonymous: false } },
    });
    mockWhitelistSingle.mockResolvedValue({ data: { id: "w1" }, error: null });

    const { result } = renderHook(() => useContentAccess());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isWhitelisted).toBe(true);
    expect(result.current.canAccess).toBe(true);
  });

  it("real-auth user with agreement accepted returns canAccess=true", async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: "real-3", is_anonymous: false } },
    });
    mockAgreementSingle.mockResolvedValue({ data: { id: "a1" }, error: null });

    const { result } = renderHook(() => useContentAccess());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.hasAgreed).toBe(true);
    expect(result.current.canAccess).toBe(true);
  });

  it("user with is_anonymous undefined (defensive) is treated as real auth", async () => {
    // Old Supabase SDKs may not expose is_anonymous; default to NOT anon so
    // existing real-auth flows keep working.
    mockGetUser.mockResolvedValue({ data: { user: { id: "real-4" } } });
    mockWhitelistSingle.mockResolvedValue({ data: { id: "w1" }, error: null });

    const { result } = renderHook(() => useContentAccess());

    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.canAccess).toBe(true);
  });
});
