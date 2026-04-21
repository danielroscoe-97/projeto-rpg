import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingWizard } from "./OnboardingWizard";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

jest.mock("@/lib/supabase/client", () => ({
  createClient: jest.fn(),
}));

// XP grant is fire-and-forget in tests
jest.mock("@/lib/xp/request-xp", () => ({
  requestXpGrant: jest.fn(),
}));

// Error capture is best-effort; mute in tests
jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// WelcomeScreen is rendered only for guest_combat source; default tests use "fresh"
// which skips welcome entirely (DM → choose, player → player_entry).

// QRCode renders on a canvas; jsdom doesn't need the real implementation for assertions
jest.mock("qrcode", () => ({
  toCanvas: jest.fn().mockResolvedValue(undefined),
}));

// Guest combat store is consulted via useState initializer; return nothing so
// effectiveSource stays "fresh" and the wizard follows the authenticated path
jest.mock("@/lib/stores/guest-combat-store", () => ({
  getGuestEncounterData: () => null,
  getGuestCombatSnapshot: () => null,
}));

Object.defineProperty(global, "crypto", {
  value: { randomUUID: jest.fn().mockReturnValue("test-token-uuid") },
  writable: true,
});

Object.defineProperty(navigator, "clipboard", {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

// ── Supabase mock ─────────────────────────────────────────────────────────────
//
// Current wizard uses the following tables on the happy path:
// - users:            .update({ role }).eq("id", ...)
// - campaigns:        .insert(...).select("id").single()
// - campaign_members: .insert(...)
// - user_onboarding:  .upsert(...)

interface MockOpts {
  campaignError?: boolean;
  roleError?: boolean;
}

function makeSupabaseMock(opts: MockOpts = {}) {
  const { createClient } =
    require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

  const from = jest.fn().mockImplementation((table: string) => {
    if (table === "users") {
      return {
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({
            error: opts.roleError ? { message: "role DB error" } : null,
          }),
        }),
      };
    }
    if (table === "campaigns") {
      return {
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue(
              opts.campaignError
                ? { data: null, error: { message: "DB error" } }
                : { data: { id: "campaign-uuid" }, error: null }
            ),
          }),
        }),
      };
    }
    if (table === "user_onboarding") {
      return {
        upsert: jest.fn().mockResolvedValue({ error: null }),
        update: jest.fn().mockReturnValue({
          eq: jest.fn().mockResolvedValue({ error: null }),
        }),
      };
    }
    // campaign_members and any other best-effort insert
    return {
      insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    };
  });

  (createClient as jest.Mock).mockReturnValue({ from });
  return from;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = "user-123";

function renderWizard(props?: Partial<React.ComponentProps<typeof OnboardingWizard>>) {
  return render(
    <OnboardingWizard userId={USER_ID} userRole={null} source="fresh" {...props} />
  );
}

async function selectRoleAndContinue(role: "player" | "dm" | "both") {
  // Each role button wraps a label span + a description span ("role_X" + "role_X_desc"),
  // so the accessible name concatenates both. Find the label span and walk to its button.
  const label = screen.getByText(new RegExp(`^onboarding\\.role_${role}$`, "i"));
  const roleBtn = label.closest("button");
  if (!roleBtn) throw new Error(`Role button for ${role} not found`);
  fireEvent.click(roleBtn);
  const continueBtn = screen.getByRole("button", { name: /onboarding\.role_continue/i });
  fireEvent.click(continueBtn);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OnboardingWizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    window.sessionStorage.clear();
    window.localStorage.clear();
    makeSupabaseMock();
  });

  // ── Role Step ──────────────────────────────────────────────────────────────

  describe("Role step (default entry)", () => {
    it("renders role step by default when userRole is null", () => {
      renderWizard();
      expect(screen.getByText(/onboarding\.role_title/i)).toBeInTheDocument();
      expect(screen.getByText(/^onboarding\.role_player$/i)).toBeInTheDocument();
      expect(screen.getByText(/^onboarding\.role_dm$/i)).toBeInTheDocument();
      expect(screen.getByText(/^onboarding\.role_both$/i)).toBeInTheDocument();
    });

    it("Continue is disabled until a role is selected", () => {
      renderWizard();
      expect(screen.getByRole("button", { name: /onboarding\.role_continue/i })).toBeDisabled();
    });

    it("Continue becomes enabled after selecting a role", () => {
      renderWizard();
      const dmLabel = screen.getByText(/^onboarding\.role_dm$/i);
      fireEvent.click(dmLabel.closest("button")!);
      expect(screen.getByRole("button", { name: /onboarding\.role_continue/i })).not.toBeDisabled();
    });

    it("DM role advances to choose step (source=fresh skips welcome)", async () => {
      renderWizard();
      await selectRoleAndContinue("dm");
      await waitFor(() => {
        expect(screen.getByText(/onboarding\.choose_title/i)).toBeInTheDocument();
      });
    });

    it("both role advances to choose step", async () => {
      renderWizard();
      await selectRoleAndContinue("both");
      await waitFor(() => {
        expect(screen.getByText(/onboarding\.choose_title/i)).toBeInTheDocument();
      });
    });

    it("player role advances to player_entry step", async () => {
      renderWizard();
      await selectRoleAndContinue("player");
      await waitFor(() => {
        expect(screen.getByText(/onboarding\.player_entry_title/i)).toBeInTheDocument();
      });
    });

    it("player role with pending invite redirects to dashboard", async () => {
      window.localStorage.setItem("pendingInvite", "some-invite-token");
      renderWizard();
      await selectRoleAndContinue("player");
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      });
    });
  });

  // ── Choose Step ────────────────────────────────────────────────────────────

  describe("Choose step", () => {
    async function goToChoose() {
      renderWizard();
      await selectRoleAndContinue("dm");
      await waitFor(() => screen.getByText(/onboarding\.choose_title/i));
    }

    it("clicking the campaign card advances to step 1", async () => {
      await goToChoose();
      fireEvent.click(screen.getByText(/onboarding\.choose_campaign_title/i));
      expect(await screen.findByText(/onboarding\.campaign_name_title/i)).toBeInTheDocument();
    });

    it("clicking the quick-combat card navigates to /app/combat/new", async () => {
      await goToChoose();
      fireEvent.click(screen.getByText(/onboarding\.choose_combat_title/i));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/combat/new");
      });
    });

    it("clicking 'I received an invite' redirects to dashboard", async () => {
      await goToChoose();
      fireEvent.click(screen.getByText(/onboarding\.choose_player_path/i));
      await waitFor(() => {
        expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
      });
    });
  });

  // ── Step 1: Campaign Name ──────────────────────────────────────────────────

  describe("Step 1 — campaign name", () => {
    async function goToStep1() {
      renderWizard();
      await selectRoleAndContinue("dm");
      await waitFor(() => screen.getByText(/onboarding\.choose_title/i));
      fireEvent.click(screen.getByText(/onboarding\.choose_campaign_title/i));
      await waitFor(() => screen.getByText(/onboarding\.campaign_name_title/i));
    }

    it("Next is disabled with empty name", async () => {
      await goToStep1();
      expect(screen.getByRole("button", { name: /^common\.next$/i })).toBeDisabled();
    });

    it("Next is disabled with whitespace-only name", async () => {
      await goToStep1();
      await userEvent.type(screen.getByLabelText(/onboarding\.campaign_name_label/i), "   ");
      expect(screen.getByRole("button", { name: /^common\.next$/i })).toBeDisabled();
    });

    it("Next becomes enabled with a valid name", async () => {
      await goToStep1();
      await userEvent.type(screen.getByLabelText(/onboarding\.campaign_name_label/i), "Curse of Strahd");
      expect(screen.getByRole("button", { name: /^common\.next$/i })).not.toBeDisabled();
    });

    it("advances to step 2 (invite) after valid submit", async () => {
      await goToStep1();
      await userEvent.type(screen.getByLabelText(/onboarding\.campaign_name_label/i), "Curse of Strahd");
      fireEvent.click(screen.getByRole("button", { name: /^common\.next$/i }));
      expect(await screen.findByText(/onboarding\.invite_title/i)).toBeInTheDocument();
    });

    it("shows error on campaign creation failure", async () => {
      makeSupabaseMock({ campaignError: true });
      await goToStep1();
      await userEvent.type(screen.getByLabelText(/onboarding\.campaign_name_label/i), "Doomed Campaign");
      fireEvent.click(screen.getByRole("button", { name: /^common\.next$/i }));
      expect(await screen.findByRole("alert")).toHaveTextContent(/onboarding\.error_campaign/i);
    });

    it("Back returns to choose step", async () => {
      await goToStep1();
      fireEvent.click(screen.getByRole("button", { name: /^common\.back$/i }));
      expect(await screen.findByText(/onboarding\.choose_title/i)).toBeInTheDocument();
    });
  });

  // ── Step 2: Invite Players ─────────────────────────────────────────────────

  describe("Step 2 — invite players", () => {
    async function goToStep2() {
      renderWizard();
      await selectRoleAndContinue("dm");
      await waitFor(() => screen.getByText(/onboarding\.choose_title/i));
      fireEvent.click(screen.getByText(/onboarding\.choose_campaign_title/i));
      await waitFor(() => screen.getByText(/onboarding\.campaign_name_title/i));
      await userEvent.type(screen.getByLabelText(/onboarding\.campaign_name_label/i), "Test Campaign");
      fireEvent.click(screen.getByRole("button", { name: /^common\.next$/i }));
      await waitFor(() => screen.getByText(/onboarding\.invite_title/i));
    }

    it("renders the invite link derived from joinCode", async () => {
      await goToStep2();
      // joinCode = crypto.randomUUID().slice(0,8) = "test-tok" (8 chars).
      // The link is rendered twice (mobile-only truncated + desktop-only full).
      const matches = screen.getAllByText((_, node) =>
        !!node?.textContent?.match(/\/join-campaign\/test-tok/i)
      );
      expect(matches.length).toBeGreaterThan(0);
    });

    it("clicking 'Done' advances to done step", async () => {
      await goToStep2();
      fireEvent.click(screen.getByRole("button", { name: /onboarding\.invite_done_cta/i }));
      expect(await screen.findByText(/onboarding\.campaign_created_title/i)).toBeInTheDocument();
    });

    it("clicking 'Skip' also advances to done step", async () => {
      await goToStep2();
      fireEvent.click(screen.getByRole("button", { name: /onboarding\.invite_skip/i }));
      expect(await screen.findByText(/onboarding\.campaign_created_title/i)).toBeInTheDocument();
    });
  });
});
