import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ConditionCard } from "../ConditionCard";

const blinded = {
  id: "blinded",
  name: "Blinded",
  description:
    "A blinded creature can't see and automatically fails any ability check that requires sight.\n\nAttack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
};

const stunned = {
  id: "stunned",
  name: "Stunned",
  description: "A stunned creature is incapacitated.",
};

describe("ConditionCard", () => {
  describe("inline variant", () => {
    it("renders condition name", () => {
      render(<ConditionCard condition={blinded} />);
      expect(screen.getByTestId("condition-name")).toHaveTextContent("Blinded");
    });

    it("renders condition description", () => {
      render(<ConditionCard condition={blinded} />);
      expect(screen.getByTestId("condition-description")).toHaveTextContent(
        "A blinded creature can't see"
      );
    });

    it("renders multi-paragraph description split by double newline", () => {
      render(<ConditionCard condition={blinded} />);
      const desc = screen.getByTestId("condition-description");
      // Both paragraphs should appear
      expect(desc).toHaveTextContent("automatically fails");
      expect(desc).toHaveTextContent("Attack rolls against");
    });

    it("does not render toolbar in inline variant", () => {
      render(<ConditionCard condition={blinded} />);
      expect(screen.queryByTestId("condition-focus-btn")).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("condition-minimize-btn")
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId("condition-close-btn")
      ).not.toBeInTheDocument();
    });
  });

  describe("card variant", () => {
    it("renders toolbar buttons when callbacks provided", () => {
      render(
        <ConditionCard
          condition={blinded}
          variant="card"
          onFocus={jest.fn()}
          onMinimize={jest.fn()}
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("condition-focus-btn")).toBeInTheDocument();
      expect(screen.getByTestId("condition-minimize-btn")).toBeInTheDocument();
      expect(screen.getByTestId("condition-close-btn")).toBeInTheDocument();
    });

    it("calls onClose when close button clicked", async () => {
      const onClose = jest.fn();
      render(
        <ConditionCard condition={blinded} variant="card" onClose={onClose} />
      );
      await userEvent.click(screen.getByTestId("condition-close-btn"));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it("calls onFocus when focus button clicked", async () => {
      const onFocus = jest.fn();
      render(
        <ConditionCard condition={stunned} variant="card" onFocus={onFocus} />
      );
      await userEvent.click(screen.getByTestId("condition-focus-btn"));
      expect(onFocus).toHaveBeenCalledTimes(1);
    });

    it("calls onMinimize when minimize button clicked", async () => {
      const onMinimize = jest.fn();
      render(
        <ConditionCard
          condition={stunned}
          variant="card"
          onMinimize={onMinimize}
        />
      );
      await userEvent.click(screen.getByTestId("condition-minimize-btn"));
      expect(onMinimize).toHaveBeenCalledTimes(1);
    });

    it("still renders condition name and description in card variant", () => {
      render(
        <ConditionCard
          condition={stunned}
          variant="card"
          onClose={jest.fn()}
        />
      );
      expect(screen.getByTestId("condition-name")).toHaveTextContent("Stunned");
      expect(screen.getByTestId("condition-description")).toHaveTextContent(
        "A stunned creature is incapacitated."
      );
    });
  });
});
