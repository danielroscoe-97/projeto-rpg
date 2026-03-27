/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PlayerJoinClient } from "./PlayerJoinClient";

// Mock supabase client
const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();
const mockChannel = jest.fn();
const mockRemoveChannel = jest.fn();

jest.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: {
      getSession: mockGetSession,
      signInAnonymously: mockSignInAnonymously,
    },
    channel: mockChannel,
    removeChannel: mockRemoveChannel,
  }),
}));

// Mock player registration server actions
const mockClaimPlayerToken = jest.fn();
const mockRegisterPlayerCombatant = jest.fn();
jest.mock("@/lib/supabase/player-registration", () => ({
  claimPlayerToken: (...args: unknown[]) => mockClaimPlayerToken(...args),
  registerPlayerCombatant: (...args: unknown[]) => mockRegisterPlayerCombatant(...args),
}));

// Mock child components to isolate PlayerJoinClient behavior
jest.mock("@/components/player/PlayerInitiativeBoard", () => ({
  PlayerInitiativeBoard: () => <div data-testid="mock-initiative-board" />,
}));

jest.mock("@/components/player/PlayerLobby", () => ({
  PlayerLobby: (props: {
    sessionName: string;
    isRegistered: boolean;
    registeredName?: string;
    onRegister: (data: { name: string; initiative: number; hp: number | null; ac: number | null }) => Promise<void>;
  }) => (
    <div data-testid="mock-player-lobby">
      <span>{props.sessionName}</span>
      <span data-testid="lobby-registered">{String(props.isRegistered)}</span>
      {props.registeredName && <span data-testid="lobby-registered-name">{props.registeredName}</span>}
      <button
        data-testid="lobby-register-btn"
        onClick={() => props.onRegister({ name: "TestHero", initiative: 15, hp: 30, ac: 16 })}
      >
        Register
      </button>
    </div>
  ),
}));

jest.mock("@/components/player/SyncIndicator", () => ({
  SyncIndicator: () => <div data-testid="mock-sync-indicator" />,
}));

jest.mock("@/components/oracle/SpellSearch", () => ({
  SpellSearch: () => <div data-testid="mock-spell-search" />,
}));

jest.mock("@/lib/errors/capture", () => ({
  captureError: jest.fn(),
}));

// Mock channel object
function createMockChannel() {
  const channel = {
    on: jest.fn().mockReturnThis(),
    subscribe: jest.fn().mockReturnThis(),
    send: jest.fn(),
    unsubscribe: jest.fn(),
  };
  return channel;
}

const DEFAULT_PROPS = {
  tokenId: "token-123",
  sessionId: "session-456",
  sessionName: "Dragon's Lair",
  rulesetVersion: "2014" as const,
  encounterId: null,
  isActive: false,
  roundNumber: 1,
  currentTurnIndex: 0,
  initialCombatants: [],
};

describe("PlayerJoinClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { user: { id: "anon-user-1" } },
      error: null,
    });
    mockClaimPlayerToken.mockResolvedValue("token-123");
    mockRegisterPlayerCombatant.mockResolvedValue(undefined);
    mockChannel.mockReturnValue(createMockChannel());
  });

  it("shows loading state before auth is ready", () => {
    // Auth never resolves so loading stays
    mockGetSession.mockReturnValue(new Promise(() => {}));

    render(<PlayerJoinClient {...DEFAULT_PROPS} />);

    expect(screen.getByTestId("player-loading")).toBeInTheDocument();
    expect(screen.getByText("player.connecting")).toBeInTheDocument();
  });

  it("shows lobby after successful anonymous auth", async () => {
    render(<PlayerJoinClient {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-player-lobby")).toBeInTheDocument();
    });

    expect(mockSignInAnonymously).toHaveBeenCalled();
    expect(mockClaimPlayerToken).toHaveBeenCalledWith("token-123", "anon-user-1");
  });

  it("shows lobby with session name", async () => {
    render(<PlayerJoinClient {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("Dragon's Lair")).toBeInTheDocument();
    });
  });

  it("uses existing session if already authenticated", async () => {
    mockGetSession.mockResolvedValue({
      data: { session: { user: { id: "existing-user-99" } } },
    });

    render(<PlayerJoinClient {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-player-lobby")).toBeInTheDocument();
    });

    expect(mockSignInAnonymously).not.toHaveBeenCalled();
    expect(mockClaimPlayerToken).toHaveBeenCalledWith("token-123", "existing-user-99");
  });

  it("shows error state when auth fails", async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } });
    mockSignInAnonymously.mockResolvedValue({
      data: { user: null },
      error: { message: "Auth service down" },
    });

    render(<PlayerJoinClient {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("player.connection_error")).toBeInTheDocument();
    });
  });

  it("shows error when anon auth returns no user", async () => {
    mockSignInAnonymously.mockResolvedValue({
      data: { user: null },
      error: null,
    });

    render(<PlayerJoinClient {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(screen.getByText("player.connection_error")).toBeInTheDocument();
    });
  });

  it("shows lobby (not combat board) when combat is not active", async () => {
    render(<PlayerJoinClient {...DEFAULT_PROPS} isActive={false} encounterId={null} />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-player-lobby")).toBeInTheDocument();
    });

    expect(screen.queryByTestId("player-view")).not.toBeInTheDocument();
  });

  it("shows combat view when active with encounter and registered", async () => {
    // Need to simulate registration — render with active combat
    // Since PlayerLobby is mocked, we test via the isRegistered flow
    // by providing active encounter and triggering registration
    const mockCh = createMockChannel();
    mockChannel.mockReturnValue(mockCh);

    render(
      <PlayerJoinClient
        {...DEFAULT_PROPS}
        isActive={true}
        encounterId="enc-1"
        initialCombatants={[
          {
            id: "c1",
            name: "Hero",
            current_hp: 20,
            max_hp: 20,
            initiative_order: 0,
            conditions: [],
            is_defeated: false,
            is_player: true,
            monster_id: null,
            ruleset_version: null,
          },
        ]}
      />
    );

    // Initially shows lobby because not registered
    await waitFor(() => {
      expect(screen.getByTestId("mock-player-lobby")).toBeInTheDocument();
    });

    // Trigger registration via the mocked lobby button
    fireEvent.click(screen.getByTestId("lobby-register-btn"));

    await waitFor(() => {
      expect(screen.getByTestId("player-view")).toBeInTheDocument();
    });

    expect(mockRegisterPlayerCombatant).toHaveBeenCalled();
  });

  it("subscribes to realtime channel after auth", async () => {
    const mockCh = createMockChannel();
    mockChannel.mockReturnValue(mockCh);

    render(<PlayerJoinClient {...DEFAULT_PROPS} />);

    await waitFor(() => {
      expect(mockChannel).toHaveBeenCalledWith(
        "session:session-456",
        expect.any(Object)
      );
    });

    expect(mockCh.on).toHaveBeenCalled();
    expect(mockCh.subscribe).toHaveBeenCalled();
  });

  it("passes prefilledCharacters to lobby", async () => {
    const prefilled = [
      { id: "char-1", name: "Gandalf", max_hp: 50, current_hp: 50, ac: 12, spell_save_dc: 17 },
    ];

    render(<PlayerJoinClient {...DEFAULT_PROPS} prefilledCharacters={prefilled} />);

    await waitFor(() => {
      expect(screen.getByTestId("mock-player-lobby")).toBeInTheDocument();
    });
  });
});
