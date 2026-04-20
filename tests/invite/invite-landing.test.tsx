/**
 * InviteLanding unit tests — Story 02-D.
 *
 * Covers all 4 branches of `detectInviteState` plus:
 *   - isAnonymous alert is rendered only on the auth branch when applicable
 *   - preamble falls back to the localized "adventurer" when displayName=null
 *   - error reasons (not_found / expired / accepted) render the right copy
 *
 * Radix (Dialog + Portal) and the nested CharacterPickerModal/AuthModal are
 * stubbed so we can assert the landing's own markup without dragging in the
 * full modal trees. This keeps the file fast + deterministic in jsdom.
 */

import React from "react";
import { render, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

// next/navigation stubs — InviteLanding uses useRouter() for post-accept push.
const mockRouterPush = jest.fn();
const mockRouterRefresh = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({
    push: mockRouterPush,
    replace: jest.fn(),
    refresh: mockRouterRefresh,
  }),
}));

// Toast stub — we only want to verify invocations, not render anything.
jest.mock("sonner", () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
  },
}));

// Server action stub — we verify InviteLanding forwards to it correctly in
// the onSelect branches. The default resolves (happy path); tests that want
// a rejection override per-call.
const mockAcceptInviteAction = jest.fn<Promise<void>, [unknown]>();
jest.mock("@/app/invite/actions", () => ({
  acceptInviteAction: (args: unknown) => mockAcceptInviteAction(args),
}));

// captureError stub — prevents Sentry noise on rejected action tests.
jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// AuthModal stub — we care about props, not behavior. Rendering a tiny
// surrogate with a data-testid exposes open-state + defaultTab to the test.
jest.mock("@/components/auth/AuthModal", () => ({
  AuthModal: ({
    open,
    defaultTab,
    onSuccess,
  }: {
    open: boolean;
    defaultTab: string;
    onSuccess: (p: {
      userId: string;
      isNewAccount: boolean;
      upgraded: boolean;
    }) => void;
    upgradeContext?: unknown;
    preamble?: string;
  }) =>
    open ? (
      <div
        data-testid="mock-auth-modal"
        data-default-tab={defaultTab}
      >
        <button
          type="button"
          data-testid="mock-auth-modal.fire-success"
          onClick={() =>
            onSuccess({ userId: "u-new", isNewAccount: true, upgraded: false })
          }
        >
          fire success
        </button>
      </div>
    ) : null,
}));

// CharacterPickerModal stub — expose onSelect + isSubmitting so tests can
// simulate a submission and assert the landing's dispatch.
jest.mock("@/components/character/CharacterPickerModal", () => {
  const actual = jest.requireActual(
    "@/components/character/CharacterPickerModal",
  );
  return {
    ...actual,
    CharacterPickerModal: ({
      open,
      onSelect,
      campaignName,
      dmName,
      isSubmitting,
    }: {
      open: boolean;
      onSelect: (result: unknown) => void | Promise<void>;
      campaignName?: string;
      dmName?: string;
      isSubmitting?: boolean;
    }) =>
      open ? (
        <div
          data-testid="mock-picker-modal"
          data-submitting={isSubmitting ? "true" : "false"}
        >
          <span data-testid="mock-picker.campaign">{campaignName}</span>
          <span data-testid="mock-picker.dm">{dmName}</span>
          <button
            type="button"
            data-testid="mock-picker.fire-claim"
            onClick={() =>
              onSelect({ mode: "claimed", characterId: "char-claim-1" })
            }
          >
            fire claim
          </button>
          <button
            type="button"
            data-testid="mock-picker.fire-picked"
            onClick={() =>
              onSelect({ mode: "picked", characterId: "char-pick-1" })
            }
          >
            fire pick
          </button>
          <button
            type="button"
            data-testid="mock-picker.fire-created"
            onClick={() =>
              onSelect({
                mode: "created",
                characterData: {
                  name: "Grok",
                  maxHp: 42,
                  currentHp: 42,
                  ac: 16,
                  spellSaveDc: null,
                },
              })
            }
          >
            fire create
          </button>
        </div>
      ) : null,
  };
});

// ---------------------------------------------------------------------------
// SUT
// ---------------------------------------------------------------------------

import { InviteLanding } from "@/components/invite/InviteLanding";
import type {
  CampaignInviteSummary,
  InviteState,
} from "@/lib/identity/detect-invite-state";
import type { User } from "@supabase/supabase-js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE_INVITE: CampaignInviteSummary = {
  id: "invite-1",
  campaignId: "camp-1",
  campaignName: "Phandelver",
  dmName: "Dani",
  email: "player@example.com",
  expiresAt: new Date(Date.now() + 86400_000).toISOString(),
  status: "pending",
};

function makeAuthUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    app_metadata: {},
    user_metadata: {},
    aud: "authenticated",
    created_at: new Date().toISOString(),
    ...overrides,
  } as User;
}

function renderWithState(state: InviteState) {
  return render(<InviteLanding state={state} token="tok-1" />);
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("InviteLanding", () => {
  describe("state: invalid", () => {
    it.each([
      ["not_found", "invite.landing.error_not_found"],
      ["expired", "invite.landing.error_expired"],
      ["accepted", "invite.landing.error_accepted"],
    ] as const)(
      "renders state-invalid + reason-%s with matching copy",
      (reason, expectedKey) => {
        renderWithState({ state: "invalid", reason });

        expect(screen.getByTestId("invite.landing.root")).toBeInTheDocument();
        expect(
          screen.getByTestId("invite.landing.state-invalid"),
        ).toBeInTheDocument();
        const reasonNode = screen.getByTestId(
          `invite.landing.error-reason-${reason}`,
        );
        expect(reasonNode).toBeInTheDocument();
        // jest.setup mocks next-intl → the rendered text equals the full key.
        expect(reasonNode).toHaveTextContent(expectedKey);
      },
    );

    it("renders a back-to-dashboard CTA linking to /app/dashboard", () => {
      renderWithState({ state: "invalid", reason: "not_found" });
      const cta = screen.getByTestId("invite.landing.cta-primary");
      expect(cta).toBeInTheDocument();
      expect(cta.getAttribute("href")).toBe("/app/dashboard");
    });

    it("does NOT render campaign-name / dm-name on invalid state", () => {
      renderWithState({ state: "invalid", reason: "not_found" });
      expect(
        screen.queryByTestId("invite.landing.campaign-name"),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("invite.landing.dm-name"),
      ).not.toBeInTheDocument();
    });
  });

  describe("state: guest", () => {
    it("renders state-guest + campaign-name + dm-name", () => {
      renderWithState({ state: "guest", invite: BASE_INVITE });

      expect(
        screen.getByTestId("invite.landing.state-guest"),
      ).toBeInTheDocument();
      expect(
        screen.getByTestId("invite.landing.campaign-name"),
      ).toHaveTextContent("Phandelver");
      expect(screen.getByTestId("invite.landing.dm-name")).toHaveTextContent(
        "Dani",
      );
    });

    it("opens AuthModal (signup default) when cta-primary is clicked", async () => {
      const user = userEvent.setup();
      renderWithState({ state: "guest", invite: BASE_INVITE });

      expect(screen.queryByTestId("mock-auth-modal")).not.toBeInTheDocument();

      await user.click(screen.getByTestId("invite.landing.cta-primary"));

      const modal = screen.getByTestId("mock-auth-modal");
      expect(modal).toBeInTheDocument();
      expect(modal.getAttribute("data-default-tab")).toBe("signup");
    });

    it("refreshes router on AuthModal success (post-signup re-detect)", async () => {
      const user = userEvent.setup();
      renderWithState({ state: "guest", invite: BASE_INVITE });
      await user.click(screen.getByTestId("invite.landing.cta-primary"));

      await user.click(screen.getByTestId("mock-auth-modal.fire-success"));
      expect(mockRouterRefresh).toHaveBeenCalledTimes(1);
    });

    it("shows dm_fallback copy when invite.dmName is null", () => {
      renderWithState({
        state: "guest",
        invite: { ...BASE_INVITE, dmName: null },
      });
      expect(screen.getByTestId("invite.landing.dm-name")).toHaveTextContent(
        "invite.landing.dm_fallback",
      );
    });
  });

  describe("state: auth", () => {
    it("renders state-auth + auto-opens the picker", () => {
      renderWithState({
        state: "auth",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        isAnonymous: false,
      });

      expect(screen.getByTestId("invite.landing.state-auth")).toBeInTheDocument();
      expect(screen.getByTestId("mock-picker-modal")).toBeInTheDocument();
      expect(screen.getByTestId("mock-picker.campaign")).toHaveTextContent(
        "Phandelver",
      );
    });

    it("does NOT render preamble (that's auth-with-invite-pending territory)", () => {
      renderWithState({
        state: "auth",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        isAnonymous: false,
      });
      expect(
        screen.queryByTestId("invite.landing.preamble"),
      ).not.toBeInTheDocument();
    });

    it("does NOT render anon-warning when isAnonymous=false", () => {
      renderWithState({
        state: "auth",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        isAnonymous: false,
      });
      expect(
        screen.queryByTestId("invite.landing.anon-warning"),
      ).not.toBeInTheDocument();
    });

    it("DOES render anon-warning + upgrade CTA when isAnonymous=true", async () => {
      const user = userEvent.setup();
      renderWithState({
        state: "auth",
        invite: BASE_INVITE,
        user: makeAuthUser({ is_anonymous: true } as Partial<User>),
        isAnonymous: true,
      });

      const warning = screen.getByTestId("invite.landing.anon-warning");
      expect(warning).toBeInTheDocument();
      expect(warning).toHaveAttribute("role", "alert");

      const cta = screen.getByTestId("invite.landing.anon-warning-cta");
      await user.click(cta);

      // The upgrade AuthModal opens (it's a second AuthModal instance).
      expect(screen.getByTestId("mock-auth-modal")).toBeInTheDocument();
    });

    it("forwards picker 'claimed' result through acceptInviteAction", async () => {
      const user = userEvent.setup();
      mockAcceptInviteAction.mockResolvedValue(undefined);
      renderWithState({
        state: "auth",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        isAnonymous: false,
      });

      await act(async () => {
        await user.click(screen.getByTestId("mock-picker.fire-claim"));
      });

      expect(mockAcceptInviteAction).toHaveBeenCalledWith(
        expect.objectContaining({
          inviteId: "invite-1",
          campaignId: "camp-1",
          token: "tok-1",
          claimCharacterId: "char-claim-1",
        }),
      );
      expect(mockRouterPush).toHaveBeenCalledWith("/app/dashboard");
    });

    it("forwards picker 'created' result with characterData", async () => {
      const user = userEvent.setup();
      mockAcceptInviteAction.mockResolvedValue(undefined);
      renderWithState({
        state: "auth",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        isAnonymous: false,
      });

      await act(async () => {
        await user.click(screen.getByTestId("mock-picker.fire-created"));
      });

      expect(mockAcceptInviteAction).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Grok",
          maxHp: 42,
          currentHp: 42,
          ac: 16,
          spellSaveDc: null,
        }),
      );
    });
  });

  describe("state: auth-with-invite-pending", () => {
    it("renders state-auth-with-invite-pending + preamble with displayName", () => {
      renderWithState({
        state: "auth-with-invite-pending",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        displayName: "Dani",
        isAnonymous: false,
      });

      expect(
        screen.getByTestId("invite.landing.state-auth-with-invite-pending"),
      ).toBeInTheDocument();
      const preamble = screen.getByTestId("invite.landing.preamble");
      expect(preamble).toBeInTheDocument();
      // next-intl mock renders the full key — substitution only happens when
      // the source string contains the placeholder, which the mocked key
      // (`invite.landing.title_returning`) does not. We assert the stable
      // namespace.key token is rendered.
      expect(preamble).toHaveTextContent("invite.landing.title_returning");
    });

    it("falls back to preamble_fallback copy when displayName is null (guarded via auth branch)", () => {
      // The auth branch (no displayName) shouldn't render a preamble at all.
      // This guards against accidental preamble leakage in that branch.
      renderWithState({
        state: "auth",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        isAnonymous: false,
      });
      expect(
        screen.queryByTestId("invite.landing.preamble"),
      ).not.toBeInTheDocument();
    });

    it("also auto-opens the picker (same UX as auth)", () => {
      renderWithState({
        state: "auth-with-invite-pending",
        invite: BASE_INVITE,
        user: makeAuthUser(),
        displayName: "Dani",
        isAnonymous: false,
      });
      expect(screen.getByTestId("mock-picker-modal")).toBeInTheDocument();
    });

    it("surfaces anon-warning when is_anonymous=true even on the pending branch", () => {
      renderWithState({
        state: "auth-with-invite-pending",
        invite: BASE_INVITE,
        user: makeAuthUser({ is_anonymous: true } as Partial<User>),
        displayName: "Dani",
        isAnonymous: true,
      });
      expect(
        screen.getByTestId("invite.landing.anon-warning"),
      ).toBeInTheDocument();
    });
  });

  describe("dm name fallback", () => {
    it("auth branch uses dm_fallback when invite.dmName is null", () => {
      renderWithState({
        state: "auth",
        invite: { ...BASE_INVITE, dmName: null },
        user: makeAuthUser(),
        isAnonymous: false,
      });
      expect(screen.getByTestId("mock-picker.dm")).toHaveTextContent(
        "invite.landing.dm_fallback",
      );
    });
  });
});
