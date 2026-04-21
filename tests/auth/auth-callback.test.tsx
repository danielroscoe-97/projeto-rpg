/**
 * Unit tests for `AuthCallbackContinueClient` — the client-side completion
 * of the Google OAuth flow. Verifies (Wave 2 C1 + M5 behaviors):
 *
 *   - When localStorage has `identity-upgrade-context-v1`, it calls the
 *     upgrade saga in OAuth mode (no placeholder credentials!) and then
 *     redirects to `next`.
 *   - When localStorage is empty, it just redirects.
 *   - When the saga errors, it surfaces an error banner with a Retry button
 *     and does NOT auto-redirect (M5 — explicit user acknowledgement).
 *   - The localStorage entry is cleared after read (no replay).
 *   - Retry re-POSTs the same payload.
 *   - Dismiss ("continue anyway") navigates away.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams("next=/app/dashboard"),
}));

const trackEventMock = jest.fn();
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => trackEventMock(...args),
}));

const mockFetch = jest.fn();
beforeAll(() => {
  (global as unknown as { fetch: typeof fetch }).fetch =
    mockFetch as unknown as typeof fetch;
});

import { AuthCallbackContinueClient } from "@/app/auth/callback/continue/AuthCallbackContinueClient";
import {
  IDENTITY_UPGRADE_CONTEXT_KEY,
  type PersistedUpgradeContext,
} from "@/lib/auth/upgrade-context-storage";

function writeContext(ctx: Partial<PersistedUpgradeContext>): void {
  const full: PersistedUpgradeContext = {
    sessionTokenId: ctx.sessionTokenId ?? "tok-1",
    campaignId: ctx.campaignId,
    guestCharacter: ctx.guestCharacter,
    savedAt: ctx.savedAt ?? Date.now(),
  };
  localStorage.setItem(IDENTITY_UPGRADE_CONTEXT_KEY, JSON.stringify(full));
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
});

describe("AuthCallbackContinueClient", () => {
  it("calls /api/player-identity/upgrade with mode=oauth and sessionTokenId then redirects to next", async () => {
    writeContext({ sessionTokenId: "tok-99" });
    mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/player-identity/upgrade",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }),
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body);
    expect(body.sessionTokenId).toBe("tok-99");
    // Wave 2 C1 fix: explicit oauth mode, NO placeholder credentials.
    expect(body.mode).toBe("oauth");
    expect(body.credentials).toBeUndefined();
    // Entry should be cleared (consume-on-read).
    expect(localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY)).toBeNull();
    // After resolve, router.replace should hit the dashboard. Flush a few
    // microtasks: Wave 3a interleaves an async guest-migrate drain between
    // the upgrade response and the redirect.
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });
    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
  });

  it("skips upgrade call when no context and redirects directly", async () => {
    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });
    // Wave 3a: no-context branch is async (runs guest-migrate drain first),
    // so flush pending microtasks before asserting the redirect.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
  });

  it("shows loading state while working", async () => {
    writeContext({ sessionTokenId: "tok-1" });
    // Never-resolving promise to keep the component in working state.
    mockFetch.mockReturnValue(new Promise(() => {}));
    render(<AuthCallbackContinueClient />);
    // testid on wrapper
    expect(screen.getByTestId("auth.callback.continue")).toBeInTheDocument();
  });

  it("surfaces error banner with Retry + Dismiss when upgrade fails (no silent redirect)", async () => {
    writeContext({ sessionTokenId: "tok-1" });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 502,
      json: async () => ({ ok: false, code: "update_user_failed", message: "provider error" }),
    });

    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(
      screen.getByTestId("auth.callback.continue.error"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("auth.callback.continue.retry"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("auth.callback.continue.dismiss"),
    ).toBeInTheDocument();
    // Critical: no auto-redirect happened.
    expect(replaceMock).not.toHaveBeenCalled();
    // Analytics event fired — Wave 3a (W#5) shape via trackConversionFailed.
    // Cluster ε (Winston #7) — server-localized strings like "provider error"
    // collapse to the `"unknown"` sentinel via the allowlist normalizer so
    // analytics cardinality stays bounded.
    expect(trackEventMock).toHaveBeenCalledWith(
      "conversion:failed",
      expect.objectContaining({
        moment: "recap_anon",
        error: "unknown",
      }),
    );
  });

  it("Retry re-POSTs the same payload and navigates on success", async () => {
    writeContext({ sessionTokenId: "tok-retry" });
    // First call fails, second succeeds.
    mockFetch
      .mockResolvedValueOnce({
        ok: false,
        status: 502,
        json: async () => ({ ok: false, code: "update_user_failed" }),
      })
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ok: true }) });

    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("auth.callback.continue.retry"));
    await act(async () => {
      await Promise.resolve();
      await Promise.resolve();
      await Promise.resolve();
    });

    expect(mockFetch).toHaveBeenCalledTimes(2);
    const secondBody = JSON.parse(mockFetch.mock.calls[1][1].body);
    expect(secondBody.sessionTokenId).toBe("tok-retry");
    expect(secondBody.mode).toBe("oauth");
    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
  });

  it("Dismiss navigates to next even when upgrade failed", async () => {
    writeContext({ sessionTokenId: "tok-1" });
    mockFetch.mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ ok: false }),
    });

    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });
    await act(async () => {
      await Promise.resolve();
    });

    const user = userEvent.setup();
    await user.click(screen.getByTestId("auth.callback.continue.dismiss"));

    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    // Wave 3a (W#5): dismiss also routes through trackConversionFailed.
    expect(trackEventMock).toHaveBeenCalledWith(
      "conversion:failed",
      expect.objectContaining({
        moment: "recap_anon",
        error: "user_dismissed",
      }),
    );
  });

  it("stale localStorage (>60min) is ignored — no upgrade call", async () => {
    writeContext({
      sessionTokenId: "tok-stale",
      // TTL bumped to 60m in Wave 2 M4 — use 90m to guarantee staleness.
      savedAt: Date.now() - 90 * 60 * 1000,
    });
    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });
    // Wave 3a: no-context branch is now async (runs guest-migrate drain
    // first). Flush microtasks so the redirect lands before we assert.
    await act(async () => {
      await Promise.resolve();
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
  });
});
