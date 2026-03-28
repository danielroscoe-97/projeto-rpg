/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionBadge } from "./ConditionBadge";

// Mock the pinned cards store
const mockPinCard = jest.fn();
jest.mock("@/lib/stores/pinned-cards-store", () => ({
  usePinnedCardsStore: (selector: (s: { pinCard: typeof mockPinCard }) => unknown) =>
    selector({ pinCard: mockPinCard }),
}));

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ConditionBadge", () => {
  // The i18n mock returns "conditions.<key>" for tc(key), so the rendered
  // display name for condition="Stunned" is "conditions.stunned".
  it("renders the condition name", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(screen.getByText("conditions.stunned")).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    render(<ConditionBadge condition="Stunned" />);
    // t("condition_view_aria", { name }) → "combat.condition_view_aria"
    // (the mock replaces {name} in the key string, but the key has no placeholder)
    expect(screen.getByLabelText("combat.condition_view_aria")).toBeInTheDocument();
  });

  it("calls pinCard with condition id on click (defaults to 2014)", async () => {
    const user = userEvent.setup();
    render(<ConditionBadge condition="Stunned" />);

    await user.click(screen.getByText("conditions.stunned"));

    expect(mockPinCard).toHaveBeenCalledWith("condition", "stunned", "2014");
  });

  it("calls pinCard with provided rulesetVersion", async () => {
    const user = userEvent.setup();
    render(<ConditionBadge condition="Stunned" rulesetVersion="2024" />);

    await user.click(screen.getByText("conditions.stunned"));

    expect(mockPinCard).toHaveBeenCalledWith("condition", "stunned", "2024");
  });

  it("lowercases condition name as entityId", async () => {
    const user = userEvent.setup();
    render(<ConditionBadge condition="Blinded" />);

    await user.click(screen.getByText("conditions.blinded"));

    expect(mockPinCard).toHaveBeenCalledWith("condition", "blinded", "2014");
  });

  it("uses correct test ID", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(screen.getByTestId("condition-badge-stunned")).toBeInTheDocument();
  });
});
