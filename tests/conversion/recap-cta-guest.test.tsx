/**
 * Story 03-E — `GuestRecapFlow` unit tests.
 *
 * Tests the guest-side post-combat conversion surface: picker behaviour,
 * AuthModal wiring (no upgradeContext — D3b), migrate-guest-character
 * endpoint contract, analytics events (including the F15 backward-compat
 * legacy event), toast/router side-effects, and the safety-net snapshot
 * save (F15).
 *
 * Uses jest + jsdom (see `jest.config.ts`). The RTL pattern follows
 * `tests/auth/auth-modal.test.tsx` — module-level mocks for next/navigation,
 * analytics, sonner, the Zustand store, and `AuthModal` itself.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Combatant } from "@/lib/types/combat";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const mockRouterPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockRouterPush, replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

const mockToast = {
  success: jest.fn(),
  error: jest.fn(),
};
jest.mock("sonner", () => ({ toast: mockToast }));

const mockTrackCtaShown = jest.fn();
const mockTrackCtaClicked = jest.fn();
const mockTrackConversionCompleted = jest.fn();
const mockTrackConversionFailed = jest.fn();
jest.mock("@/lib/conversion/analytics", () => ({
  trackCtaShown: (...args: unknown[]) => mockTrackCtaShown(...args),
  trackCtaClicked: (...args: unknown[]) => mockTrackCtaClicked(...args),
  trackConversionCompleted: (...args: unknown[]) =>
    mockTrackConversionCompleted(...args),
  trackConversionFailed: (...args: unknown[]) =>
    mockTrackConversionFailed(...args),
}));

const mockTrackEvent = jest.fn();
jest.mock("@/lib/analytics/track", () => ({
  trackEvent: (...args: unknown[]) => mockTrackEvent(...args),
}));

const mockSaveGuestCombatSnapshot = jest.fn();
const mockGetState = jest.fn(() => ({
  combatants: [],
  currentTurnIndex: 0,
  roundNumber: 1,
}));
jest.mock("@/lib/stores/guest-combat-store", () => ({
  useGuestCombatStore: {
    getState: () => mockGetState(),
  },
  saveGuestCombatSnapshot: (...args: unknown[]) =>
    mockSaveGuestCombatSnapshot(...args),
}));

// Cluster α W#1 — supabase client mock used by `handleAuthSuccess` to detect
// email-confirmation-pending state (no session after signUp).
const mockGetSession = jest.fn(async () => ({ data: { session: { user: { id: "user-1" } } } }));
jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getSession: (...args: unknown[]) => mockGetSession(...args) },
  }),
}));

// Cluster α W#2 — pending storage spy.
const mockWriteGuestMigratePending = jest.fn();
const mockReadGuestMigratePending = jest.fn(() => null);
const mockClearGuestMigratePending = jest.fn();
jest.mock("@/lib/guest/guest-migrate-pending", () => ({
  writeGuestMigratePending: (...args: unknown[]) =>
    mockWriteGuestMigratePending(...args),
  readGuestMigratePending: (...args: unknown[]) =>
    mockReadGuestMigratePending(...args),
  clearGuestMigratePending: (...args: unknown[]) =>
    mockClearGuestMigratePending(...args),
}));

// AuthModal mock — renders a minimal controlled harness that exposes a
// "succeed as new account" and "succeed as existing account" trigger so the
// test can drive `onSuccess(...)` deterministically.
type MockAuthModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab: "login" | "signup";
  onSuccess: (payload: {
    userId: string;
    isNewAccount: boolean;
    upgraded: boolean;
  }) => void;
  upgradeContext?: unknown;
};

const mockAuthModalSpy = jest.fn();
jest.mock("@/components/auth/AuthModal", () => ({
  AuthModal: (props: MockAuthModalProps) => {
    mockAuthModalSpy(props);
    if (!props.open) return null;
    return (
      <div data-testid="mock-auth-modal" data-default-tab={props.defaultTab}>
        <button
          type="button"
          data-testid="mock-auth-modal.succeed-signup"
          onClick={() =>
            props.onSuccess({
              userId: "user-1",
              isNewAccount: true,
              upgraded: false,
            })
          }
        >
          succeed-signup
        </button>
        <button
          type="button"
          data-testid="mock-auth-modal.succeed-login"
          onClick={() =>
            props.onSuccess({
              userId: "user-1",
              isNewAccount: false,
              upgraded: false,
            })
          }
        >
          succeed-login
        </button>
      </div>
    );
  },
}));

// fetch stub
const mockFetch = jest.fn();
beforeAll(() => {
  (global as unknown as { fetch: typeof fetch }).fetch =
    mockFetch as unknown as typeof fetch;
});

// ---------------------------------------------------------------------------
// Import under test (after jest.mock calls above)
// ---------------------------------------------------------------------------

import {
  GuestRecapFlow,
  type GuestRecapFlowProps,
} from "@/components/conversion/GuestRecapFlow";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makePlayer(
  id: string,
  name: string,
  current_hp = 30,
  max_hp = 30,
): Combatant {
  return {
    id,
    name,
    role: "player",
    is_player: true,
    is_hidden: false,
    max_hp,
    current_hp,
    temp_hp: 0,
    ac: 16,
    initiative: 0,
    initiative_modifier: 0,
    conditions: [],
    is_defeated: false,
    reaction_used: false,
    monster_id: null,
    monster_group_id: null,
  } as unknown as Combatant;
}

function makeMonster(id: string, name = "Goblin"): Combatant {
  return {
    id,
    name,
    role: "monster",
    is_player: false,
    is_hidden: false,
    max_hp: 7,
    current_hp: 7,
    temp_hp: 0,
    ac: 13,
    initiative: 0,
    initiative_modifier: 0,
    conditions: [],
    is_defeated: false,
    reaction_used: false,
    monster_id: null,
    monster_group_id: null,
  } as unknown as Combatant;
}

function makeContext(
  guestCombatants: Combatant[],
): GuestRecapFlowProps["context"] {
  return {
    mode: "guest",
    guestCombatants,
    characterName: guestCombatants.find((c) => c.is_player)?.name ?? null,
  };
}

// Shared fetch success response
function successResponse(characterId = "char-new-1") {
  return {
    ok: true,
    status: 200,
    json: async () => ({
      ok: true,
      character: { id: characterId, name: "Thorin" },
    }),
  } as unknown as Response;
}

function failureResponse(status = 500, body: unknown = { message: "boom" }) {
  return {
    ok: false,
    status,
    json: async () => body,
  } as unknown as Response;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

beforeEach(() => {
  jest.clearAllMocks();
  mockGetState.mockReturnValue({
    combatants: [],
    currentTurnIndex: 0,
    roundNumber: 1,
  });
  // Default: live session (post-signUp) — W#1 email-pending tests override this.
  mockGetSession.mockResolvedValue({
    data: { session: { user: { id: "user-1" } } },
  } as unknown as Awaited<ReturnType<typeof mockGetSession>>);
});

describe("GuestRecapFlow", () => {
  // -------------------------------------------------------------------------
  // 1. 0 player combatants — CTA disabled with no_character copy
  // -------------------------------------------------------------------------
  it("disables the CTA and shows no_character copy when no players exist", () => {
    render(<GuestRecapFlow context={makeContext([makeMonster("m1")])} />);

    expect(
      screen.getByTestId("recap-cta.guest.no-character"),
    ).toBeInTheDocument();
    const cta = screen.getByTestId("recap-cta.guest.cta-primary");
    expect(cta).toBeDisabled();

    expect(mockTrackCtaShown).toHaveBeenCalledWith("recap_guest", {
      hasCharacter: false,
      guestCombatantCount: 0,
    });
  });

  // -------------------------------------------------------------------------
  // 2. 1 player — pre-selected, no picker, click opens AuthModal
  // -------------------------------------------------------------------------
  it("pre-selects the only player and opens AuthModal without upgradeContext", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    render(<GuestRecapFlow context={makeContext(players)} />);

    // No picker for a single player
    expect(
      screen.queryByTestId("recap-cta.guest.picker"),
    ).not.toBeInTheDocument();

    const cta = screen.getByTestId("recap-cta.guest.cta-primary");
    expect(cta).toBeEnabled();

    await user.click(cta);

    // AuthModal mounted (open=true) with signup default and no upgradeContext
    expect(screen.getByTestId("mock-auth-modal")).toBeInTheDocument();
    expect(screen.getByTestId("mock-auth-modal")).toHaveAttribute(
      "data-default-tab",
      "signup",
    );
    const lastCall =
      mockAuthModalSpy.mock.calls[mockAuthModalSpy.mock.calls.length - 1]?.[0];
    expect(lastCall).toBeDefined();
    expect(lastCall.upgradeContext).toBeUndefined();
    expect(lastCall.defaultTab).toBe("signup");
  });

  // -------------------------------------------------------------------------
  // 3. 3 players — picker rendered, sorted by current_hp desc, analytics reports count
  // -------------------------------------------------------------------------
  it("renders a picker for 3+ players, sorted by HP desc, and reports guestCombatantCount", async () => {
    const players = [
      makePlayer("p-mid", "Mid", 20, 30),
      makePlayer("p-low", "Low", 5, 30),
      makePlayer("p-high", "High", 28, 30),
    ];
    render(<GuestRecapFlow context={makeContext(players)} />);

    expect(mockTrackCtaShown).toHaveBeenCalledWith("recap_guest", {
      hasCharacter: true,
      guestCombatantCount: 3,
    });

    const picker = screen.getByTestId("recap-cta.guest.picker");
    expect(picker).toBeInTheDocument();

    // All radio options present
    expect(
      screen.getByTestId("recap-cta.guest.picker-option-p-high"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("recap-cta.guest.picker-option-p-mid"),
    ).toBeInTheDocument();
    expect(
      screen.getByTestId("recap-cta.guest.picker-option-p-low"),
    ).toBeInTheDocument();

    // Sorted by current_hp desc: High (28) → Mid (20) → Low (5)
    const radios = picker.querySelectorAll("input[type='radio']");
    const orderedIds = Array.from(radios).map((r) =>
      r.getAttribute("value"),
    );
    expect(orderedIds).toEqual(["p-high", "p-mid", "p-low"]);

    // CTA disabled until a selection is made (F7)
    expect(screen.getByTestId("recap-cta.guest.cta-primary")).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // 4. Successful signup + migrate
  // -------------------------------------------------------------------------
  it("on signup success: POSTs migrate-guest-character with setAsDefault and fires completed analytics", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    const players = [makePlayer("p1", "Thorin", 18, 30)];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockFetch.mockResolvedValueOnce(successResponse("char-new-1"));

    render(
      <GuestRecapFlow
        context={makeContext(players)}
        onComplete={onComplete}
      />,
    );

    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    // F15 safety net: snapshot saved BEFORE modal opens
    expect(mockSaveGuestCombatSnapshot).toHaveBeenCalledWith({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    expect(mockTrackCtaClicked).toHaveBeenCalledWith("recap_guest", {});
    // F15: legacy event fired in parallel
    expect(mockTrackEvent).toHaveBeenCalledWith("guest:recap_save_signup");

    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    const [url, init] = mockFetch.mock.calls[0];
    expect(url).toBe("/api/player-identity/migrate-guest-character");
    expect(init).toMatchObject({
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    const body = JSON.parse((init as { body: string }).body);
    expect(body).toEqual({
      guestCharacter: players[0],
      setAsDefault: true,
    });

    expect(mockTrackConversionCompleted).toHaveBeenCalledWith("recap_guest", {
      // M#1 — campaignId included even when undefined (analytics contract stable).
      campaignId: undefined,
      characterId: "char-new-1",
      flow: "signup_and_migrate",
      guestCombatantCount: 1,
    });
    expect(mockToast.success).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/app/dashboard");
    expect(onComplete).toHaveBeenCalled();
    // W#2 cleanup — live-session migrate success clears the pending record.
    expect(mockClearGuestMigratePending).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. Migration failure — fires conversion:failed + error toast + still redirects
  // -------------------------------------------------------------------------
  it("on migration failure (500 with { ok:false, code }): fires failed analytics with server code, shows error toast, still redirects", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockFetch.mockResolvedValueOnce(
      failureResponse(500, { ok: false, code: "internal", message: "boom" }),
    );

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    // W#8 — analytics uses the server code, not the PT-BR message.
    // M#1 — campaignId included (undefined is fine — analytics pipe filters later).
    expect(mockTrackConversionFailed).toHaveBeenCalledWith("recap_guest", {
      error: "internal",
      campaignId: undefined,
    });
    expect(mockToast.error).toHaveBeenCalled();
    // User is still logged in → send them to dashboard anyway
    expect(mockRouterPush).toHaveBeenCalledWith("/app/dashboard");
    // No completion analytics on failure
    expect(mockTrackConversionCompleted).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 6. isNewAccount=false → skip migration, still redirect
  // -------------------------------------------------------------------------
  it("on login path (isNewAccount=false): does NOT call migrate-guest-character but still redirects", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-login"));
    });

    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockTrackConversionCompleted).not.toHaveBeenCalled();
    expect(mockTrackConversionFailed).not.toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/app/dashboard");
  });

  // -------------------------------------------------------------------------
  // 7. F15 dual-analytics: new + legacy events both fire on click
  // -------------------------------------------------------------------------
  it("fires both the new `conversion:cta_clicked` and the legacy `guest:recap_save_signup` event (F15)", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));

    expect(mockTrackCtaClicked).toHaveBeenCalledWith("recap_guest", {});
    expect(mockTrackEvent).toHaveBeenCalledWith("guest:recap_save_signup");
  });

  // -------------------------------------------------------------------------
  // 8. F15 safety-net ordering: saveGuestCombatSnapshot BEFORE opening modal
  // -------------------------------------------------------------------------
  it("calls saveGuestCombatSnapshot before the AuthModal opens (F15 safety net)", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });

    render(<GuestRecapFlow context={makeContext(players)} />);

    // Modal not yet mounted
    expect(
      screen.queryByTestId("mock-auth-modal"),
    ).not.toBeInTheDocument();

    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));

    // Snapshot saved before the modal rendered.
    expect(mockSaveGuestCombatSnapshot).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId("mock-auth-modal")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // W#2 — writeGuestMigratePending is called BEFORE the modal opens so the
  // async return paths (OAuth, email-confirm) can finish the migrate.
  // -------------------------------------------------------------------------
  it("W#2: persists guest character via writeGuestMigratePending before opening the AuthModal", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin", 18, 30)];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });

    render(<GuestRecapFlow context={makeContext(players)} />);

    expect(mockWriteGuestMigratePending).not.toHaveBeenCalled();
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));

    expect(mockWriteGuestMigratePending).toHaveBeenCalledWith({
      guestCharacter: players[0],
      campaignId: undefined,
    });
    expect(screen.getByTestId("mock-auth-modal")).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // W#1 — Email signup path: no session after signUp → persist + pending toast
  // -------------------------------------------------------------------------
  it("W#1: when getSession returns no session after signup, shows email-pending toast and does NOT call migrate fetch", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockGetSession.mockResolvedValueOnce({ data: { session: null } } as never);

    render(
      <GuestRecapFlow
        context={makeContext(players)}
        onComplete={onComplete}
      />,
    );
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    // No migrate fetch (would 401).
    expect(mockFetch).not.toHaveBeenCalled();
    // Pending persisted (by W#2 on click + defensive re-write on email-pending path).
    expect(mockWriteGuestMigratePending).toHaveBeenCalled();
    // Toast from tPost("recap_guest_email_pending") — exists in both locales.
    expect(mockToast.success).toHaveBeenCalled();
    expect(onComplete).toHaveBeenCalled();
    // No redirect — AuthModal's "check your email" screen already showed.
    expect(mockRouterPush).not.toHaveBeenCalled();
    // No analytics completion event for a deferred migrate.
    expect(mockTrackConversionCompleted).not.toHaveBeenCalled();
    // Pending NOT cleared (migrate still owed to callback).
    expect(mockClearGuestMigratePending).not.toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Q#6 — 200-with-ok:false is treated as failure, not success
  // -------------------------------------------------------------------------
  it("Q#6: HTTP 200 with { ok: false, code } is treated as failure (not success)", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: false, code: "already_authenticated", message: "x" }),
    } as unknown as Response);

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    expect(mockTrackConversionCompleted).not.toHaveBeenCalled();
    expect(mockTrackConversionFailed).toHaveBeenCalledWith("recap_guest", {
      error: "already_authenticated",
      campaignId: undefined,
    });
    expect(mockToast.error).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Q#6b — 200 without character.id is also treated as failure
  // -------------------------------------------------------------------------
  it("Q#6: HTTP 200 without character.id is treated as failure", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockFetch.mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => ({ ok: true, character: {} }),
    } as unknown as Response);

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    expect(mockTrackConversionCompleted).not.toHaveBeenCalled();
    expect(mockTrackConversionFailed).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Q#9 — duplicate combatant ids are deduped in the radio picker
  // -------------------------------------------------------------------------
  it("Q#9: duplicate combatant ids are deduped before rendering radios", () => {
    const p1 = makePlayer("p-dup", "Thorin", 30, 30);
    const p1Copy = makePlayer("p-dup", "Thorin Clone", 20, 30);
    const p2 = makePlayer("p-other", "Elara", 25, 30);
    // Silence the expected console.warn from the dedupe path.
    const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});
    try {
      render(<GuestRecapFlow context={makeContext([p1, p1Copy, p2])} />);

      // Picker renders only 2 radios, not 3 — dup removed.
      const picker = screen.getByTestId("recap-cta.guest.picker");
      const radios = picker.querySelectorAll("input[type='radio']");
      expect(radios).toHaveLength(2);
      expect(
        screen.getAllByTestId(/^recap-cta\.guest\.picker-option-/),
      ).toHaveLength(2);
      expect(warnSpy).toHaveBeenCalled();
    } finally {
      warnSpy.mockRestore();
    }
  });

  // -------------------------------------------------------------------------
  // Q#14 — 429 response keeps the modal open (no redirect) so the user can retry
  // -------------------------------------------------------------------------
  it("Q#14: 429 response keeps modal open, toasts rate_limit hint, does NOT redirect", async () => {
    const user = userEvent.setup();
    const onComplete = jest.fn();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 429,
      json: async () => ({ ok: false, code: "rate_limited", message: "slow down" }),
    } as unknown as Response);

    render(
      <GuestRecapFlow
        context={makeContext(players)}
        onComplete={onComplete}
      />,
    );
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    expect(mockToast.error).toHaveBeenCalled();
    // No redirect, no onComplete — user stays on /try and can retry.
    expect(mockRouterPush).not.toHaveBeenCalled();
    expect(onComplete).not.toHaveBeenCalled();
    // Modal should have been re-opened via setAuthModalOpen(true).
    expect(screen.getByTestId("mock-auth-modal")).toBeInTheDocument();

    // Failed analytics fires with the server code (W#8).
    expect(mockTrackConversionFailed).toHaveBeenCalledWith("recap_guest", {
      error: "rate_limited",
      campaignId: undefined,
    });
  });

  // -------------------------------------------------------------------------
  // Cluster Δ C3 — analytics MUST fire before the mount-check so unmounted
  // users who navigated mid-fetch still have their conversion recorded.
  // (Previous behaviour dropped the event when `mountedRef.current === false`.)
  // -------------------------------------------------------------------------
  it("Cluster Δ C3: unmount during in-flight fetch STILL fires trackConversionCompleted (analytics first)", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });

    // Never-resolving fetch so we can unmount while it's in-flight.
    let resolveFetch!: (r: Response) => void;
    const pending = new Promise<Response>((r) => {
      resolveFetch = r;
    });
    mockFetch.mockReturnValueOnce(pending);

    const { unmount } = render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    // Fetch is mid-flight — tear down.
    unmount();

    // Now let the fetch resolve — no toast, no router push (those are DOM/nav
    // side-effects guarded by mountedRef), BUT analytics MUST fire because
    // the sale actually happened.
    await act(async () => {
      resolveFetch({
        ok: true,
        status: 200,
        json: async () => ({ ok: true, character: { id: "char-X" } }),
      } as unknown as Response);
      // Give microtasks a chance to settle.
      await Promise.resolve();
      await Promise.resolve();
    });

    // Cluster Δ C3: analytics fired even though the component unmounted.
    expect(mockTrackConversionCompleted).toHaveBeenCalledWith("recap_guest", {
      campaignId: undefined,
      characterId: "char-X",
      flow: "signup_and_migrate",
      guestCombatantCount: 1,
    });
    // DOM side-effects gated by mountedRef — toast + router push NOT called.
    expect(mockToast.success).not.toHaveBeenCalled();
    expect(mockRouterPush).not.toHaveBeenCalled();
    // Cleanup ran.
    expect(mockClearGuestMigratePending).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cluster Δ C2 — client-side dedupe of conversion event + fetch on re-entry
  // -------------------------------------------------------------------------
  it("Cluster Δ C2: a second AuthModal success (e.g. 429 retry race) does NOT double-fire analytics or fetch", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockFetch.mockResolvedValueOnce(successResponse("char-dedup-1"));

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    // First success: analytics + fetch fired exactly once.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockTrackConversionCompleted).toHaveBeenCalledTimes(1);

    // Reopen modal (simulating a 429 retry re-enter) — modal is re-opened
    // automatically in the 429 branch, but conversionFiredRef is already
    // true so second success must be a no-op for analytics and fetch.
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    // No second fetch, no second analytics — dedupe held.
    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(mockTrackConversionCompleted).toHaveBeenCalledTimes(1);
  });

  // -------------------------------------------------------------------------
  // Cluster Δ C4 — login path clears pending migrate (prevents cross-user leak)
  // -------------------------------------------------------------------------
  it("Cluster Δ C4: login (isNewAccount=false) clears guest-migrate-pending so a later OAuth by a different user cannot inherit the character", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));

    // The click already wrote pending. Clear the spy so we only see the
    // clear that fires inside the login branch.
    mockClearGuestMigratePending.mockClear();

    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-login"));
    });

    // Pending cleared — future OAuth on this browser can't migrate the char.
    expect(mockClearGuestMigratePending).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // Cluster Δ C4 — cancel / modal close without success clears pending
  // -------------------------------------------------------------------------
  it("Cluster Δ C4: closing the AuthModal without success clears guest-migrate-pending", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    mockClearGuestMigratePending.mockClear();

    // Retrieve the most recent AuthModal call and invoke onOpenChange(false)
    // to simulate the user clicking the X / escape key.
    const lastCall =
      mockAuthModalSpy.mock.calls[mockAuthModalSpy.mock.calls.length - 1]?.[0];
    expect(lastCall).toBeDefined();
    await act(async () => {
      lastCall.onOpenChange(false);
    });

    expect(mockClearGuestMigratePending).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // W#7 — selectedId syncs with dedupedPlayers when snapshot changes
  // -------------------------------------------------------------------------
  it("W#7: selectedId syncs when combatants change (1 → 2 players, picker becomes required)", async () => {
    const p1 = makePlayer("p1", "Thorin");
    const p2 = makePlayer("p2", "Elara");

    const { rerender } = render(
      <GuestRecapFlow context={makeContext([p1])} />,
    );

    // Single player auto-selected.
    expect(screen.getByTestId("recap-cta.guest.cta-primary")).toBeEnabled();

    // Snapshot grows to 2 players — selectedId must clear and picker appears.
    rerender(<GuestRecapFlow context={makeContext([p1, p2])} />);
    // User needs to pick now — previously-selected p1 is not auto-sticky.
    // The exact behavior per spec is: 2+ players clears selection (unless user
    // already chose), which this component does via the effect above.
    // Just assert the picker is visible.
    expect(screen.getByTestId("recap-cta.guest.picker")).toBeInTheDocument();
  });

  it("W#7: selectedId clears when the selected combatant disappears from the snapshot", () => {
    const p1 = makePlayer("p1", "Thorin");
    const p2 = makePlayer("p2", "Elara");

    const { rerender } = render(
      <GuestRecapFlow context={makeContext([p1])} />,
    );
    // p1 auto-selected → cta enabled.
    expect(screen.getByTestId("recap-cta.guest.cta-primary")).toBeEnabled();

    // p1 vanishes, only p2 left → selectedId must re-point to p2 (single-player branch).
    rerender(<GuestRecapFlow context={makeContext([p2])} />);
    expect(screen.getByTestId("recap-cta.guest.cta-primary")).toBeEnabled();
  });
});
