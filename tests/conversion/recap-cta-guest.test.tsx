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
      characterId: "char-new-1",
      flow: "signup_and_migrate",
      guestCombatantCount: 1,
    });
    expect(mockToast.success).toHaveBeenCalled();
    expect(mockRouterPush).toHaveBeenCalledWith("/app/dashboard");
    expect(onComplete).toHaveBeenCalled();
  });

  // -------------------------------------------------------------------------
  // 5. Migration failure — fires conversion:failed + error toast + still redirects
  // -------------------------------------------------------------------------
  it("on migration failure (500): fires failed analytics, shows error toast, still redirects", async () => {
    const user = userEvent.setup();
    const players = [makePlayer("p1", "Thorin")];
    mockGetState.mockReturnValue({
      combatants: players,
      currentTurnIndex: 0,
      roundNumber: 1,
    });
    mockFetch.mockResolvedValueOnce(
      failureResponse(500, { message: "db_error" }),
    );

    render(<GuestRecapFlow context={makeContext(players)} />);
    await user.click(screen.getByTestId("recap-cta.guest.cta-primary"));
    await act(async () => {
      await user.click(screen.getByTestId("mock-auth-modal.succeed-signup"));
    });

    expect(mockTrackConversionFailed).toHaveBeenCalledWith("recap_guest", {
      error: "db_error",
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
});
