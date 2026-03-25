/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionLookup } from "./ConditionLookup";
import * as srdSearch from "@/lib/srd/srd-search";
import type { SrdCondition } from "@/lib/srd/srd-loader";

jest.mock("@/lib/srd/srd-search", () => ({
  getAllConditions: jest.fn(),
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

const CONDITIONS: SrdCondition[] = [
  { id: "blinded", name: "Blinded", description: "A blinded creature can't see..." },
  { id: "stunned", name: "Stunned", description: "A stunned creature is incapacitated..." },
  { id: "poisoned", name: "Poisoned", description: "A poisoned creature has disadvantage..." },
];

const mockGetAll = srdSearch.getAllConditions as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
  mockGetAll.mockReturnValue(CONDITIONS);
});

describe("ConditionLookup", () => {
  it("renders all conditions", () => {
    render(<ConditionLookup />);
    expect(screen.getByTestId("condition-list")).toBeInTheDocument();
    expect(screen.getByText("Blinded")).toBeInTheDocument();
    expect(screen.getByText("Stunned")).toBeInTheDocument();
    expect(screen.getByText("Poisoned")).toBeInTheDocument();
  });

  it("shows empty state when no conditions loaded", () => {
    mockGetAll.mockReturnValue([]);
    render(<ConditionLookup />);
    expect(screen.getByTestId("condition-lookup-empty")).toBeInTheDocument();
  });

  it("clicking a condition opens the modal", async () => {
    const user = userEvent.setup();
    render(<ConditionLookup />);

    await user.click(screen.getByTestId("condition-row-stunned"));

    expect(screen.getByTestId("condition-modal-mock")).toBeInTheDocument();
    expect(screen.getByText("Stunned rules")).toBeInTheDocument();
  });

  it("shows 'All Versions' label for conditions", () => {
    render(<ConditionLookup />);
    expect(screen.getByTestId("conditions-version-label")).toHaveTextContent(
      "All Versions"
    );
  });

  it("has accessible labels on condition buttons", () => {
    render(<ConditionLookup />);
    expect(
      screen.getByRole("button", { name: "View Blinded rules" })
    ).toBeInTheDocument();
  });
});
