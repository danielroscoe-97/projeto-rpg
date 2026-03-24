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

// Mock crypto.randomUUID
Object.defineProperty(global, "crypto", {
  value: { randomUUID: jest.fn().mockReturnValue("test-token-uuid") },
  writable: true,
});

// Mock navigator.clipboard
Object.defineProperty(navigator, "clipboard", {
  value: { writeText: jest.fn().mockResolvedValue(undefined) },
  writable: true,
});

// ── Supabase mock factory ─────────────────────────────────────────────────────

function makeSupabaseMock(opts?: { campaignError?: boolean }) {
  const { createClient } =
    require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

  (createClient as jest.Mock).mockReturnValue({
    from: jest.fn().mockImplementation((table: string) => {
      if (opts?.campaignError) {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({ data: null, error: { message: "DB error" } }),
            }),
          }),
        };
      }
      if (table === "campaigns" || table === "sessions") {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: table === "campaigns" ? "campaign-uuid" : "session-uuid",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      // player_characters, encounters, session_tokens
      return {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    }),
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = "user-123";

function renderWizard() {
  return render(<OnboardingWizard userId={USER_ID} />);
}

async function fillStep1(campaignName = "Curse of Strahd") {
  const input = screen.getByLabelText(/campaign name/i);
  await userEvent.clear(input);
  await userEvent.type(input, campaignName);
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

async function fillStep2(playerName = "Thorin") {
  const nameInput = screen.getByLabelText(/character name/i);
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, playerName);
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

// Advances from Step 3 (encounter) to Step 4. Accepts the pre-filled default if no arg given.
async function fillStep3(encounterName?: string) {
  if (encounterName !== undefined) {
    const input = screen.getByLabelText(/encounter name/i);
    await userEvent.clear(input);
    await userEvent.type(input, encounterName);
  }
  fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OnboardingWizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Step 1: Campaign ───────────────────────────────────────────────────────

  it("renders Step 1 by default", () => {
    renderWizard();
    expect(screen.getByText(/name your campaign/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument();
  });

  it("Next button is disabled when campaign name is empty", () => {
    renderWizard();
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("Next button becomes enabled when campaign name is filled", async () => {
    renderWizard();
    await userEvent.type(screen.getByLabelText(/campaign name/i), "My Campaign");
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled();
  });

  it("Next button remains disabled when campaign name is whitespace-only", async () => {
    renderWizard();
    await userEvent.type(screen.getByLabelText(/campaign name/i), "   ");
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  // ── Step 2: Players ────────────────────────────────────────────────────────

  it("advances to Step 2 after valid campaign name", async () => {
    renderWizard();
    await fillStep1();
    expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
  });

  it("Back button on Step 2 returns to Step 1", async () => {
    renderWizard();
    await fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/name your campaign/i)).toBeInTheDocument();
  });

  it("Next on Step 2 is not disabled when at least 1 player exists", async () => {
    renderWizard();
    await fillStep1();
    expect(screen.getByRole("button", { name: /^next$/i })).not.toBeDisabled();
  });

  it("shows error when advancing from Step 2 with empty player name", async () => {
    renderWizard();
    await fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /^next$/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /all players need a name/i
    );
  });

  it("can add a second player", async () => {
    renderWizard();
    await fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /add another player/i }));
    expect(screen.getAllByLabelText(/character name/i)).toHaveLength(2);
  });

  // ── Step 3: Encounter ──────────────────────────────────────────────────────

  it("advances to Step 3 (encounter) after valid player entry", async () => {
    renderWizard();
    await fillStep1();
    await fillStep2();
    expect(screen.getByLabelText(/encounter name/i)).toBeInTheDocument();
    expect(screen.getByText(/set up your first encounter/i)).toBeInTheDocument();
  });

  it("encounter name is pre-filled with default", async () => {
    renderWizard();
    await fillStep1();
    await fillStep2();
    expect(screen.getByLabelText(/encounter name/i)).toHaveValue(
      "First Encounter"
    );
  });

  it("Next on Step 3 is disabled when encounter name is cleared", async () => {
    renderWizard();
    await fillStep1();
    await fillStep2();
    await userEvent.clear(screen.getByLabelText(/encounter name/i));
    expect(screen.getByRole("button", { name: /^next$/i })).toBeDisabled();
  });

  it("Back button on Step 3 returns to Step 2", async () => {
    renderWizard();
    await fillStep1();
    await fillStep2();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
  });

  it("advances to Step 4 after setting encounter name", async () => {
    renderWizard();
    await fillStep1();
    await fillStep2();
    await fillStep3("Goblin Ambush");
    expect(screen.getByText(/ready to launch/i)).toBeInTheDocument();
  });

  // ── Step 4: Confirm ────────────────────────────────────────────────────────

  it("shows campaign, player, and encounter summary on Step 4", async () => {
    renderWizard();
    await fillStep1("Dragon Campaign");
    await fillStep2("Aria");
    await fillStep3("Forest Ambush");
    expect(screen.getByText("Dragon Campaign")).toBeInTheDocument();
    expect(screen.getByText(/aria/i)).toBeInTheDocument();
    expect(screen.getByText("Forest Ambush")).toBeInTheDocument();
  });

  it("Back button on Step 4 returns to Step 3", async () => {
    renderWizard();
    await fillStep1();
    await fillStep2();
    await fillStep3();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByLabelText(/encounter name/i)).toBeInTheDocument();
  });

  it("calls supabase inserts for all 5 tables on final submit", async () => {
    const { createClient } =
      require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

    const fromMock = jest.fn().mockImplementation((table: string) => {
      if (table === "campaigns" || table === "sessions") {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: {
                  id: table === "campaigns" ? "campaign-uuid" : "session-uuid",
                },
                error: null,
              }),
            }),
          }),
        };
      }
      return {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };
    });

    (createClient as jest.Mock).mockReturnValue({ from: fromMock });

    renderWizard();
    await fillStep1("Test Campaign");
    await fillStep2("Hero");
    await fillStep3("Dragon Fight");

    fireEvent.click(
      screen.getByRole("button", { name: /create & get session link/i })
    );

    await waitFor(() =>
      expect(fromMock).toHaveBeenCalledWith("campaigns")
    );
    await waitFor(() =>
      expect(fromMock).toHaveBeenCalledWith("player_characters")
    );
    await waitFor(() =>
      expect(fromMock).toHaveBeenCalledWith("sessions")
    );
    await waitFor(() =>
      expect(fromMock).toHaveBeenCalledWith("encounters")
    );
    await waitFor(() =>
      expect(fromMock).toHaveBeenCalledWith("session_tokens")
    );
  });

  it("shows the session link after successful submission", async () => {
    makeSupabaseMock();

    renderWizard();
    await fillStep1("My Campaign");
    await fillStep2("Warrior");
    await fillStep3();
    fireEvent.click(
      screen.getByRole("button", { name: /create & get session link/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/\/join\/test-token-uuid/i)).toBeInTheDocument();
  });

  it("shows error message on campaign creation failure", async () => {
    makeSupabaseMock({ campaignError: true });

    renderWizard();
    await fillStep1("Failing Campaign");
    await fillStep2("Player");
    await fillStep3();
    fireEvent.click(
      screen.getByRole("button", { name: /create & get session link/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to create campaign/i
      );
    });
  });

  it("does not double-submit when button is clicked while submitting", async () => {
    const { createClient } =
      require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

    let resolveFirst: (v: unknown) => void;
    const firstCall = new Promise((res) => { resolveFirst = res; });

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockReturnValue(firstCall),
          }),
        }),
      }),
    });

    renderWizard();
    await fillStep1();
    await fillStep2();
    await fillStep3();

    const submitBtn = screen.getByRole("button", {
      name: /create & get session link/i,
    });
    fireEvent.click(submitBtn);

    // Button should be disabled during submit
    await waitFor(() => expect(submitBtn).toBeDisabled());

    // Second click should have no effect
    fireEvent.click(submitBtn);

    // Only one campaign insert should be in flight
    resolveFirst!({ data: null, error: { message: "cancelled" } });

    await waitFor(() =>
      expect(screen.getByRole("alert")).toBeInTheDocument()
    );
  });

  it("navigates to dashboard when 'Go to Dashboard' is clicked", async () => {
    makeSupabaseMock();

    renderWizard();
    await fillStep1("Campaign");
    await fillStep2("Player");
    await fillStep3();
    fireEvent.click(
      screen.getByRole("button", { name: /create & get session link/i })
    );

    await waitFor(() =>
      screen.getByRole("button", { name: /go to dashboard/i })
    );

    fireEvent.click(screen.getByRole("button", { name: /go to dashboard/i }));
    expect(mockPush).toHaveBeenCalledWith("/app/dashboard");
  });
});
