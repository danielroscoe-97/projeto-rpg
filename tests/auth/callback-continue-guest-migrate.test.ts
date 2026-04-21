/**
 * Unit tests for `AuthCallbackContinueClient` — Wave 3a Cluster β fixes.
 *
 * Covers the three correctness bugs the callback had before this wave:
 *
 *   W#2 (guest OAuth migrate) — When `guest-migrate-pending` is set and
 *   there's no `upgradeContext`, the callback must POST to
 *   `/api/player-identity/migrate-guest-character` and fire
 *   `conversion:completed` with `moment: "recap_guest"`.
 *
 *   W#4 (anon OAuth completed) — When an `upgradeContext` with a `moment`
 *   tag is persisted, a successful `/upgrade` call must fire
 *   `conversion:completed` with that moment (not just redirect silently).
 *
 *   W#5 (conversion:failed shape) — All `conversion:failed` events must go
 *   through `trackConversionFailed(moment, { error, campaignId })` so the
 *   analytics payloads share one schema.
 *
 * The existing `tests/auth/auth-callback.test.tsx` already exercises the
 * happy anon path, retry, and stale TTL handling — we avoid duplicating
 * those and focus on the new branches.
 */

import React from "react";
import { render, act } from "@testing-library/react";

const replaceMock = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ replace: replaceMock, push: jest.fn() }),
  useSearchParams: () => new URLSearchParams("next=/app/dashboard"),
}));

// next-intl: stub `useTranslations` to return a pass-through so we don't
// need to load the locale messages bundle just for testing analytics.
jest.mock("next-intl", () => ({
  useTranslations: () => (key: string) => key,
}));

// The component imports `trackEvent` transitively through
// `lib/conversion/analytics.ts`. We mock the analytics module so our
// assertions capture the raw `trackEvent` call. (Mocking the wrappers
// themselves would hide the payload shape we're verifying in W#5.)
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
import {
  GUEST_MIGRATE_PENDING_KEY,
  type GuestMigratePending,
} from "@/lib/guest/guest-migrate-pending";
import type { Combatant } from "@/lib/types/combat";

function writeUpgradeContext(ctx: Partial<PersistedUpgradeContext>): void {
  const full: PersistedUpgradeContext = {
    sessionTokenId: ctx.sessionTokenId ?? "tok-1",
    campaignId: ctx.campaignId,
    guestCharacter: ctx.guestCharacter,
    moment: ctx.moment,
    savedAt: ctx.savedAt ?? Date.now(),
  };
  localStorage.setItem(IDENTITY_UPGRADE_CONTEXT_KEY, JSON.stringify(full));
}

function makeCombatant(overrides: Partial<Combatant> = {}): Combatant {
  return {
    id: "c-guest-1",
    name: "Valda",
    role: "player",
    is_player: true,
    is_hidden: false,
    max_hp: 20,
    current_hp: 14,
    temp_hp: 0,
    ac: 14,
    initiative: 0,
    initiative_modifier: 0,
    conditions: [],
    is_defeated: false,
    reaction_used: false,
    monster_id: null,
    monster_group_id: null,
    ...overrides,
  } as unknown as Combatant;
}

function writeGuestPending(overrides: Partial<GuestMigratePending> = {}): void {
  const payload: GuestMigratePending = {
    version: 1,
    guestCharacter: overrides.guestCharacter ?? makeCombatant(),
    campaignId: overrides.campaignId,
    selectedAt: overrides.selectedAt ?? new Date().toISOString(),
    // Cluster ε (Mary #3) — optional backward-compat field; pass-through.
    guestCombatantCount: overrides.guestCombatantCount,
  };
  localStorage.setItem(GUEST_MIGRATE_PENDING_KEY, JSON.stringify(payload));
}

/** Drain a handful of microtasks so awaited `fetch().json()` chains land. */
async function flushAsync(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
  });
}

beforeEach(() => {
  jest.clearAllMocks();
  localStorage.clear();
  // Cluster Δ C4 — sessionStorage fingerprint must be reset between tests so
  // stale values don't leak into the ownership-check assertions.
  sessionStorage.clear();
});

describe("AuthCallbackContinueClient — Wave 3a Cluster β", () => {
  describe("W#2 — guest migrate pending", () => {
    it("POSTs /migrate-guest-character and fires conversion:completed(recap_guest) when only guest pending is set", async () => {
      const character = makeCombatant({ id: "c-guest-42", name: "Mira" });
      writeGuestPending({ guestCharacter: character, campaignId: "camp-5" });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, character: { id: "pc-new-7" } }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // Only the migrate endpoint should be hit (no /upgrade — there was
      // no anon upgradeContext).
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/player-identity/migrate-guest-character",
        expect.objectContaining({
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }),
      );
      const body = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(body.guestCharacter.id).toBe("c-guest-42");
      expect(body.campaignId).toBe("camp-5");
      expect(body.setAsDefault).toBe(true);

      // conversion:completed fired with the shape the wrappers produce.
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({
          moment: "recap_guest",
          campaignId: "camp-5",
          characterId: "pc-new-7",
          flow: "signup_and_migrate",
        }),
      );

      // Key was consumed.
      expect(localStorage.getItem(GUEST_MIGRATE_PENDING_KEY)).toBeNull();
      // And we still redirected.
      expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    });

    it("fires conversion:failed(recap_guest) with the server code and still clears the key on 500", async () => {
      writeGuestPending({ campaignId: "camp-9" });

      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false, code: "internal" }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:failed",
        expect.objectContaining({
          moment: "recap_guest",
          campaignId: "camp-9",
          error: "internal",
        }),
      );
      // Even on failure we clear so we don't loop / duplicate-migrate.
      expect(localStorage.getItem(GUEST_MIGRATE_PENDING_KEY)).toBeNull();
      // Redirect still happens.
      expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    });

    it("fires conversion:failed(recap_guest) with network-like error when fetch rejects", async () => {
      writeGuestPending({ campaignId: "camp-9" });

      mockFetch.mockRejectedValue(new TypeError("NetworkError"));

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:failed",
        expect.objectContaining({
          moment: "recap_guest",
          campaignId: "camp-9",
          error: "TypeError",
        }),
      );
      expect(localStorage.getItem(GUEST_MIGRATE_PENDING_KEY)).toBeNull();
    });

    // Cluster ε (Mary #3) — when GuestRecapFlow persists the combatant count
    // alongside the pending record, the callback forwards it into the
    // conversion:completed payload so guest→auth funnels share the same shape
    // as in-page success.
    it("Cluster ε (Mary #3): forwards guestCombatantCount from pending record into conversion:completed", async () => {
      writeGuestPending({
        guestCharacter: makeCombatant({ id: "c-mary-1" }),
        campaignId: "camp-mary",
        guestCombatantCount: 3,
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, character: { id: "pc-mary-1" } }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({
          moment: "recap_guest",
          campaignId: "camp-mary",
          characterId: "pc-mary-1",
          flow: "signup_and_migrate",
          guestCombatantCount: 3,
        }),
      );
    });

    // Backward compat — legacy pending records that predate Mary #3 have no
    // guestCombatantCount; the callback sends `undefined` but the event still
    // fires correctly.
    it("Cluster ε (Mary #3): legacy pending without guestCombatantCount → conversion:completed fires with undefined", async () => {
      writeGuestPending({
        guestCharacter: makeCombatant({ id: "c-legacy-count" }),
        campaignId: "camp-legacy-count",
        // No guestCombatantCount — legacy shape.
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, character: { id: "pc-legacy-count" } }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      const completedCall = trackEventMock.mock.calls.find(
        ([name]) => name === "conversion:completed",
      );
      expect(completedCall).toBeDefined();
      expect(completedCall![1]).toMatchObject({
        moment: "recap_guest",
        characterId: "pc-legacy-count",
      });
      // Field present (possibly undefined) — the analytics wrapper always emits
      // the key so schemas stay stable.
      expect(completedCall![1]).toHaveProperty("guestCombatantCount");
      expect(
        (completedCall![1] as { guestCombatantCount?: number })
          .guestCombatantCount,
      ).toBeUndefined();
    });
  });

  describe("W#4 — anon OAuth completed", () => {
    it("fires conversion:completed with the persisted moment when /upgrade succeeds", async () => {
      writeUpgradeContext({
        sessionTokenId: "tok-anon-1",
        campaignId: "camp-anon-1",
        moment: "recap_anon",
      });
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({
          moment: "recap_anon",
          campaignId: "camp-anon-1",
          flow: "upgrade",
        }),
      );
      expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    });

    it("does NOT fire conversion:completed when the persisted context has no moment (legacy contract)", async () => {
      writeUpgradeContext({ sessionTokenId: "tok-legacy" });
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // No completed fired — conversion:completed is opt-in via moment.
      expect(trackEventMock).not.toHaveBeenCalledWith(
        "conversion:completed",
        expect.anything(),
      );
      expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    });

    it("supports 'waiting' moment as well as 'recap_anon'", async () => {
      writeUpgradeContext({
        sessionTokenId: "tok-wait-1",
        campaignId: "camp-wait-1",
        moment: "waiting",
      });
      mockFetch.mockResolvedValue({ ok: true, json: async () => ({ ok: true }) });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({
          moment: "waiting",
          campaignId: "camp-wait-1",
          flow: "upgrade",
        }),
      );
    });
  });

  describe("W#5 — conversion:failed has unified shape", () => {
    it("maps HTTP errors to trackConversionFailed(moment, { campaignId, error })", async () => {
      writeUpgradeContext({
        sessionTokenId: "tok-fail-1",
        campaignId: "camp-fail-1",
        moment: "recap_anon",
      });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 502,
        json: async () => ({ ok: false, message: "provider error" }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // Cluster ε (Winston #7) — arbitrary server strings collapse to
      // `"unknown"` via the allowlist normalizer to keep the analytics
      // `error` dimension bounded. `"provider error"` is not on the list.
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:failed",
        expect.objectContaining({
          moment: "recap_anon",
          campaignId: "camp-fail-1",
          error: "unknown",
        }),
      );
      // Legacy fields from Wave 2 must NOT leak into the new shape.
      const [, failedProps] = trackEventMock.mock.calls.find(
        ([name]) => name === "conversion:failed",
      )!;
      expect(failedProps).not.toHaveProperty("stage");
      expect(failedProps).not.toHaveProperty("status");
      expect(failedProps).not.toHaveProperty("reason");
    });

    it("falls back to moment=recap_anon when the persisted context predates Cluster γ tagging", async () => {
      writeUpgradeContext({ sessionTokenId: "tok-legacy-fail" });
      mockFetch.mockResolvedValue({
        ok: false,
        status: 500,
        json: async () => ({ ok: false }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // Cluster ε (Winston #7) — HTTP status buckets are allowlisted in the
      // `http_${status}` form. The legacy `HTTP 500` string is normalized to
      // `http_500`.
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:failed",
        expect.objectContaining({
          moment: "recap_anon",
          error: "http_500",
        }),
      );
    });
  });

  describe("vanilla signup — no persisted context of any kind", () => {
    it("does not fire any conversion analytics and just redirects", async () => {
      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // No conversion events at all.
      const conversionEvents = trackEventMock.mock.calls.filter(
        ([name]) => typeof name === "string" && name.startsWith("conversion:"),
      );
      expect(conversionEvents).toHaveLength(0);
      // No fetches either.
      expect(mockFetch).not.toHaveBeenCalled();
      // Redirect still lands.
      expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    });
  });

  describe("precedence when BOTH persisted (Cluster Δ Winston#3)", () => {
    it("runs /upgrade only and SKIPS /migrate-guest-character when the upgrade succeeded", async () => {
      writeUpgradeContext({
        sessionTokenId: "tok-both-1",
        campaignId: "camp-upgrade",
        moment: "recap_anon",
      });
      writeGuestPending({
        guestCharacter: makeCombatant({ id: "c-both-1" }),
        campaignId: "camp-guest",
      });

      // Only the upgrade call should fire — the guest migrate gets skipped.
      mockFetch.mockResolvedValue({
        ok: true,
        json: async () => ({ ok: true }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // Exactly one fetch — the upgrade. The guest migrate was suppressed
      // because the upgrade saga is authoritative when both are persisted.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch.mock.calls[0][0]).toBe(
        "/api/player-identity/upgrade",
      );

      // Upgrade's completion event fires, but the guest-specific event must
      // NOT — otherwise the funnel double-counts.
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({ moment: "recap_anon", flow: "upgrade" }),
      );
      const guestCompletedCalls = trackEventMock.mock.calls.filter(
        ([name, payload]) =>
          name === "conversion:completed" &&
          (payload as { moment?: string }).moment === "recap_guest",
      );
      expect(guestCompletedCalls).toHaveLength(0);

      // Pending key was cleared so a refresh can't retry the orphan migrate.
      expect(localStorage.getItem(GUEST_MIGRATE_PENDING_KEY)).toBeNull();
      expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    });
  });

  describe("Cluster Δ C4 — fingerprint ownership", () => {
    it("skips migrate when pending carries ownerFingerprint that does not match current session", async () => {
      // Pre-seed a pending record with a fingerprint that does NOT match
      // whatever the current tab's sessionStorage holds (empty by default).
      const leakedPending = {
        version: 1,
        guestCharacter: makeCombatant({ id: "c-leak-1" }),
        campaignId: "camp-leak",
        selectedAt: new Date().toISOString(),
        ownerFingerprint: "fp-from-different-user",
      };
      localStorage.setItem(
        GUEST_MIGRATE_PENDING_KEY,
        JSON.stringify(leakedPending),
      );

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // No migrate fetch — fingerprint mismatch aborted it.
      expect(mockFetch).not.toHaveBeenCalled();
      // No conversion events either — the leaked pending was quarantined.
      const conversionEvents = trackEventMock.mock.calls.filter(
        ([name]) => typeof name === "string" && name.startsWith("conversion:"),
      );
      expect(conversionEvents).toHaveLength(0);
      // Key cleared to prevent loop.
      expect(localStorage.getItem(GUEST_MIGRATE_PENDING_KEY)).toBeNull();
      // Redirect still completes — we don't strand the user.
      expect(replaceMock).toHaveBeenCalledWith("/app/dashboard");
    });

    it("allows migrate when pending carries ownerFingerprint that matches the sessionStorage fingerprint", async () => {
      // Match the sessionStorage fingerprint to the pending record's.
      const matchingFingerprint = "fp-matches-me";
      sessionStorage.setItem(
        "pocketdm_guest_session_fingerprint_v1",
        matchingFingerprint,
      );
      const matchedPending = {
        version: 1,
        guestCharacter: makeCombatant({ id: "c-ok-1" }),
        campaignId: "camp-ok",
        selectedAt: new Date().toISOString(),
        ownerFingerprint: matchingFingerprint,
      };
      localStorage.setItem(
        GUEST_MIGRATE_PENDING_KEY,
        JSON.stringify(matchedPending),
      );

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, character: { id: "pc-ok-1" } }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({ moment: "recap_guest", characterId: "pc-ok-1" }),
      );
      // Cleanup
      sessionStorage.removeItem("pocketdm_guest_session_fingerprint_v1");
    });

    it("allows migrate when pending lacks ownerFingerprint (legacy / backward compat)", async () => {
      // Legacy pre-Cluster Δ record — no fingerprint at all.
      writeGuestPending({
        guestCharacter: makeCombatant({ id: "c-legacy-1" }),
        campaignId: "camp-legacy",
      });

      mockFetch.mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, character: { id: "pc-legacy-1" } }),
      });

      await act(async () => {
        render(React.createElement(AuthCallbackContinueClient));
      });
      await flushAsync();

      // Legacy record without fingerprint is tolerated — migrate runs.
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(trackEventMock).toHaveBeenCalledWith(
        "conversion:completed",
        expect.objectContaining({ moment: "recap_guest" }),
      );
    });
  });
});
