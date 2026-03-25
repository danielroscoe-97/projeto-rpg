/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { ConditionRulesModal } from "./ConditionRulesModal";
import type { SrdCondition } from "@/lib/srd/srd-loader";

const STUNNED: SrdCondition = {
  id: "stunned",
  name: "Stunned",
  description:
    "A stunned creature is incapacitated, can't move, and can speak only falteringly.",
};

describe("ConditionRulesModal", () => {
  it("renders nothing when condition is null", () => {
    const { container } = render(
      <ConditionRulesModal condition={null} open={false} onOpenChange={() => {}} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("renders condition name as dialog title", () => {
    render(
      <ConditionRulesModal condition={STUNNED} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByText("Stunned")).toBeInTheDocument();
  });

  it("renders condition description text", () => {
    render(
      <ConditionRulesModal condition={STUNNED} open={true} onOpenChange={() => {}} />
    );
    expect(
      screen.getByTestId("condition-description-text")
    ).toHaveTextContent(
      "A stunned creature is incapacitated"
    );
  });

  it("has accessible dialog", () => {
    render(
      <ConditionRulesModal condition={STUNNED} open={true} onOpenChange={() => {}} />
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
