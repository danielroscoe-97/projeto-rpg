import { render, screen } from "@testing-library/react";
import { PlayersOnlinePanel, type OnlinePlayer } from "./PlayersOnlinePanel";

describe("PlayersOnlinePanel", () => {
  const players: OnlinePlayer[] = [
    { id: "1", name: "Aragorn", isOnline: true, characterName: "Strider", joinedAt: "2026-03-27T00:00:00Z" },
    { id: "2", name: "Guest Bob", isOnline: false, joinedAt: "2026-03-27T00:00:00Z" },
    { id: "3", name: "Legolas", isOnline: true, characterName: "Legolas", joinedAt: "2026-03-27T00:00:00Z" },
  ];

  it("should render nothing when no players", () => {
    const { container } = render(<PlayersOnlinePanel players={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should show online count", () => {
    render(<PlayersOnlinePanel players={players} />);
    expect(screen.getByText("combat.players_online_count")).toBeInTheDocument();
  });

  it("should show player names", () => {
    render(<PlayersOnlinePanel players={players} />);
    expect(screen.getByText("Strider")).toBeInTheDocument();
    expect(screen.getByText("Legolas")).toBeInTheDocument();
  });

  it("should show guest label for players without character name", () => {
    render(<PlayersOnlinePanel players={players} />);
    expect(screen.getByText("Guest Bob")).toBeInTheDocument();
    expect(screen.getByText("(combat.player_guest_label)")).toBeInTheDocument();
  });

  it("should render online indicators", () => {
    render(<PlayersOnlinePanel players={players} />);
    const indicators = screen.getAllByLabelText(/combat\.player_status/);
    expect(indicators.length).toBe(3);
  });

  it("should have data-testid for each player", () => {
    render(<PlayersOnlinePanel players={players} />);
    expect(screen.getByTestId("player-online-1")).toBeInTheDocument();
    expect(screen.getByTestId("player-online-2")).toBeInTheDocument();
    expect(screen.getByTestId("player-online-3")).toBeInTheDocument();
  });
});
