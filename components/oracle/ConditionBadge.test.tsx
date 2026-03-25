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
  it("renders the condition name", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(screen.getByText("Stunned")).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(screen.getByLabelText("View Stunned rules")).toBeInTheDocument();
  });

  it("calls pinCard with condition id on click (defaults to 2014)", async () => {
    const user = userEvent.setup();
    render(<ConditionBadge condition="Stunned" />);

    await user.click(screen.getByText("Stunned"));

    expect(mockPinCard).toHaveBeenCalledWith("condition", "stunned", "2014");
  });

  it("calls pinCard with provided rulesetVersion", async () => {
    const user = userEvent.setup();
    render(<ConditionBadge condition="Stunned" rulesetVersion="2024" />);

    await user.click(screen.getByText("Stunned"));

    expect(mockPinCard).toHaveBeenCalledWith("condition", "stunned", "2024");
  });

  it("lowercases condition name as entityId", async () => {
    const user = userEvent.setup();
    render(<ConditionBadge condition="Blinded" />);

    await user.click(screen.getByText("Blinded"));

    expect(mockPinCard).toHaveBeenCalledWith("condition", "blinded", "2014");
  });

  it("uses correct test ID", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(screen.getByTestId("condition-badge-stunned")).toBeInTheDocument();
  });
});
