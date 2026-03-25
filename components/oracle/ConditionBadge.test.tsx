/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionBadge } from "./ConditionBadge";
import * as srdSearch from "@/lib/srd/srd-search";
import type { SrdCondition } from "@/lib/srd/srd-loader";

jest.mock("@/lib/srd/srd-search", () => ({
  findCondition: jest.fn(),
}));

jest.mock("@/components/oracle/ConditionRulesModal", () => ({
  ConditionRulesModal: ({
    condition,
    open,
  }: {
    condition: SrdCondition | null;
    open: boolean;
  }) =>
    open && condition ? (
      <div data-testid="condition-modal-mock">{condition.name} rules</div>
    ) : null,
}));

const STUNNED_DATA: SrdCondition = {
  id: "stunned",
  name: "Stunned",
  description: "A stunned creature is incapacitated...",
};

const mockFindCondition = srdSearch.findCondition as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockFindCondition.mockReturnValue(STUNNED_DATA);
});

describe("ConditionBadge", () => {
  it("renders the condition name", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(screen.getByText("Stunned")).toBeInTheDocument();
  });

  it("has correct aria-label", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(
      screen.getByLabelText("View Stunned rules")
    ).toBeInTheDocument();
  });

  it("opens condition rules modal on click", async () => {
    const user = userEvent.setup();
    render(<ConditionBadge condition="Stunned" />);

    await user.click(screen.getByText("Stunned"));

    expect(screen.getByTestId("condition-modal-mock")).toBeInTheDocument();
    expect(screen.getByText("Stunned rules")).toBeInTheDocument();
  });

  it("does NOT open modal when findCondition returns undefined", async () => {
    mockFindCondition.mockReturnValue(undefined);
    const user = userEvent.setup();
    render(<ConditionBadge condition="Unknown" />);

    await user.click(screen.getByText("Unknown"));

    expect(screen.queryByTestId("condition-modal-mock")).not.toBeInTheDocument();
  });

  it("uses correct test ID", () => {
    render(<ConditionBadge condition="Stunned" />);
    expect(screen.getByTestId("condition-badge-stunned")).toBeInTheDocument();
  });
});
