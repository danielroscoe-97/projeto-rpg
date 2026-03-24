import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { OnboardingWizard } from "./OnboardingWizard";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const mockPush = jest.fn();
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

// Build a chainable Supabase mock
function buildSupabaseMock(overrides?: {
  insertError?: { message: string } | null;
  campaignId?: string;
  sessionId?: string;
}) {
  const campaignId = overrides?.campaignId ?? "campaign-uuid";
  const sessionId = overrides?.sessionId ?? "session-uuid";
  const insertError = overrides?.insertError ?? null;

  const single = jest.fn();

  const mockChain = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single,
  };

  // sequence: campaigns.insert → single, sessions.insert → single, others return void
  let callCount = 0;
  single.mockImplementation(() => {
    callCount++;
    if (callCount === 1) {
      // campaigns insert
      return Promise.resolve({
        data: insertError ? null : { id: campaignId },
        error: insertError,
      });
    }
    if (callCount === 2) {
      // sessions insert
      return Promise.resolve({
        data: insertError ? null : { id: sessionId },
        error: insertError,
      });
    }
    return Promise.resolve({ data: null, error: null });
  });

  // player_characters and encounters and session_tokens: no .single()
  const fromMock = jest.fn().mockReturnValue({
    ...mockChain,
    insert: jest.fn().mockReturnValue({
      ...mockChain,
      // allow calling .select().single() or just return success
      select: jest.fn().mockReturnValue({
        single,
      }),
    }),
  });

  return { from: fromMock, mockChain, single };
}

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

// ── Helpers ───────────────────────────────────────────────────────────────────

const USER_ID = "user-123";

function renderWizard() {
  return render(<OnboardingWizard userId={USER_ID} />);
}

async function fillStep1(campaignName = "Curse of Strahd") {
  const input = screen.getByLabelText(/campaign name/i);
  await userEvent.clear(input);
  await userEvent.type(input, campaignName);
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
}

async function fillStep2(playerName = "Thorin") {
  const nameInput = screen.getByLabelText(/character name/i);
  await userEvent.clear(nameInput);
  await userEvent.type(nameInput, playerName);
  fireEvent.click(screen.getByRole("button", { name: /next/i }));
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe("OnboardingWizard", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Step 1 ─────────────────────────────────────────────────────────────────

  it("renders Step 1 by default", () => {
    renderWizard();
    expect(screen.getByText(/name your campaign/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/campaign name/i)).toBeInTheDocument();
  });

  it("Next button is disabled when campaign name is empty", () => {
    renderWizard();
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  it("Next button becomes enabled when campaign name is filled", async () => {
    renderWizard();
    const input = screen.getByLabelText(/campaign name/i);
    await userEvent.type(input, "My Campaign");
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).not.toBeDisabled();
  });

  it("Next button remains disabled when campaign name is whitespace-only", async () => {
    renderWizard();
    const input = screen.getByLabelText(/campaign name/i);
    await userEvent.type(input, "   ");
    const nextBtn = screen.getByRole("button", { name: /next/i });
    expect(nextBtn).toBeDisabled();
  });

  // ── Step 2 ─────────────────────────────────────────────────────────────────

  it("advances to Step 2 after valid campaign name", async () => {
    renderWizard();
    await fillStep1();
    // Step 2 is identified by the presence of the player character name input
    expect(screen.getByLabelText(/character name/i)).toBeInTheDocument();
  });

  it("Back button on Step 2 returns to Step 1", async () => {
    renderWizard();
    await fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /back/i }));
    expect(screen.getByText(/name your campaign/i)).toBeInTheDocument();
  });

  it("Next on Step 2 is not disabled when there is at least 1 player", async () => {
    renderWizard();
    await fillStep1();
    // default player exists with name empty — Next should be enabled only after name is filled
    const nextBtn = screen.getByRole("button", { name: /next/i });
    // default player has empty name, so validation will fail on click, not disabled
    expect(nextBtn).not.toBeDisabled();
  });

  it("shows error when advancing from Step 2 with empty player name", async () => {
    renderWizard();
    await fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      /all players need a name/i
    );
  });

  it("advances to Step 3 after valid player entry", async () => {
    renderWizard();
    await fillStep1();
    await fillStep2();
    expect(screen.getByText(/ready to launch/i)).toBeInTheDocument();
  });

  it("can add a second player", async () => {
    renderWizard();
    await fillStep1();
    fireEvent.click(screen.getByRole("button", { name: /add another player/i }));
    expect(screen.getAllByLabelText(/character name/i)).toHaveLength(2);
  });

  // ── Step 3 ─────────────────────────────────────────────────────────────────

  it("shows campaign and player summary on Step 3", async () => {
    renderWizard();
    await fillStep1("Dragon Campaign");
    await fillStep2("Aria");
    expect(screen.getByText("Dragon Campaign")).toBeInTheDocument();
    expect(screen.getByText(/aria/i)).toBeInTheDocument();
  });

  it("calls supabase.from('campaigns').insert on final submit", async () => {
    const { createClient } =
      require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

    const supabaseMock = {
      from: jest.fn().mockReturnValue({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest
              .fn()
              .mockResolvedValueOnce({
                data: { id: "campaign-uuid" },
                error: null,
              })
              .mockResolvedValueOnce({
                data: { id: "session-uuid" },
                error: null,
              }),
          }),
          // for inserts without .single()
          then: jest.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    };

    // player_characters and encounters and session_tokens don't use single
    supabaseMock.from.mockImplementation((table: string) => {
      if (table === "campaigns" || table === "sessions") {
        return {
          insert: jest.fn().mockReturnValue({
            select: jest.fn().mockReturnValue({
              single: jest
                .fn()
                .mockResolvedValue({
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
    });

    (createClient as jest.Mock).mockReturnValue(supabaseMock);

    renderWizard();
    await fillStep1("Test Campaign");
    await fillStep2("Hero");

    fireEvent.click(screen.getByRole("button", { name: /create & get session link/i }));

    await waitFor(() => {
      expect(supabaseMock.from).toHaveBeenCalledWith("campaigns");
    });

    await waitFor(() => {
      expect(supabaseMock.from).toHaveBeenCalledWith("player_characters");
    });

    await waitFor(() => {
      expect(supabaseMock.from).toHaveBeenCalledWith("sessions");
    });

    await waitFor(() => {
      expect(supabaseMock.from).toHaveBeenCalledWith("session_tokens");
    });
  });

  it("shows the session link after successful submission", async () => {
    const { createClient } =
      require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockImplementation((table: string) => {
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
      }),
    });

    renderWizard();
    await fillStep1("My Campaign");
    await fillStep2("Warrior");
    fireEvent.click(
      screen.getByRole("button", { name: /create & get session link/i })
    );

    await waitFor(() => {
      expect(screen.getByText(/you're all set/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/\/join\/test-token-uuid/i)).toBeInTheDocument();
  });

  it("shows error message on campaign creation failure", async () => {
    const { createClient } =
      require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockImplementation(() => ({
        insert: jest.fn().mockReturnValue({
          select: jest.fn().mockReturnValue({
            single: jest.fn().mockResolvedValue({
              data: null,
              error: { message: "DB error" },
            }),
          }),
        }),
      })),
    });

    renderWizard();
    await fillStep1("Failing Campaign");
    await fillStep2("Player");
    fireEvent.click(
      screen.getByRole("button", { name: /create & get session link/i })
    );

    await waitFor(() => {
      expect(screen.getByRole("alert")).toHaveTextContent(
        /failed to create campaign/i
      );
    });
  });

  it("navigates to dashboard when 'Go to Dashboard' is clicked", async () => {
    const { createClient } =
      require("@/lib/supabase/client") as typeof import("@/lib/supabase/client");

    (createClient as jest.Mock).mockReturnValue({
      from: jest.fn().mockImplementation((table: string) => {
        if (table === "campaigns" || table === "sessions") {
          return {
            insert: jest.fn().mockReturnValue({
              select: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({
                  data: {
                    id: table === "campaigns" ? "c-id" : "s-id",
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
      }),
    });

    renderWizard();
    await fillStep1("Campaign");
    await fillStep2("Player");
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
