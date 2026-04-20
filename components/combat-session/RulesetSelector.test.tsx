/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RulesetSelector, VersionBadge } from "./RulesetSelector";

describe("RulesetSelector", () => {
  it("renders both version buttons", () => {
    render(<RulesetSelector value="2014" onChange={jest.fn()} />);
    expect(screen.getByTestId("ruleset-btn-2014")).toBeInTheDocument();
    expect(screen.getByTestId("ruleset-btn-2024")).toBeInTheDocument();
  });

  it("marks the active version as pressed", () => {
    render(<RulesetSelector value="2024" onChange={jest.fn()} />);
    expect(screen.getByTestId("ruleset-btn-2024")).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("ruleset-btn-2014")).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("calls onChange with the clicked version", async () => {
    const onChange = jest.fn();
    render(<RulesetSelector value="2014" onChange={onChange} />);
    await userEvent.click(screen.getByTestId("ruleset-btn-2024"));
    expect(onChange).toHaveBeenCalledWith("2024");
  });

  it("calls onChange even when clicking already-active version", async () => {
    const onChange = jest.fn();
    render(<RulesetSelector value="2014" onChange={onChange} />);
    await userEvent.click(screen.getByTestId("ruleset-btn-2014"));
    expect(onChange).toHaveBeenCalledWith("2014");
  });

  it("renders a custom label", () => {
    render(
      <RulesetSelector value="2014" onChange={jest.fn()} label="Version:" />
    );
    expect(screen.getByText("Version:")).toBeInTheDocument();
  });

  it("disables both buttons when disabled prop is true", () => {
    render(<RulesetSelector value="2014" onChange={jest.fn()} disabled />);
    expect(screen.getByTestId("ruleset-btn-2014")).toBeDisabled();
    expect(screen.getByTestId("ruleset-btn-2024")).toBeDisabled();
  });
});

describe("VersionBadge", () => {
  it("renders the version text", () => {
    render(<VersionBadge version="2014" />);
    expect(screen.getByText("2014")).toBeInTheDocument();
  });

  it("has an accessible label", () => {
    render(<VersionBadge version="2024" />);
    expect(screen.getByLabelText("Ruleset 2024")).toBeInTheDocument();
  });
});
