/**
 * Unit tests for `AuthCallbackContinueClient` — the client-side completion
 * of the Google OAuth flow. Verifies:
 *
 *   - When localStorage has `identity-upgrade-context-v1`, it calls the
 *     upgrade saga and then redirects to `next`.
 *   - When localStorage is empty, it just redirects.
 *   - When the saga errors, it still eventually redirects (no user stranding).
 *   - The localStorage entry is cleared after read (no replay).
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";

const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams("next=/app/dashboard"),
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
  it("calls /api/player-identity/upgrade with persisted sessionTokenId then redirects to next", async () => {
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
    // Entry should be cleared (consume-on-read).
    expect(localStorage.getItem(IDENTITY_UPGRADE_CONTEXT_KEY)).toBeNull();
    // After resolve, router.replace should hit the dashboard.
    await act(async () => {
      await Promise.resolve();
    });
    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
  });

  it("skips upgrade call when no context and redirects directly", async () => {
    await act(async () => {
      render(<AuthCallbackContinueClient />);
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

  it("redirects even when upgrade endpoint errors (no user stranding)", async () => {
    jest.useFakeTimers();
    writeContext({ sessionTokenId: "tok-1" });
    mockFetch.mockResolvedValue({
      ok: false,
      json: async () => ({ ok: false, code: "internal" }),
    });

    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });
    await act(async () => {
      await Promise.resolve();
    });
    // The delayed redirect uses setTimeout(1500)
    await act(async () => {
      jest.advanceTimersByTime(2000);
    });
    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    jest.useRealTimers();
  });

  it("stale localStorage (>15min) is ignored — no upgrade call", async () => {
    writeContext({
      sessionTokenId: "tok-stale",
      savedAt: Date.now() - 60 * 60 * 1000, // 1h old
    });
    await act(async () => {
      render(<AuthCallbackContinueClient />);
    });
    expect(mockFetch).not.toHaveBeenCalled();
    expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
  });
});
